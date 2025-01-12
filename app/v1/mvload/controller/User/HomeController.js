const {
    success,
    failed,
    serverError,
    validateFail,
    response
} = require("../../../../helper/response");

const {
    USER_CONSTANTS,
    EMAIL_CONSTANTS,
    AUTH_CONSTANTS,
    SYSTEM_FAILURE,
    PINCODE_CONSTANTS,
    SERVICE_CONSTANTS,
    ORDER_CONSTANTS
} = require('../../../../helper/message');
const db = require("../../../../../models");
const _ = require("lodash");
const {
    aws
} = require('../../../../helper/aws');
const Service = db.mvService;
const User = db.mvUser;
const Pincode = db.mvPincode
const ZonePinMap = db.mvZonePinMap
const ZoneServiceMap = db.mvZoneServiceMap
// const VendorRate = db.mvVendorRates
const VendorRate = db.mvRates
const OdaTat = db.mvOdaTat
const CargoRate = db.mvCargoRates
const VendorSetting = db.mvVendorSetting;
const {
    Validator
} = require("node-input-validator");
const {
    fn,
    col,
    Op,
    where,
    literal
} = require("sequelize");
const moment = require("moment/moment");
const CalculativeHelper = require('../../../../helper/calculativeFixedCalculation');
const RatePerKgPerBoxServiceList = require("../../../../helper/ratePerKgPerBoxServiceList");

module.exports = {
    getServices: async (req, res) => {
        try {
            let request = req.body;
            // Validate the request
            const validate = new Validator(request, {
                sourcePincode: "required|integer|minLength:6|maxLength:6",
                destinationPincode: "required|integer|minLength:6|maxLength:6",
                shipmentWeight: "required"
            });

            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            let markup = 35;
            request.items = []
            let getServiceList = await Service.findAll({
                where: {
                    isActive: true
                },
                include: [{
                    model: User,
                    as: "Vendor"
                }]
            })


            //get source pincode id
            let getSourcePincodeId = await Pincode.findOne({
                where: {
                    pincode: request.sourcePincode
                }
            })
            if (!getSourcePincodeId)
                return success(res, ORDER_CONSTANTS.VENDORS, [])
            //get destination pincode id
            let getDestinationPincodeId = await Pincode.findOne({
                where: {
                    pincode: request.destinationPincode
                }
            })
            if (!getDestinationPincodeId)
                return success(res, ORDER_CONSTANTS.VENDORS, [])

            let finalServiceList = []
            if (!getServiceList.length)
                return success(res, ORDER_CONSTANTS.VENDORS, [])
            for (let i = 0; i < getServiceList.length; i++) {
                if (!getServiceList[i].Vendor?.isDummy) {
                    let checkSourcePincodeMapWithZone = await ZonePinMap.findOne({
                        where: {
                            pincodeId: getSourcePincodeId.id,
                            vendorId: getServiceList[i].userId,
                            isActive: true

                        }
                    })
                    let checkDestinationPincodeMapWithZone = await ZonePinMap.findOne({
                        where: {
                            pincodeId: getDestinationPincodeId.id,
                            vendorId: getServiceList[i].userId,
                            isActive: true

                        }
                    })
                    if (checkSourcePincodeMapWithZone && checkDestinationPincodeMapWithZone) {
                        let getSourceService = await ZoneServiceMap.findOne({
                            where: {
                                zoneId: checkSourcePincodeMapWithZone.zoneId,
                                zonePinId: checkSourcePincodeMapWithZone.pincodeId,
                                vendorId: checkSourcePincodeMapWithZone.vendorId,
                                serviceId: getServiceList[i].id,
                                isActive: true,
                                isODA: {
                                    [Op.in]: ['serviceable', 'ODA1', 'ODA2', 'ODA3']
                                }
                            },
                        })
                        let getDestinationService = await ZoneServiceMap.findOne({
                            where: {
                                zoneId: checkDestinationPincodeMapWithZone.zoneId,
                                zonePinId: checkDestinationPincodeMapWithZone.pincodeId,
                                vendorId: checkDestinationPincodeMapWithZone.vendorId,
                                serviceId: getServiceList[i].id,
                                isActive: true,
                                isODA: {
                                    [Op.in]: ['serviceable', 'ODA1', 'ODA2', 'ODA3']
                                }
                            }
                        })
                        if (getSourceService && getDestinationService) {
                            let zoneInODA = false
                            let odaType = ['ODA1', 'ODA2', 'ODA3']
                            let ODA1 = false
                            let ODA2 = false
                            let ODA3 = false
                            let ODA11 = false
                            let ODA22 = false
                            let ODA33 = false
                            if (odaType.includes(getSourceService.isODA) || odaType.includes(getDestinationService.isODA))
                                zoneInODA = true
                            if (getSourceService.isODA == "ODA1")
                                ODA1 = true
                            if (getSourceService.isODA == "ODA2")
                                ODA2 = true
                            if (getSourceService.isODA == "ODA3")
                                ODA3 = true
                            if (getDestinationService.isODA == "ODA1")
                                ODA11 = true
                            if (getDestinationService.isODA == "ODA2")
                                ODA22 = true
                            if (getDestinationService.isODA == "ODA3")
                                ODA33 = true
                            let tatParams = {
                                zoneIdFrom: checkSourcePincodeMapWithZone.zoneId,
                                zoneIdTo: checkDestinationPincodeMapWithZone.zoneId,
                                vendorId: getServiceList[i].userId,
                                serviceId: getServiceList[i].id
                            }
                            if (zoneInODA) {
                                tatParams = Object.assign(tatParams, {
                                    ODATAT: {
                                        [Op.ne]: null
                                    }
                                })
                            } else {
                                tatParams = Object.assign(tatParams, {
                                    STDTAT: {
                                        [Op.ne]: null
                                    }
                                })
                            }
                            // console.log(tatParams);
                            let tat = await OdaTat.findOne({
                                where: tatParams
                            })
                            if (tat) {
                                let TAT = zoneInODA && tat.ODATAT ? parseInt(tat.ODATAT) : parseInt(tat.STDTAT)
                                let cargoRate = await CargoRate.findOne({
                                    where: {
                                        serviceId: getServiceList[i].id,
                                        vendorId: getServiceList[i].userId
                                    }
                                })
                                if (cargoRate) {
                                    if (await CalculativeHelper.checkCargoRateDateValidation(cargoRate.dateFrom, cargoRate.dateTo)) {
                                        let vendorRate = await VendorRate.findOne({
                                            where: {
                                                cargoId: cargoRate.id,
                                                zoneIdFrom: checkSourcePincodeMapWithZone.zoneId,
                                                zoneIdTo: checkSourcePincodeMapWithZone.zoneId

                                            }
                                        })
                                        if (vendorRate) {
                                            if (cargoRate.rateType == 1) { //rate type per kg
                                                let vservice = await RatePerKgPerBoxServiceList.getRatePerKgServiceList(vendorRate, cargoRate, request.items, request.shipmentWeight, ODA1, ODA2, ODA3, ODA11, ODA22, ODA33, request.shipmentAmount, getServiceList[i], null, markup, getSourcePincodeId, getDestinationPincodeId, TAT)
                                                if (vservice)
                                                    finalServiceList.push(vservice)
                                            } else {
                                                console.log("rate per box");

                                                //rate type per box
                                                let vservice = await RatePerKgPerBoxServiceList.getRatePerboxServiceList(vendorRate, cargoRate, request.items, request.shipmentWeight, ODA1, ODA2, ODA3, ODA11, ODA22, ODA33, request.shipmentAmount, getServiceList[i], null, markup, getSourcePincodeId, getDestinationPincodeId, TAT)
                                                if (vservice)
                                                    finalServiceList.push(vservice)
                                            }
                                        }
                                    }
                                }
                            }
                        }


                    }
                }
            }
            return success(res, ORDER_CONSTANTS.VENDORS, finalServiceList)

        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    }
}
