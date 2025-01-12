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
const jwt = require("jsonwebtoken");
const Service = db.mvService;
const User = db.mvUser;
const UserAccountDetails = db.mvAccountDetails;
const VendorSetting = db.mvVendorSetting;
const Pincode = db.mvPincode
const ZonePinMap = db.mvZonePinMap
const ZoneServiceMap = db.mvZoneServiceMap
// const VendorRate = db.mvVendorRates
const VendorRate = db.mvRates
const Order = db.mvorder
const OrderItemDimension = db.mvOrderDimension
const OrderItem = db.mvOrderItem
const OrderedItemsStatus = db.mvOrderedItemStatus
const OrderStatusType = db.mvOrderStatusType
const AssociateVendors = db.mvAssociateVendors
const Zone = db.mvZone
const OdaTat = db.mvOdaTat
const CargoRate = db.mvCargoRates
const PaymentService = require('../../Service/PaymentService')
const OrderReview = db.mvorderReview
const OrderReviewType = db.mvreviewType
const Payment = db.mvpayment
const Address = db.mvAddress
const OrderItemStatusRemark = db.mvOrderStatusRemark
const OrderWeightReconcilation = db.mvOrderWeightReconcilation
const crypto = require('crypto')
const numberToword = require('../../../../helper/numberToWord')
const CalculativeHelper = require('../../../../helper/calculativeFixedCalculation')
const RatePerKgPerBoxServiceList = require('../../../../helper/ratePerKgPerBoxServiceList')
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
const moment = require("moment");
const XLSXDownloader = require('../../Service/XLSXDownloader')
const fs = require("fs");
const pdf = require("html-pdf-node");
const ejs = require("ejs");
const { uploadPdfToS3, generateQr } = require("../../../../helper/aws");
const ExcelJS = require('exceljs');
const NotificationHelper = require('../../../../helper/notification')
module.exports = {
    getRateReconcilation: async (req, res) => {
        try {
            // Validate the request
            const requests = req.body
            const validate = new Validator(requests, {
                orderId: "required",
                rateType: "required|in:1,2",
                chargeableWeight: "required",
                totalAmount: "required",
                additionalWeight: "requiredIf:rateType,1",
                serviceId: "requiredIf:rateType,2",
                unit: "requiredIf:rateType,1|in:kg,gm"
            });
            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            let order = await Order.findOne({ where: { id: requests.orderId } })
            let orderDimension = await OrderItemDimension.findAll({
                where: {
                    Orderid: order.Order_id
                }
            })
            let items = orderDimension.map(item => ({
                L: item.Length,
                B: item.Breadth,
                H: item.Height,
                boxes: item.boxes,
                unit: item.Unit,
                boxWeight: item.Actual_Weight
            }))
            let amount = 0
            let data = {}
            if (requests.rateType == 1) {
                amount = await calculateFinalPriceForRatePerKg(order, items, requests)
                if (!amount)
                    return response(res, 422, 'Vendor not accept shipment weight')
                data = {
                    amount: parseFloat(amount).toFixed(2)
                }
            } else {
                data = await calculateFinalPriceForRatePerBox(order, items, requests)
                if (data.status == 1) {
                    amount = parseFloat(data.amount) || 0;
                    data = {
                        amount: amount
                    }
                } else if (data.status == 2) {
                    return response(res, 422, 'Pincode not found')
                } else if (data.status == 3) {
                    return response(res, 422, 'Vendor service not found')
                } else if (data.status == 4) {
                    return response(res, 422, 'Pincode not mapped with vendor service')
                } else if (data.status == 5) {
                    return response(res, 422, 'Vendor service not found')
                } else if (data.status == 6) {
                    return response(res, 422, 'Vendor service not found')
                }
                else if (data.status == 7) {
                    return response(res, 422, 'Vendor not accept shipment weight')
                }
                else if (data.status == 8) {
                    return response(res, 422, 'Vendor service not found')
                }
                else if (data.status == 9) {
                    return response(res, 422, 'Vendor service not found')
                }
                else if (data.status == 10) {
                    return response(res, 422, 'Vendor service not found')
                }
                else if (data.status == 11) {
                    return response(res, 422, 'Pincode not mapped with zone')
                }
                else if (data.status == 12) {
                    return response(res, 422, 'Selected vendor is dummy')
                }
                else {
                    return response(res, 422, 'wrong data')

                }
            }
            return success(res, 'get  rate reconcilation amount', data)
        } catch (error) {
            console.log("error---------------", error)
            // req.logger.error(error)
            return failed(res, SYSTEM_FAILURE);
        }
    },
    createRateReconcilation: async (req, res) => {
        try {
            // Validate the request
            const requests = req.body
            const validate = new Validator(requests, {
                orderId: "required",
                rateType: "required|in:1,2",
                chargeableWeight: "required",
                totalAmount: "required",
                additionalWeight: "requiredIf:rateType,1",
                serviceId: "requiredIf:rateType,2",
                unit: "requiredIf:rateType,1|in:kg,gm"
            });
            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            let order = await Order.findOne({ where: { id: requests.orderId } })
            let orderDimension = await OrderItemDimension.findAll({
                where: {
                    Orderid: order.Order_id
                }
            })
            let items = orderDimension.map(item => ({
                L: item.Length,
                B: item.Breadth,
                H: item.Height,
                boxes: item.boxes,
                unit: item.Unit,
                boxWeight: item.Actual_Weight
            }))
            let amount = 0
            if (requests.rateType == 1) {
                amount = await calculateFinalPriceForRatePerKg(order, items, requests)
                if (!amount)
                    return response(res, 422, 'Vendor not accept shipment weight')
                await calculateFinalPriceForRatePerKgAndCreate(order, items, requests, req.decodedData.id)
            } else {
                data = await calculateFinalPriceForRatePerBox(order, items, requests)
                if (data.status == 1) {
                    await calculateFinalPriceForRatePerBoxAndCreate(order, items, requests, req.decodedData.id)
                } else if (data.status == 2) {
                    return response(res, 422, 'Pincode not found')
                } else if (data.status == 3) {
                    return response(res, 422, 'Vendor service not found')
                } else if (data.status == 4) {
                    return response(res, 422, 'Pincode not mapped with vendor service')
                } else if (data.status == 5) {
                    return response(res, 422, 'Vendor service not found')
                } else if (data.status == 6) {
                    return response(res, 422, 'Vendor service not found')
                }
                else if (data.status == 7) {
                    return response(res, 422, 'Vendor not accept shipment weight')
                }
                else if (data.status == 8) {
                    return response(res, 422, 'Vendor service not found')
                }
                else if (data.status == 9) {
                    return response(res, 422, 'Vendor service not found')
                }
                else if (data.status == 10) {
                    return response(res, 422, 'Vendor service not found')
                }
                else if (data.status == 11) {
                    return response(res, 422, 'Pincode not mapped with zone')
                }
                else if (data.status == 12) {
                    return response(res, 422, 'Selected vendor is dummy')
                }
                else {
                    return response(res, 422, 'wrong data')

                }
            }
            return success(res, 'Charge created')
        } catch (error) {
            console.log("error---------------", error)
            // req.logger.error(error)
            return failed(res, SYSTEM_FAILURE);
        }
    },
    getRateReconcilationList: async (req, res) => {
        try {
            let {
                search,
                status,
                page = 1,
                limit = 10,
                fromDate = null,
                toDate = null,
                column = 'Order_id',
                operator = 'equals',
                value,
                sortBy = 'DESC',
                sortByColumn = 'createdAt',
                days = null
            } = req.query;
            page = parseInt(page);
            limit = parseInt(limit);
            const offset = (page - 1) * limit;
            let params = {
                vendorId: req.decodedData.id
            }
            if (days) {
                const date = new Date();
                date.setDate(date.getDate() - parseInt(days));
                params = Object.assign(params, {
                    createdAt: { [Op.gte]: date }
                })
            }
            if (fromDate && fromDate != 'null' && toDate == 'null') {
                params = Object.assign(params, {
                    createdAt: {
                        [Op.gte]: fromDate + ' 00:00:00'
                    }
                })
            }
            if (toDate && toDate != 'null' && fromDate == 'null') {
                params = Object.assign(params, {
                    createdAt: {
                        [Op.lte]: toDate + ' 00:00:00'
                    }
                })
            }
            if ((fromDate && fromDate != 'null') && (toDate && toDate != 'null')) {
                params = Object.assign(params, {
                    [Op.and]: [{
                        createdAt: {
                            [Op.gte]: fromDate + ' 00:00:00'
                        }
                    },
                    {
                        createdAt: {
                            [Op.lte]: toDate + ' 23:59:00'
                        }
                    }
                    ]
                })
            }
            if (value) {
                switch (operator) {
                    case 'contains':
                        params[column] = { [Op.like]: `%${value}%` };
                        break;
                    case 'equals':
                        params[column] = { [Op.eq]: value };
                        break;
                    case 'starts with':
                        params[column] = { [Op.like]: `${value}%` };
                        break;
                    case 'ends with':
                        params[column] = { [Op.like]: `%${value}` };
                        break;
                    case 'is empty':
                        params[column] = { [Op.eq]: null };
                        break;
                    case 'is not empty':
                        params[column] = { [Op.ne]: null };
                        break;
                    case 'is any of':
                        params[column] = { [Op.in]: value.split(',') };
                        break;
                    default:
                        params[column] = { [Op.eq]: value };
                }
            }
            if (search) {
                // Use Op.or to search in multiple fields
                params[Op.or] = [
                    {
                        Order_id: { [Op.like]: `%${search}%` }
                    }


                ];
            }
            let orders = await OrderWeightReconcilation.findAll({
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'mobile']
                }, {
                    model: User,
                    as: 'vendor',
                    attributes: ['id', 'name', 'email', 'mobile']
                },
                {
                    model: Service,
                    as: 'serviceNew',
                    attributes: ['id', 'name', 'serviceType']
                },
                {
                    model: Service,
                    as: 'service',
                    attributes: ['id', 'name', 'serviceType']
                },
                {
                    model: Order,
                    as: 'order',
                    attributes: ['id', 'MvikasDocketNo', 'Itemname']
                }
                ]
                ,
                where: params,
                limit,
                offset,
                order: [
                    [sortByColumn, sortBy]
                ]
            });
            let count = await OrderWeightReconcilation.count({
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'mobile']
                }, {
                    model: User,
                    as: 'vendor',
                    attributes: ['id', 'name', 'email', 'mobile']
                },
                {
                    model: Service,
                    as: 'serviceNew',
                    attributes: ['id', 'name', 'serviceType']
                },
                {
                    model: Service,
                    as: 'service',
                    attributes: ['id', 'name', 'serviceType']
                },
                {
                    model: Order,
                    as: 'order',
                    attributes: ['id', 'MvikasDocketNo', 'Itemname']
                }
                ],
                where: params
            })
            for (let order of orders) {
                order.dataValues.articles = await OrderItem.count({ where: { Orderid: order.Order_id } })
            }
            let data = {
                list: orders,
                count: count,
                limit: limit
            }
            return success(res, "Purchase report", data)
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    getRateReconcilationDashboard: async (req, res) => {
        try {
            let results = await OrderWeightReconcilation.findAll({
                where: {
                    vendorId: req.decodedData.id
                }
            });
            let data = {
                totalDescrepancy: 0,
                totalDescrepancyAccespet: 0,
                totalClosedDescrepancy: 0,
                totalNewDescrepancy: 0,
                totalDisputeRejected: 0,
                totalDisputePending: 0,
            };

            results.forEach(result => {
                let { status, count } = result.dataValues;
                if (status == 4 || status == 5) data.totalDescrepancyAccespet += 1;
                if (status == 4 || status == 5 || status == 2 || status == 3) data.totalClosedDescrepancy += 1;
                if (status == 1) data.totalNewDescrepancy += 1;
                if (status == 2 || status == 3) data.totalDisputeRejected += 1;
                if (status == 1) data.totalDisputePending += 1;

            });
            data.totalDescrepancy = results.length
            return success(res, "Weight reconcilation", data)
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    }

}
async function calculateFinalPriceForRatePerKg(order, items, requestData) {
    let newFinalAmount = 0
    let additionalAddedCharge = requestData.unit == 'gm' ? requestData.additionalWeight / 1000 : requestData.additionalWeight
    let data = order
    data.items = items
    data.shipmentAmount = order.Shipment_value
    data.shipmentWeight = parseFloat(order.Shipment_weight) + parseFloat(additionalAddedCharge)
    data.boxes = items.reduce((sum, item) => sum + item.boxes, 0)
    let user = await User.findOne({
        where: {
            id: order.userId
        },
        include: [{
            model: UserAccountDetails,
            as: "account"
        }]
    })

    let markup = 0;
    let getServiceList = await Service.findAll({
        where: {
            id: data.Serviceid,
            // userId: {
            //     [Op.in]: assignedVendors.map(vendor => vendor.vendorId)
            // },
            isActive: true
        },
        include: [{
            model: User,
            where: {
                isDummy: false
            },
            as: "Vendor"
        }]
    })
    //get source pincode id
    let getSourcePincodeId = await Pincode.findOne({
        where: {
            pincode: data.Frompincode
        }
    })


    //get destination pincode id
    let getDestinationPincodeId = await Pincode.findOne({
        where: {
            pincode: data.Topincode
        }
    })


    for (let i = 0; i < getServiceList.length; i++) {
        if (user.account && user.account.markup) {
            markup = parseFloat(user.account.markup)
        } else {
            let vendorAccount = await UserAccountDetails.findOne({
                where: {
                    userId: getServiceList[i].userId
                }
            })
            markup = vendorAccount && vendorAccount.markup ? parseFloat(vendorAccount.markup) : 0
        }
        if (!markup) {
            markup = 35
        }
        if (getServiceList[i].Vendor?.isDummy) {
            markup = 0
        }
        if (!getServiceList[i].Vendor?.isDummy) {
            markup = 0
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
                            let vendorRate = await VendorRate.findOne({
                                where: {
                                    cargoId: cargoRate.id,
                                    zoneIdFrom: checkSourcePincodeMapWithZone.zoneId,
                                    zoneIdTo: checkDestinationPincodeMapWithZone.zoneId

                                }
                            })
                            let volumatricShipingWeight = 0
                            let CFT = cargoRate.rateFormula
                            for (let itemIndex = 0; itemIndex < data.items.length; itemIndex++) {
                                let itemUnit = data.items[itemIndex].unit
                                if (itemUnit == 'FEET') {
                                    volumatricShipingWeight += (data.items[itemIndex].L * data.items[itemIndex].B * data.items[itemIndex].H * data.items[itemIndex].boxes * 30.40 * CFT) / cargoRate.dividend
                                } else if (itemUnit == 'INCH') {
                                    volumatricShipingWeight += (data.items[itemIndex].L * data.items[itemIndex].B * data.items[itemIndex].H * data.items[itemIndex].boxes * 2.54 * CFT) / cargoRate.dividend

                                } else {
                                    volumatricShipingWeight += (data.items[itemIndex].L * data.items[itemIndex].B * data.items[itemIndex].H * data.items[itemIndex].boxes * CFT) / cargoRate.dividend

                                }
                            }

                            let finalShipmentWeight = data.shipmentWeight > volumatricShipingWeight ? data.shipmentWeight : volumatricShipingWeight
                            console.log(finalShipmentWeight, "finalShipmentWeight");

                            if (parseFloat(finalShipmentWeight) <= parseFloat(cargoRate.cwMax)) {
                                //     console.log("Qweqwe");

                                finalShipmentWeight = parseFloat(cargoRate.cwMin) > parseFloat(finalShipmentWeight) ? parseFloat(cargoRate.cwMin) : parseFloat(finalShipmentWeight)
                                let rateWithMarkup = parseFloat(vendorRate.rates) + ((parseFloat(vendorRate.rates) * parseFloat(markup)) / 100)
                                let baseFreight = finalShipmentWeight * rateWithMarkup
                                baseFreight = parseFloat(cargoRate.minFreight) > finalShipmentWeight * rateWithMarkup ? parseFloat(cargoRate.minFreight) + parseFloat((parseFloat(cargoRate.minFreight) * markup) / 100) : finalShipmentWeight * rateWithMarkup

                                // let amountWithMarkup = baseFreight + ((baseFreight * markup) / 100)
                                let odaMin = 0
                                let odaperkg = 0
                                let odaAmount = 0
                                if (ODA1) {
                                    odaMin = cargoRate.ODA1MinRate ? parseFloat(cargoRate.ODA1MinRate) : 0
                                    odaperkg = cargoRate.ODA1PerKg ? parseFloat(cargoRate.ODA1PerKg) : 0
                                    odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
                                }
                                if (ODA2) {
                                    odaMin = cargoRate.ODA2MinRate ? parseFloat(cargoRate.ODA2MinRate) : 0
                                    odaperkg = cargoRate.ODA2PerKg ? parseFloat(cargoRate.ODA2PerKg) : 0
                                    odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
                                }
                                if (ODA3) {
                                    odaMin = cargoRate.ODA3MinRate ? parseFloat(cargoRate.ODA3MinRate) : 0
                                    odaperkg = cargoRate.ODA3PerKg ? parseFloat(cargoRate.ODA3PerKg) : 0
                                    odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
                                }
                                if (ODA11) {
                                    odaMin = cargoRate.ODA1MinRate ? parseFloat(cargoRate.ODA1MinRate) : 0
                                    odaperkg = cargoRate.ODA1PerKg ? parseFloat(cargoRate.ODA1PerKg) : 0
                                    odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
                                }
                                if (ODA22) {
                                    odaMin = cargoRate.ODA2MinRate ? parseFloat(cargoRate.ODA2MinRate) : 0
                                    odaperkg = cargoRate.ODA2PerKg ? parseFloat(cargoRate.ODA2PerKg) : 0
                                    odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
                                }
                                if (ODA33) {
                                    odaMin = cargoRate.ODA3MinRate ? parseFloat(cargoRate.ODA3MinRate) : 0
                                    odaperkg = cargoRate.ODA3PerKg ? parseFloat(cargoRate.ODA3PerKg) : 0
                                    odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
                                }
                                let additionalCharge = cargoRate.additionalCharge ? JSON.parse(cargoRate.additionalCharge) : []
                                additionalCharge.forEach(item => {
                                    // Check if the item has `amount` and `hasDependency`
                                    if (item.hasOwnProperty('amount') && item.hasOwnProperty('hasDependency')) {
                                        // If found, update matching blank amount in other objects that reference this id
                                        additionalCharge.forEach(parent => {
                                            // Check `hasDepedancyData` array in parent items
                                            if (parent.hasDepedancyData) {
                                                parent.hasDepedancyData.forEach(dep => {
                                                    // Match based on id and update amount if it is blank (null or undefined)
                                                    if (dep.hasAdditionalCharge1?.id === item.id && dep.hasAdditionalCharge1.amount == null) {
                                                        dep.hasAdditionalCharge1.amount = item.amount;
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                                // return success(res,"data",additionalCharge)
                                let calculatedadditionalCharge = {}
                                if (additionalCharge.length) {
                                    //chargeType 1-per-unit, 2-slabBased, 3-calculative	
                                    for (let j = 0; j < additionalCharge.length; j++) {
                                        if (additionalCharge[j] && additionalCharge[j].chargesType) {
                                            if (additionalCharge[j].chargesType == 1) {
                                                let unitBasedAmount = await CalculativeHelper.calulateUnitBased(additionalCharge[j], finalShipmentWeight, data.items)
                                                if (unitBasedAmount) {
                                                    calculatedadditionalCharge[additionalCharge[j].labelText] = unitBasedAmount ? unitBasedAmount : 0
                                                }
                                            }
                                            else if (additionalCharge[j].chargesType == 2) {
                                                let slabBasedAmount = await CalculativeHelper.calulateSlabBased(additionalCharge[j], finalShipmentWeight, data.items)


                                                if (slabBasedAmount) {
                                                    calculatedadditionalCharge[additionalCharge[j].labelText] = parseFloat(slabBasedAmount).toFixed(2)
                                                }


                                            } else if (additionalCharge[j].chargesType == 3 && !additionalCharge[j].minValue && !additionalCharge[j]?.hasDepedancyData?.length) {
                                                calculatedadditionalCharge[additionalCharge[j].labelText] = parseFloat(additionalCharge[j].amount ? additionalCharge[j].amount : 0).toFixed(2)
                                            }
                                            else {
                                                let calculativeCharges = additionalCharge[j]
                                                let amount = 0
                                                let additionalAmount = 0
                                                let endOperator = ""
                                                if (calculativeCharges.hasDepedancyData.length > 1) {
                                                } else {
                                                    amount = await CalculativeHelper.calculateCharge(calculativeCharges, finalShipmentWeight, odaAmount, baseFreight, data.shipmentWeight, data.shipmentAmount, data.items)
                                                }
                                                calculatedadditionalCharge[additionalCharge[j].labelText] = parseFloat(amount).toFixed(2)
                                            }
                                        }


                                    }

                                }
                                const baseValues = {
                                    'Base Freight': baseFreight,
                                    'Chargeable weight': finalShipmentWeight,
                                    'Shipment weight': data.shipmentWeight,
                                    'ODA': odaAmount,
                                    'Shipment Value': data.shipmentAmount
                                };
                                if (additionalCharge.length) {
                                    for (let j = 0; j < additionalCharge.length; j++) {
                                        if (additionalCharge[j] && additionalCharge[j].chargesType) {
                                            if (additionalCharge[j].chargesType == 3 && additionalCharge[j]?.hasDepedancyData?.length > 1) {
                                                let charge = additionalCharge[j]
                                                let finalString = charge.finalString
                                                // console.log(finalString);
                                                // Regular expression to match each key and operator
                                                const regex = /([A-Za-z0-9\s]+)|([\+\-%\!@#\$&\*\(\)_\-\+=\{\}\[\]\\|:;'"<>,.\/?^~`]+)/g;


                                                let finalFormula = ''
                                                let match;
                                                const result = [];

                                                while ((match = regex.exec(finalString)) !== null) {
                                                    if (match[1]) {
                                                        // If it matches the key
                                                        const key = match[1].trim();
                                                        // Filter out unwanted "null" or empty values
                                                        if (key && key !== null && key !== "null" && key !== "nullnull") {
                                                            result.push({ type: 'key', value: key.replace("nullnull" || "null", "") });
                                                        }
                                                    } else if (match[2]) {
                                                        // If it matches the operator
                                                        result.push({ type: 'operator', value: match[2] });
                                                    }
                                                }
                                                for (let i = 0; i < result.length; i++) {
                                                    if (result[i].type == 'key') {
                                                        let key = result[i].value
                                                        let value = ""
                                                        if (baseValues[key]) {
                                                            value = baseValues[key]
                                                        } else if (calculatedadditionalCharge[key]) {
                                                            value = calculatedadditionalCharge[key]

                                                        } else if ((Number(key))) {
                                                            value = Number(key)

                                                        } else {
                                                            value = 0
                                                        }
                                                        finalFormula += value
                                                    } else {
                                                        finalFormula += result[i].value

                                                    }
                                                }
                                                let amount = await CalculativeHelper.evaluateLeftToRight(finalFormula)
                                                amount = charge.minValue && Number(charge.minValue) > Number(amount) ? Number(charge.minValue) : Number(amount)
                                                if (calculatedadditionalCharge.hasOwnProperty(additionalCharge[j].labelText)) {
                                                    calculatedadditionalCharge[additionalCharge[j].labelText] = parseFloat(amount).toFixed(2);
                                                }



                                            }
                                        }
                                    }

                                }

                                let stateCharge = await CalculativeHelper.getStateWiseCharge(getServiceList[i].userId, getSourcePincodeId.state, getDestinationPincodeId.state)
                                if (stateCharge) {
                                    calculatedadditionalCharge = Object.assign(calculatedadditionalCharge, stateCharge)
                                }

                                // let totalAdditionalAmount = Object.values(calculatedadditionalCharge).reduce((sum, value) => sum + value, 0);
                                let totalAdditionalAmount = Object.values(calculatedadditionalCharge).reduce((sum, value) => {
                                    const numValue = parseFloat(value); // Parse the value as a float
                                    if (isNaN(numValue)) {
                                        console.error(`Invalid number encountered: ${value}`);
                                        return sum; // Skip invalid numbers
                                    }
                                    return sum + numValue; // Keep it as a number for addition
                                }, 0);
                                let totalTaxableAmount = baseFreight + totalAdditionalAmount + odaAmount
                                let gst = (totalTaxableAmount * cargoRate.GST) / 100
                                let finalAmount = totalTaxableAmount + gst
                                // console.log(finalAmount);

                                newFinalAmount = finalAmount
                                // let breakups = {
                                //     Rate: parseFloat(vendorRate.rates) + ((parseFloat(vendorRate.rates) * parseFloat(markup)) / 100),
                                //     ChargeableWeight: finalShipmentWeight.toFixed(2),
                                //     ODA: odaAmount,
                                //     BaseFreight: baseFreight.toFixed(2)
                                // }
                                // breakups = Object.assign(breakups, calculatedadditionalCharge)
                                // breakups = Object.assign(breakups, {
                                //     "TaxableAmount": parseFloat(totalTaxableAmount).toFixed(2),
                                //     "GSTAmount": parseFloat(gst).toFixed(2),
                                //     "TotalAmount": parseFloat(finalAmount).toFixed(2)
                                // })
                                // let deliverySlot = await VendorSetting.findAll({
                                //     where: {
                                //         userId: getServiceList[i].userId,
                                //         name: "deliverySlot",
                                //         isActive: true
                                //     },
                                //     attributes: ['id', 'value']
                                // })
                                // let pickupSlot = await VendorSetting.findAll({
                                //     where: {
                                //         userId: getServiceList[i].userId,
                                //         name: "picupSlot",
                                //         isActive: true
                                //     },
                                //     attributes: ['id', 'value']
                                // })
                                // let finaldata = {
                                //     "vendorName": getServiceList[i].Vendor?.name,
                                //     "serviceName": getServiceList[i].name,
                                //     "servicetype": getServiceList[i].serviceType,
                                //     "Serviceid": getServiceList[i].id,
                                //     "rate": parseFloat(vendorRate.rates) + ((parseFloat(vendorRate.rates) * parseFloat(markup)) / 100),//zone to zone rate(per kg)
                                //     "VRate": parseFloat(vendorRate.rates).toFixed(2),
                                //     "minWt": parseFloat(cargoRate.cwMin).toFixed(2), //cargo min weight
                                //     "minFreight": parseFloat(cargoRate.minFreight).toFixed(2),//min freight                                    
                                //     "minODA": parseFloat(odaMin).toFixed(2),
                                //     "odaPerKG": parseFloat(odaperkg).toFixed(2),
                                //     "oda_amount": parseFloat(odaAmount).toFixed(2),
                                //     "handlingCharge": 0,
                                //     "gst": parseFloat(cargoRate.GST).toFixed(2),
                                //     "gst_Amount": parseFloat(gst).toFixed(2),
                                //     "V_gst_Amount": parseFloat(gst).toFixed(2),
                                //     "totalAdditionalAmount": parseFloat(totalAdditionalAmount).toFixed(2),
                                //     "codAmount": 0,
                                //     "totalAmount": parseFloat(finalAmount).toFixed(2),
                                //     "V_totalAmount": parseFloat(finalAmount).toFixed(2),
                                //     "chargeableWt": parseFloat(finalShipmentWeight).toFixed(2),
                                //     "chargable_weight": parseFloat(finalShipmentWeight).toFixed(2),
                                //     "Shipment_weight": parseFloat(data.shipmentWeight).toFixed(2),
                                //     "baseAmount": parseFloat(baseFreight).toFixed(2),
                                //     "baseAmountV": parseFloat(baseFreight).toFixed(2),
                                //     "taxableAmount": parseFloat(totalTaxableAmount).toFixed(2),
                                //     "V_taxableAmount": parseFloat(totalTaxableAmount).toFixed(2),
                                //     "VMinChargableWeight": parseFloat(cargoRate.cwMin).toFixed(2),
                                //     "VMinFreight": parseFloat(cargoRate.minFreight).toFixed(2),
                                //     "VMinODA": parseFloat(odaMin).toFixed(2),
                                //     "VOdaPerKG": parseFloat(odaperkg).toFixed(2),
                                //     "VOdaAmount": parseFloat(odaAmount).toFixed(2),
                                //     "VGst": parseFloat(cargoRate.GST).toFixed(2),
                                //     "rateV": parseFloat(vendorRate.rates).toFixed(2),
                                //     "vendorId": getServiceList[i].Vendor?.id,
                                //     "Cft": parseFloat(CFT).toFixed(2),
                                //     "Shipment_value": parseFloat(data.shipmentAmount).toFixed(2),
                                //     "Divisor": parseFloat(cargoRate.dividend).toFixed(2),
                                //     "ExpectedDelivery": moment().add(TAT, 'days').format('ddd MMM DD, YYYY'),
                                //     "tat": TAT,
                                //     "avgRating": 0,
                                //     "totalReview": 0,
                                //     "rateRequestId": 21107,
                                //     "additionalCharges": calculatedadditionalCharge,
                                //     "breakups": breakups,
                                //     "base_Freight": parseFloat(baseFreight).toFixed(2),
                                //     deliverySlot: deliverySlot,
                                //     pickupSlot: pickupSlot,
                                //     orderId: order.id,
                                //     salesPrice: parseFloat(order.totalAmount).toFixed(2)
                                // }
                                // finalServiceList.push(finaldata)
                            }
                        }
                    }
                }
            }


        }
    }
    return newFinalAmount
}
async function calculateFinalPriceForRatePerBox(order, items, requestData) {
    let newFinalAmount = 0
    let data = order
    data.items = items
    data.shipmentAmount = order.Shipment_value
    data.shipmentWeight = parseFloat(order.Shipment_weight)
    data.boxes = items.reduce((sum, item) => sum + item.boxes, 0)
    let user = await User.findOne({
        where: {
            id: order.userId
        },
        include: [{
            model: UserAccountDetails,
            as: "account"
        }]
    })
    console.log(requestData.serviceId);

    let markup = 0;
    let getServiceList = await Service.findAll({
        where: {
            id: requestData.serviceId,
            // userId: {
            //     [Op.in]: assignedVendors.map(vendor => vendor.vendorId)
            // },
            isActive: true
        },
        include: [{
            model: User,
            where: {
                isDummy: false
            },
            as: "Vendor"
        }]
    })
    if (!getServiceList.length) {
        return { status: 3, amount: 0 }
    }
    //get source pincode id
    let getSourcePincodeId = await Pincode.findOne({
        where: {
            pincode: data.Frompincode
        }
    })
    if (!getSourcePincodeId)
        return { status: 2, amount: 0 }

    //get destination pincode id
    let getDestinationPincodeId = await Pincode.findOne({
        where: {
            pincode: data.Topincode
        }
    })
    if (!getDestinationPincodeId)
        return { status: 2, amount: 0 }

    for (let i = 0; i < getServiceList.length; i++) {
        if (user.account && user.account.markup) {
            markup = parseFloat(user.account.markup)
        } else {
            let vendorAccount = await UserAccountDetails.findOne({
                where: {
                    userId: getServiceList[i].userId
                }
            })
            markup = vendorAccount && vendorAccount.markup ? parseFloat(vendorAccount.markup) : 0
        }
        if (!markup) {
            markup = 35
        }
        if (getServiceList[i].Vendor?.isDummy) {
            markup = 0
        }
        if (!getServiceList[i].Vendor?.isDummy) {
            markup = 0
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
            if (!checkSourcePincodeMapWithZone && !checkDestinationPincodeMapWithZone)
                return { status: 4, amount: 0 }
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
                if (!getSourceService && !getDestinationService)
                    return { status: 5, amount: 0 }
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
                    if (!tat)
                        return { status: 6, amount: 0 }
                    if (tat) {
                        let TAT = zoneInODA && tat.ODATAT ? parseInt(tat.ODATAT) : parseInt(tat.STDTAT)
                        let cargoRate = await CargoRate.findOne({
                            where: {
                                serviceId: getServiceList[i].id,
                                vendorId: getServiceList[i].userId
                            }
                        })
                        if (!cargoRate)
                            return { status: 7, amount: 0 }
                        if (cargoRate) {
                            let vendorRate = await VendorRate.findOne({
                                where: {
                                    cargoId: cargoRate.id,
                                    zoneIdFrom: checkSourcePincodeMapWithZone.zoneId,
                                    zoneIdTo: checkDestinationPincodeMapWithZone.zoneId

                                }
                            })
                            let volumatricShipingWeight = 0
                            let CFT = cargoRate.rateFormula
                            for (let itemIndex = 0; itemIndex < data.items.length; itemIndex++) {
                                let itemUnit = data.items[itemIndex].unit
                                if (itemUnit == 'FEET') {
                                    volumatricShipingWeight += (data.items[itemIndex].L * data.items[itemIndex].B * data.items[itemIndex].H * data.items[itemIndex].boxes * 30.40 * CFT) / cargoRate.dividend
                                } else if (itemUnit == 'INCH') {
                                    volumatricShipingWeight += (data.items[itemIndex].L * data.items[itemIndex].B * data.items[itemIndex].H * data.items[itemIndex].boxes * 2.54 * CFT) / cargoRate.dividend

                                } else {
                                    volumatricShipingWeight += (data.items[itemIndex].L * data.items[itemIndex].B * data.items[itemIndex].H * data.items[itemIndex].boxes * CFT) / cargoRate.dividend

                                }
                            }

                            let finalShipmentWeight = data.shipmentWeight > volumatricShipingWeight ? data.shipmentWeight : volumatricShipingWeight

                            // if (parseFloat(finalShipmentWeight) <= parseFloat(cargoRate.cwMax)) {
                            //     console.log("Qweqwe");

                            finalShipmentWeight = parseFloat(cargoRate.cwMin) > parseFloat(finalShipmentWeight) ? parseFloat(cargoRate.cwMin) : parseFloat(finalShipmentWeight)
                            let rateWithMarkup = parseFloat(vendorRate.rates) + ((parseFloat(vendorRate.rates) * parseFloat(markup)) / 100)
                            let baseFreight = finalShipmentWeight * rateWithMarkup
                            baseFreight = parseFloat(cargoRate.minFreight) > finalShipmentWeight * rateWithMarkup ? parseFloat(cargoRate.minFreight) + parseFloat((parseFloat(cargoRate.minFreight) * markup) / 100) : finalShipmentWeight * rateWithMarkup

                            // let amountWithMarkup = baseFreight + ((baseFreight * markup) / 100)
                            let odaMin = 0
                            let odaperkg = 0
                            let odaAmount = 0
                            if (ODA1) {
                                odaMin = cargoRate.ODA1MinRate ? parseFloat(cargoRate.ODA1MinRate) : 0
                                odaperkg = cargoRate.ODA1PerKg ? parseFloat(cargoRate.ODA1PerKg) : 0
                                odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
                            }
                            if (ODA2) {
                                odaMin = cargoRate.ODA2MinRate ? parseFloat(cargoRate.ODA2MinRate) : 0
                                odaperkg = cargoRate.ODA2PerKg ? parseFloat(cargoRate.ODA2PerKg) : 0
                                odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
                            }
                            if (ODA3) {
                                odaMin = cargoRate.ODA3MinRate ? parseFloat(cargoRate.ODA3MinRate) : 0
                                odaperkg = cargoRate.ODA3PerKg ? parseFloat(cargoRate.ODA3PerKg) : 0
                                odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
                            }
                            if (ODA11) {
                                odaMin = cargoRate.ODA1MinRate ? parseFloat(cargoRate.ODA1MinRate) : 0
                                odaperkg = cargoRate.ODA1PerKg ? parseFloat(cargoRate.ODA1PerKg) : 0
                                odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
                            }
                            if (ODA22) {
                                odaMin = cargoRate.ODA2MinRate ? parseFloat(cargoRate.ODA2MinRate) : 0
                                odaperkg = cargoRate.ODA2PerKg ? parseFloat(cargoRate.ODA2PerKg) : 0
                                odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
                            }
                            if (ODA33) {
                                odaMin = cargoRate.ODA3MinRate ? parseFloat(cargoRate.ODA3MinRate) : 0
                                odaperkg = cargoRate.ODA3PerKg ? parseFloat(cargoRate.ODA3PerKg) : 0
                                odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
                            }
                            let additionalCharge = cargoRate.additionalCharge ? JSON.parse(cargoRate.additionalCharge) : []
                            additionalCharge.forEach(item => {
                                // Check if the item has `amount` and `hasDependency`
                                if (item.hasOwnProperty('amount') && item.hasOwnProperty('hasDependency')) {
                                    // If found, update matching blank amount in other objects that reference this id
                                    additionalCharge.forEach(parent => {
                                        // Check `hasDepedancyData` array in parent items
                                        if (parent.hasDepedancyData) {
                                            parent.hasDepedancyData.forEach(dep => {
                                                // Match based on id and update amount if it is blank (null or undefined)
                                                if (dep.hasAdditionalCharge1?.id === item.id && dep.hasAdditionalCharge1.amount == null) {
                                                    dep.hasAdditionalCharge1.amount = item.amount;
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                            // return success(res,"data",additionalCharge)
                            let calculatedadditionalCharge = {}
                            if (additionalCharge.length) {
                                //chargeType 1-per-unit, 2-slabBased, 3-calculative	
                                for (let j = 0; j < additionalCharge.length; j++) {
                                    if (additionalCharge[j] && additionalCharge[j].chargesType) {
                                        if (additionalCharge[j].chargesType == 1) {
                                            let unitBasedAmount = await CalculativeHelper.calulateUnitBased(additionalCharge[j], finalShipmentWeight, data.items)
                                            if (unitBasedAmount) {
                                                calculatedadditionalCharge[additionalCharge[j].labelText] = unitBasedAmount ? unitBasedAmount : 0
                                            }
                                        }
                                        else if (additionalCharge[j].chargesType == 2) {
                                            let slabBasedAmount = await CalculativeHelper.calulateSlabBased(additionalCharge[j], finalShipmentWeight, data.items)


                                            if (slabBasedAmount) {
                                                calculatedadditionalCharge[additionalCharge[j].labelText] = parseFloat(slabBasedAmount).toFixed(2)
                                            }


                                        } else if (additionalCharge[j].chargesType == 3 && !additionalCharge[j].minValue && !additionalCharge[j]?.hasDepedancyData?.length) {
                                            calculatedadditionalCharge[additionalCharge[j].labelText] = parseFloat(additionalCharge[j].amount ? additionalCharge[j].amount : 0).toFixed(2)
                                        }
                                        else {
                                            let calculativeCharges = additionalCharge[j]
                                            let amount = 0
                                            let additionalAmount = 0
                                            let endOperator = ""
                                            if (calculativeCharges.hasDepedancyData.length > 1) {
                                            } else {
                                                amount = await CalculativeHelper.calculateCharge(calculativeCharges, finalShipmentWeight, odaAmount, baseFreight, data.shipmentWeight, data.shipmentAmount, data.items)
                                            }
                                            calculatedadditionalCharge[additionalCharge[j].labelText] = parseFloat(amount).toFixed(2)
                                        }
                                    }


                                }

                            }
                            const baseValues = {
                                'Base Freight': baseFreight,
                                'Chargeable weight': finalShipmentWeight,
                                'Shipment weight': data.shipmentWeight,
                                'ODA': odaAmount,
                                'Shipment Value': data.shipmentAmount
                            };
                            if (additionalCharge.length) {
                                for (let j = 0; j < additionalCharge.length; j++) {
                                    if (additionalCharge[j] && additionalCharge[j].chargesType) {
                                        if (additionalCharge[j].chargesType == 3 && additionalCharge[j]?.hasDepedancyData?.length > 1) {
                                            let charge = additionalCharge[j]
                                            let finalString = charge.finalString
                                            // console.log(finalString);
                                            // Regular expression to match each key and operator
                                            const regex = /([A-Za-z0-9\s]+)|([\+\-%\!@#\$&\*\(\)_\-\+=\{\}\[\]\\|:;'"<>,.\/?^~`]+)/g;


                                            let finalFormula = ''
                                            let match;
                                            const result = [];

                                            while ((match = regex.exec(finalString)) !== null) {
                                                if (match[1]) {
                                                    // If it matches the key
                                                    const key = match[1].trim();
                                                    // Filter out unwanted "null" or empty values
                                                    if (key && key !== null && key !== "null" && key !== "nullnull") {
                                                        result.push({ type: 'key', value: key.replace("nullnull" || "null", "") });
                                                    }
                                                } else if (match[2]) {
                                                    // If it matches the operator
                                                    result.push({ type: 'operator', value: match[2] });
                                                }
                                            }
                                            for (let i = 0; i < result.length; i++) {
                                                if (result[i].type == 'key') {
                                                    let key = result[i].value
                                                    let value = ""
                                                    if (baseValues[key]) {
                                                        value = baseValues[key]
                                                    } else if (calculatedadditionalCharge[key]) {
                                                        value = calculatedadditionalCharge[key]

                                                    } else if ((Number(key))) {
                                                        value = Number(key)

                                                    } else {
                                                        value = 0
                                                    }
                                                    finalFormula += value
                                                } else {
                                                    finalFormula += result[i].value

                                                }
                                            }
                                            let amount = await CalculativeHelper.evaluateLeftToRight(finalFormula)
                                            amount = charge.minValue && Number(charge.minValue) > Number(amount) ? Number(charge.minValue) : Number(amount)
                                            if (calculatedadditionalCharge.hasOwnProperty(additionalCharge[j].labelText)) {
                                                calculatedadditionalCharge[additionalCharge[j].labelText] = parseFloat(amount).toFixed(2);
                                            }



                                        }
                                    }
                                }

                            }

                            let stateCharge = await CalculativeHelper.getStateWiseCharge(getServiceList[i].userId, getSourcePincodeId.state, getDestinationPincodeId.state)
                            if (stateCharge) {
                                calculatedadditionalCharge = Object.assign(calculatedadditionalCharge, stateCharge)
                            }

                            // let totalAdditionalAmount = Object.values(calculatedadditionalCharge).reduce((sum, value) => sum + value, 0);
                            let totalAdditionalAmount = Object.values(calculatedadditionalCharge).reduce((sum, value) => {
                                const numValue = parseFloat(value); // Parse the value as a float
                                if (isNaN(numValue)) {
                                    console.error(`Invalid number encountered: ${value}`);
                                    return sum; // Skip invalid numbers
                                }
                                return sum + numValue; // Keep it as a number for addition
                            }, 0);
                            let totalTaxableAmount = baseFreight + totalAdditionalAmount + odaAmount
                            let gst = (totalTaxableAmount * cargoRate.GST) / 100
                            let finalAmount = totalTaxableAmount + gst
                            // console.log(finalAmount);

                            return { status: 1, amount: parseFloat(finalAmount).toFixed(2) }
                            // let breakups = {
                            //     Rate: parseFloat(vendorRate.rates) + ((parseFloat(vendorRate.rates) * parseFloat(markup)) / 100),
                            //     ChargeableWeight: finalShipmentWeight.toFixed(2),
                            //     ODA: odaAmount,
                            //     BaseFreight: baseFreight.toFixed(2)
                            // }
                            // breakups = Object.assign(breakups, calculatedadditionalCharge)
                            // breakups = Object.assign(breakups, {
                            //     "TaxableAmount": parseFloat(totalTaxableAmount).toFixed(2),
                            //     "GSTAmount": parseFloat(gst).toFixed(2),
                            //     "TotalAmount": parseFloat(finalAmount).toFixed(2)
                            // })
                            // let deliverySlot = await VendorSetting.findAll({
                            //     where: {
                            //         userId: getServiceList[i].userId,
                            //         name: "deliverySlot",
                            //         isActive: true
                            //     },
                            //     attributes: ['id', 'value']
                            // })
                            // let pickupSlot = await VendorSetting.findAll({
                            //     where: {
                            //         userId: getServiceList[i].userId,
                            //         name: "picupSlot",
                            //         isActive: true
                            //     },
                            //     attributes: ['id', 'value']
                            // })
                            // let finaldata = {
                            //     "vendorName": getServiceList[i].Vendor?.name,
                            //     "serviceName": getServiceList[i].name,
                            //     "servicetype": getServiceList[i].serviceType,
                            //     "Serviceid": getServiceList[i].id,
                            //     "rate": parseFloat(vendorRate.rates) + ((parseFloat(vendorRate.rates) * parseFloat(markup)) / 100),//zone to zone rate(per kg)
                            //     "VRate": parseFloat(vendorRate.rates).toFixed(2),
                            //     "minWt": parseFloat(cargoRate.cwMin).toFixed(2), //cargo min weight
                            //     "minFreight": parseFloat(cargoRate.minFreight).toFixed(2),//min freight                                    
                            //     "minODA": parseFloat(odaMin).toFixed(2),
                            //     "odaPerKG": parseFloat(odaperkg).toFixed(2),
                            //     "oda_amount": parseFloat(odaAmount).toFixed(2),
                            //     "handlingCharge": 0,
                            //     "gst": parseFloat(cargoRate.GST).toFixed(2),
                            //     "gst_Amount": parseFloat(gst).toFixed(2),
                            //     "V_gst_Amount": parseFloat(gst).toFixed(2),
                            //     "totalAdditionalAmount": parseFloat(totalAdditionalAmount).toFixed(2),
                            //     "codAmount": 0,
                            //     "totalAmount": parseFloat(finalAmount).toFixed(2),
                            //     "V_totalAmount": parseFloat(finalAmount).toFixed(2),
                            //     "chargeableWt": parseFloat(finalShipmentWeight).toFixed(2),
                            //     "chargable_weight": parseFloat(finalShipmentWeight).toFixed(2),
                            //     "Shipment_weight": parseFloat(data.shipmentWeight).toFixed(2),
                            //     "baseAmount": parseFloat(baseFreight).toFixed(2),
                            //     "baseAmountV": parseFloat(baseFreight).toFixed(2),
                            //     "taxableAmount": parseFloat(totalTaxableAmount).toFixed(2),
                            //     "V_taxableAmount": parseFloat(totalTaxableAmount).toFixed(2),
                            //     "VMinChargableWeight": parseFloat(cargoRate.cwMin).toFixed(2),
                            //     "VMinFreight": parseFloat(cargoRate.minFreight).toFixed(2),
                            //     "VMinODA": parseFloat(odaMin).toFixed(2),
                            //     "VOdaPerKG": parseFloat(odaperkg).toFixed(2),
                            //     "VOdaAmount": parseFloat(odaAmount).toFixed(2),
                            //     "VGst": parseFloat(cargoRate.GST).toFixed(2),
                            //     "rateV": parseFloat(vendorRate.rates).toFixed(2),
                            //     "vendorId": getServiceList[i].Vendor?.id,
                            //     "Cft": parseFloat(CFT).toFixed(2),
                            //     "Shipment_value": parseFloat(data.shipmentAmount).toFixed(2),
                            //     "Divisor": parseFloat(cargoRate.dividend).toFixed(2),
                            //     "ExpectedDelivery": moment().add(TAT, 'days').format('ddd MMM DD, YYYY'),
                            //     "tat": TAT,
                            //     "avgRating": 0,
                            //     "totalReview": 0,
                            //     "rateRequestId": 21107,
                            //     "additionalCharges": calculatedadditionalCharge,
                            //     "breakups": breakups,
                            //     "base_Freight": parseFloat(baseFreight).toFixed(2),
                            //     deliverySlot: deliverySlot,
                            //     pickupSlot: pickupSlot,
                            //     orderId: order.id,
                            //     salesPrice: parseFloat(order.totalAmount).toFixed(2)
                            // }
                            // finalServiceList.push(finaldata)
                            // }
                        }
                        return { status: 7, amount: 0 }

                    }
                    return { status: 8, amount: 0 }
                }
                return { status: 9, amount: 0 }
            }
            return { status: 10, amount: 0 }


        }
        return { status: 11, amount: 0 }
    }

}
async function calculateFinalPriceForRatePerKgAndCreate(order, items, requestData, creatorId) {
    let newFinalAmount = 0
    let additionalAddedCharge = requestData.unit == 'gm' ? requestData.additionalWeight / 1000 : requestData.additionalWeight
    let data = order
    data.items = items
    data.shipmentAmount = order.Shipment_value
    data.shipmentWeight = parseFloat(order.Shipment_weight) + parseFloat(additionalAddedCharge)
    data.boxes = items.reduce((sum, item) => sum + item.boxes, 0)
    let user = await User.findOne({
        where: {
            id: order.userId
        },
        include: [{
            model: UserAccountDetails,
            as: "account"
        }]
    })

    let markup = 0;
    let getServiceList = await Service.findAll({
        where: {
            id: data.Serviceid,
            // userId: {
            //     [Op.in]: assignedVendors.map(vendor => vendor.vendorId)
            // },
            isActive: true
        },
        include: [{
            model: User,
            where: {
                isDummy: false
            },
            as: "Vendor"
        }]
    })
    //get source pincode id
    let getSourcePincodeId = await Pincode.findOne({
        where: {
            pincode: data.Frompincode
        }
    })


    //get destination pincode id
    let getDestinationPincodeId = await Pincode.findOne({
        where: {
            pincode: data.Topincode
        }
    })


    for (let i = 0; i < getServiceList.length; i++) {
        if (user.account && user.account.markup) {
            markup = parseFloat(user.account.markup)
        } else {
            let vendorAccount = await UserAccountDetails.findOne({
                where: {
                    userId: getServiceList[i].userId
                }
            })
            markup = vendorAccount && vendorAccount.markup ? parseFloat(vendorAccount.markup) : 0
        }
        if (!markup) {
            markup = 35
        }
        if (getServiceList[i].Vendor?.isDummy) {
            markup = 0
        }
        if (!getServiceList[i].Vendor?.isDummy) {
            markup = 0
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
                            let vendorRate = await VendorRate.findOne({
                                where: {
                                    cargoId: cargoRate.id,
                                    zoneIdFrom: checkSourcePincodeMapWithZone.zoneId,
                                    zoneIdTo: checkDestinationPincodeMapWithZone.zoneId

                                }
                            })
                            let volumatricShipingWeight = 0
                            let CFT = cargoRate.rateFormula
                            for (let itemIndex = 0; itemIndex < data.items.length; itemIndex++) {
                                let itemUnit = data.items[itemIndex].unit
                                if (itemUnit == 'FEET') {
                                    volumatricShipingWeight += (data.items[itemIndex].L * data.items[itemIndex].B * data.items[itemIndex].H * data.items[itemIndex].boxes * 30.40 * CFT) / cargoRate.dividend
                                } else if (itemUnit == 'INCH') {
                                    volumatricShipingWeight += (data.items[itemIndex].L * data.items[itemIndex].B * data.items[itemIndex].H * data.items[itemIndex].boxes * 2.54 * CFT) / cargoRate.dividend

                                } else {
                                    volumatricShipingWeight += (data.items[itemIndex].L * data.items[itemIndex].B * data.items[itemIndex].H * data.items[itemIndex].boxes * CFT) / cargoRate.dividend

                                }
                            }

                            let finalShipmentWeight = data.shipmentWeight > volumatricShipingWeight ? data.shipmentWeight : volumatricShipingWeight
                            console.log(finalShipmentWeight, "finalShipmentWeight");

                            if (parseFloat(finalShipmentWeight) <= parseFloat(cargoRate.cwMax)) {
                                //     console.log("Qweqwe");

                                finalShipmentWeight = parseFloat(cargoRate.cwMin) > parseFloat(finalShipmentWeight) ? parseFloat(cargoRate.cwMin) : parseFloat(finalShipmentWeight)
                                let rateWithMarkup = parseFloat(vendorRate.rates) + ((parseFloat(vendorRate.rates) * parseFloat(markup)) / 100)
                                let baseFreight = finalShipmentWeight * rateWithMarkup
                                baseFreight = parseFloat(cargoRate.minFreight) > finalShipmentWeight * rateWithMarkup ? parseFloat(cargoRate.minFreight) + parseFloat((parseFloat(cargoRate.minFreight) * markup) / 100) : finalShipmentWeight * rateWithMarkup

                                // let amountWithMarkup = baseFreight + ((baseFreight * markup) / 100)
                                let odaMin = 0
                                let odaperkg = 0
                                let odaAmount = 0
                                if (ODA1) {
                                    odaMin = cargoRate.ODA1MinRate ? parseFloat(cargoRate.ODA1MinRate) : 0
                                    odaperkg = cargoRate.ODA1PerKg ? parseFloat(cargoRate.ODA1PerKg) : 0
                                    odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
                                }
                                if (ODA2) {
                                    odaMin = cargoRate.ODA2MinRate ? parseFloat(cargoRate.ODA2MinRate) : 0
                                    odaperkg = cargoRate.ODA2PerKg ? parseFloat(cargoRate.ODA2PerKg) : 0
                                    odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
                                }
                                if (ODA3) {
                                    odaMin = cargoRate.ODA3MinRate ? parseFloat(cargoRate.ODA3MinRate) : 0
                                    odaperkg = cargoRate.ODA3PerKg ? parseFloat(cargoRate.ODA3PerKg) : 0
                                    odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
                                }
                                if (ODA11) {
                                    odaMin = cargoRate.ODA1MinRate ? parseFloat(cargoRate.ODA1MinRate) : 0
                                    odaperkg = cargoRate.ODA1PerKg ? parseFloat(cargoRate.ODA1PerKg) : 0
                                    odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
                                }
                                if (ODA22) {
                                    odaMin = cargoRate.ODA2MinRate ? parseFloat(cargoRate.ODA2MinRate) : 0
                                    odaperkg = cargoRate.ODA2PerKg ? parseFloat(cargoRate.ODA2PerKg) : 0
                                    odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
                                }
                                if (ODA33) {
                                    odaMin = cargoRate.ODA3MinRate ? parseFloat(cargoRate.ODA3MinRate) : 0
                                    odaperkg = cargoRate.ODA3PerKg ? parseFloat(cargoRate.ODA3PerKg) : 0
                                    odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
                                }
                                let additionalCharge = cargoRate.additionalCharge ? JSON.parse(cargoRate.additionalCharge) : []
                                additionalCharge.forEach(item => {
                                    // Check if the item has `amount` and `hasDependency`
                                    if (item.hasOwnProperty('amount') && item.hasOwnProperty('hasDependency')) {
                                        // If found, update matching blank amount in other objects that reference this id
                                        additionalCharge.forEach(parent => {
                                            // Check `hasDepedancyData` array in parent items
                                            if (parent.hasDepedancyData) {
                                                parent.hasDepedancyData.forEach(dep => {
                                                    // Match based on id and update amount if it is blank (null or undefined)
                                                    if (dep.hasAdditionalCharge1?.id === item.id && dep.hasAdditionalCharge1.amount == null) {
                                                        dep.hasAdditionalCharge1.amount = item.amount;
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                                // return success(res,"data",additionalCharge)
                                let calculatedadditionalCharge = {}
                                if (additionalCharge.length) {
                                    //chargeType 1-per-unit, 2-slabBased, 3-calculative	
                                    for (let j = 0; j < additionalCharge.length; j++) {
                                        if (additionalCharge[j] && additionalCharge[j].chargesType) {
                                            if (additionalCharge[j].chargesType == 1) {
                                                let unitBasedAmount = await CalculativeHelper.calulateUnitBased(additionalCharge[j], finalShipmentWeight, data.items)
                                                if (unitBasedAmount) {
                                                    calculatedadditionalCharge[additionalCharge[j].labelText] = unitBasedAmount ? unitBasedAmount : 0
                                                }
                                            }
                                            else if (additionalCharge[j].chargesType == 2) {
                                                let slabBasedAmount = await CalculativeHelper.calulateSlabBased(additionalCharge[j], finalShipmentWeight, data.items)


                                                if (slabBasedAmount) {
                                                    calculatedadditionalCharge[additionalCharge[j].labelText] = parseFloat(slabBasedAmount).toFixed(2)
                                                }


                                            } else if (additionalCharge[j].chargesType == 3 && !additionalCharge[j].minValue && !additionalCharge[j]?.hasDepedancyData?.length) {
                                                calculatedadditionalCharge[additionalCharge[j].labelText] = parseFloat(additionalCharge[j].amount ? additionalCharge[j].amount : 0).toFixed(2)
                                            }
                                            else {
                                                let calculativeCharges = additionalCharge[j]
                                                let amount = 0
                                                let additionalAmount = 0
                                                let endOperator = ""
                                                if (calculativeCharges.hasDepedancyData.length > 1) {
                                                } else {
                                                    amount = await CalculativeHelper.calculateCharge(calculativeCharges, finalShipmentWeight, odaAmount, baseFreight, data.shipmentWeight, data.shipmentAmount, data.items)
                                                }
                                                calculatedadditionalCharge[additionalCharge[j].labelText] = parseFloat(amount).toFixed(2)
                                            }
                                        }


                                    }

                                }
                                const baseValues = {
                                    'Base Freight': baseFreight,
                                    'Chargeable weight': finalShipmentWeight,
                                    'Shipment weight': data.shipmentWeight,
                                    'ODA': odaAmount,
                                    'Shipment Value': data.shipmentAmount
                                };
                                if (additionalCharge.length) {
                                    for (let j = 0; j < additionalCharge.length; j++) {
                                        if (additionalCharge[j] && additionalCharge[j].chargesType) {
                                            if (additionalCharge[j].chargesType == 3 && additionalCharge[j]?.hasDepedancyData?.length > 1) {
                                                let charge = additionalCharge[j]
                                                let finalString = charge.finalString
                                                // console.log(finalString);
                                                // Regular expression to match each key and operator
                                                const regex = /([A-Za-z0-9\s]+)|([\+\-%\!@#\$&\*\(\)_\-\+=\{\}\[\]\\|:;'"<>,.\/?^~`]+)/g;


                                                let finalFormula = ''
                                                let match;
                                                const result = [];

                                                while ((match = regex.exec(finalString)) !== null) {
                                                    if (match[1]) {
                                                        // If it matches the key
                                                        const key = match[1].trim();
                                                        // Filter out unwanted "null" or empty values
                                                        if (key && key !== null && key !== "null" && key !== "nullnull") {
                                                            result.push({ type: 'key', value: key.replace("nullnull" || "null", "") });
                                                        }
                                                    } else if (match[2]) {
                                                        // If it matches the operator
                                                        result.push({ type: 'operator', value: match[2] });
                                                    }
                                                }
                                                for (let i = 0; i < result.length; i++) {
                                                    if (result[i].type == 'key') {
                                                        let key = result[i].value
                                                        let value = ""
                                                        if (baseValues[key]) {
                                                            value = baseValues[key]
                                                        } else if (calculatedadditionalCharge[key]) {
                                                            value = calculatedadditionalCharge[key]

                                                        } else if ((Number(key))) {
                                                            value = Number(key)

                                                        } else {
                                                            value = 0
                                                        }
                                                        finalFormula += value
                                                    } else {
                                                        finalFormula += result[i].value

                                                    }
                                                }
                                                let amount = await CalculativeHelper.evaluateLeftToRight(finalFormula)
                                                amount = charge.minValue && Number(charge.minValue) > Number(amount) ? Number(charge.minValue) : Number(amount)
                                                if (calculatedadditionalCharge.hasOwnProperty(additionalCharge[j].labelText)) {
                                                    calculatedadditionalCharge[additionalCharge[j].labelText] = parseFloat(amount).toFixed(2);
                                                }



                                            }
                                        }
                                    }

                                }

                                let stateCharge = await CalculativeHelper.getStateWiseCharge(getServiceList[i].userId, getSourcePincodeId.state, getDestinationPincodeId.state)
                                if (stateCharge) {
                                    calculatedadditionalCharge = Object.assign(calculatedadditionalCharge, stateCharge)
                                }

                                // let totalAdditionalAmount = Object.values(calculatedadditionalCharge).reduce((sum, value) => sum + value, 0);
                                let totalAdditionalAmount = Object.values(calculatedadditionalCharge).reduce((sum, value) => {
                                    const numValue = parseFloat(value); // Parse the value as a float
                                    if (isNaN(numValue)) {
                                        console.error(`Invalid number encountered: ${value}`);
                                        return sum; // Skip invalid numbers
                                    }
                                    return sum + numValue; // Keep it as a number for addition
                                }, 0);
                                let totalTaxableAmount = baseFreight + totalAdditionalAmount + odaAmount
                                let gst = (totalTaxableAmount * cargoRate.GST) / 100
                                let finalAmount = totalTaxableAmount + gst
                                // console.log(finalAmount);
                                // newFinalAmount = finalAmount                                
                                let finaldata = {
                                    orderId: order.id,
                                    Order_id: order.Order_id,
                                    vendorId: order.vendorId,
                                    Serviceid: requestData.serviceId,
                                    serviceOldId: order.Serviceid,
                                    Shipment_weight: parseFloat(order.Shipment_weight),
                                    chargable_weight: finalShipmentWeight,
                                    Shipment_value: data.shipmentAmount,
                                    Cft: parseFloat(CFT).toFixed(2),
                                    Divisor: parseFloat(cargoRate.dividend).toFixed(2),
                                    rate: parseFloat(vendorRate.rates) + ((parseFloat(vendorRate.rates) * parseFloat(markup)) / 100),//zone to zone rate(per kg),
                                    totalAdditionalAmount: parseFloat(totalAdditionalAmount).toFixed(2),
                                    VtotalAdditionalAmount: parseFloat(totalAdditionalAmount).toFixed(2),
                                    additionalCharges: JSON.stringify(calculatedadditionalCharge),
                                    min_Chargable_weight: parseFloat(cargoRate.cwMin).toFixed(2),
                                    minFreight: parseFloat(cargoRate.minFreight).toFixed(2),//min freight ,
                                    minODA: parseFloat(odaMin).toFixed(2),
                                    odaPerKG: parseFloat(odaperkg).toFixed(2),
                                    oda_amount: parseFloat(odaAmount).toFixed(2),
                                    taxableAmount: parseFloat(totalTaxableAmount).toFixed(2),
                                    V_taxableAmount: parseFloat(totalTaxableAmount).toFixed(2),
                                    gst: parseFloat(cargoRate.GST).toFixed(2),
                                    gst_Amount: parseFloat(gst).toFixed(2),
                                    V_gst_Amount: parseFloat(gst).toFixed(2),
                                    totalAmount: parseFloat(order.totalAmount).toFixed(2),
                                    V_totalAmount: parseFloat(order.totalAmount).toFixed(2),
                                    userId: order.userId,
                                    servicetype: getServiceList[i].serviceType,
                                    ExpectedDelivery: moment().add(TAT, 'days').format('ddd MMM DD, YYYY'),
                                    VGst: parseFloat(cargoRate.GST).toFixed(2),
                                    VMinChargableWeight: parseFloat(cargoRate.cwMin).toFixed(2),
                                    VMinFreight: parseFloat(cargoRate.minFreight).toFixed(2),
                                    VMinODA: parseFloat(odaMin).toFixed(2),
                                    VOdaAmount: parseFloat(odaAmount).toFixed(2),
                                    VOdaPerKG: parseFloat(odaperkg).toFixed(2),
                                    VRate: parseFloat(vendorRate.rates).toFixed(2),
                                    VadditionalCharges: JSON.stringify(calculatedadditionalCharge),
                                    Vchargable_weight: finalShipmentWeight,
                                    specialCharge: 0,
                                    VspecialCharge: 0,
                                    excess_weight: parseFloat(additionalAddedCharge),
                                    new_weight: data.shipmentWeight,
                                    excess_amount: parseFloat(parseFloat(finalAmount).toFixed(2) - parseFloat(order.totalAmount).toFixed(2)).toFixed(2),
                                    new_amount: parseFloat(finalAmount).toFixed(2),
                                    rateType: 1,
                                    remark: requestData.remark ? JSON.stringify([{ userId: creatorId, userType: 'admin', remark: requestData.remark }]) : JSON.stringify([{ userId: creatorId, userType: 'admin', remark: "" }])
                                }

                                await OrderWeightReconcilation.create(finaldata)
                                // finalServiceList.push(finaldata)
                            }
                        }
                    }
                }
            }


        }
    }
    return true
}
async function calculateFinalPriceForRatePerBoxAndCreate(order, items, requestData, creatorId) {
    let newFinalAmount = 0
    let data = order
    data.items = items
    data.shipmentAmount = order.Shipment_value
    data.shipmentWeight = parseFloat(order.Shipment_weight)
    data.boxes = items.reduce((sum, item) => sum + item.boxes, 0)
    let user = await User.findOne({
        where: {
            id: order.userId
        },
        include: [{
            model: UserAccountDetails,
            as: "account"
        }]
    })
    let markup = 0;
    let getServiceList = await Service.findAll({
        where: {
            id: requestData.serviceId,
            // userId: {
            //     [Op.in]: assignedVendors.map(vendor => vendor.vendorId)
            // },
            isActive: true
        },
        include: [{
            model: User,
            where: {
                isDummy: false
            },
            as: "Vendor"
        }]
    })
    if (!getServiceList.length) {
        return { status: 3, amount: 0 }
    }
    //get source pincode id
    let getSourcePincodeId = await Pincode.findOne({
        where: {
            pincode: data.Frompincode
        }
    })
    if (!getSourcePincodeId)
        return { status: 2, amount: 0 }

    //get destination pincode id
    let getDestinationPincodeId = await Pincode.findOne({
        where: {
            pincode: data.Topincode
        }
    })
    if (!getDestinationPincodeId)
        return { status: 2, amount: 0 }

    for (let i = 0; i < getServiceList.length; i++) {
        if (user.account && user.account.markup) {
            markup = parseFloat(user.account.markup)
        } else {
            let vendorAccount = await UserAccountDetails.findOne({
                where: {
                    userId: getServiceList[i].userId
                }
            })
            markup = vendorAccount && vendorAccount.markup ? parseFloat(vendorAccount.markup) : 0
        }
        if (!markup) {
            markup = 35
        }
        if (getServiceList[i].Vendor?.isDummy) {
            markup = 0
        }
        if (!getServiceList[i].Vendor?.isDummy) {
            markup = 0
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
            if (!checkSourcePincodeMapWithZone && !checkDestinationPincodeMapWithZone)
                return { status: 4, amount: 0 }
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
                if (!getSourceService && !getDestinationService)
                    return { status: 5, amount: 0 }
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
                    if (!tat)
                        return { status: 6, amount: 0 }
                    if (tat) {
                        let TAT = zoneInODA && tat.ODATAT ? parseInt(tat.ODATAT) : parseInt(tat.STDTAT)
                        let cargoRate = await CargoRate.findOne({
                            where: {
                                serviceId: getServiceList[i].id,
                                vendorId: getServiceList[i].userId
                            }
                        })
                        if (!cargoRate)
                            return { status: 7, amount: 0 }
                        if (cargoRate) {
                            let vendorRate = await VendorRate.findOne({
                                where: {
                                    cargoId: cargoRate.id,
                                    zoneIdFrom: checkSourcePincodeMapWithZone.zoneId,
                                    zoneIdTo: checkDestinationPincodeMapWithZone.zoneId

                                }
                            })
                            let volumatricShipingWeight = 0
                            let CFT = cargoRate.rateFormula
                            for (let itemIndex = 0; itemIndex < data.items.length; itemIndex++) {
                                let itemUnit = data.items[itemIndex].unit
                                if (itemUnit == 'FEET') {
                                    volumatricShipingWeight += (data.items[itemIndex].L * data.items[itemIndex].B * data.items[itemIndex].H * data.items[itemIndex].boxes * 30.40 * CFT) / cargoRate.dividend
                                } else if (itemUnit == 'INCH') {
                                    volumatricShipingWeight += (data.items[itemIndex].L * data.items[itemIndex].B * data.items[itemIndex].H * data.items[itemIndex].boxes * 2.54 * CFT) / cargoRate.dividend

                                } else {
                                    volumatricShipingWeight += (data.items[itemIndex].L * data.items[itemIndex].B * data.items[itemIndex].H * data.items[itemIndex].boxes * CFT) / cargoRate.dividend

                                }
                            }

                            let finalShipmentWeight = data.shipmentWeight > volumatricShipingWeight ? data.shipmentWeight : volumatricShipingWeight

                            // if (parseFloat(finalShipmentWeight) <= parseFloat(cargoRate.cwMax)) {
                            //     console.log("Qweqwe");

                            finalShipmentWeight = parseFloat(cargoRate.cwMin) > parseFloat(finalShipmentWeight) ? parseFloat(cargoRate.cwMin) : parseFloat(finalShipmentWeight)
                            let rateWithMarkup = parseFloat(vendorRate.rates) + ((parseFloat(vendorRate.rates) * parseFloat(markup)) / 100)
                            let baseFreight = finalShipmentWeight * rateWithMarkup
                            baseFreight = parseFloat(cargoRate.minFreight) > finalShipmentWeight * rateWithMarkup ? parseFloat(cargoRate.minFreight) + parseFloat((parseFloat(cargoRate.minFreight) * markup) / 100) : finalShipmentWeight * rateWithMarkup

                            // let amountWithMarkup = baseFreight + ((baseFreight * markup) / 100)
                            let odaMin = 0
                            let odaperkg = 0
                            let odaAmount = 0
                            if (ODA1) {
                                odaMin = cargoRate.ODA1MinRate ? parseFloat(cargoRate.ODA1MinRate) : 0
                                odaperkg = cargoRate.ODA1PerKg ? parseFloat(cargoRate.ODA1PerKg) : 0
                                odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
                            }
                            if (ODA2) {
                                odaMin = cargoRate.ODA2MinRate ? parseFloat(cargoRate.ODA2MinRate) : 0
                                odaperkg = cargoRate.ODA2PerKg ? parseFloat(cargoRate.ODA2PerKg) : 0
                                odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
                            }
                            if (ODA3) {
                                odaMin = cargoRate.ODA3MinRate ? parseFloat(cargoRate.ODA3MinRate) : 0
                                odaperkg = cargoRate.ODA3PerKg ? parseFloat(cargoRate.ODA3PerKg) : 0
                                odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
                            }
                            if (ODA11) {
                                odaMin = cargoRate.ODA1MinRate ? parseFloat(cargoRate.ODA1MinRate) : 0
                                odaperkg = cargoRate.ODA1PerKg ? parseFloat(cargoRate.ODA1PerKg) : 0
                                odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
                            }
                            if (ODA22) {
                                odaMin = cargoRate.ODA2MinRate ? parseFloat(cargoRate.ODA2MinRate) : 0
                                odaperkg = cargoRate.ODA2PerKg ? parseFloat(cargoRate.ODA2PerKg) : 0
                                odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
                            }
                            if (ODA33) {
                                odaMin = cargoRate.ODA3MinRate ? parseFloat(cargoRate.ODA3MinRate) : 0
                                odaperkg = cargoRate.ODA3PerKg ? parseFloat(cargoRate.ODA3PerKg) : 0
                                odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
                            }
                            let additionalCharge = cargoRate.additionalCharge ? JSON.parse(cargoRate.additionalCharge) : []
                            additionalCharge.forEach(item => {
                                // Check if the item has `amount` and `hasDependency`
                                if (item.hasOwnProperty('amount') && item.hasOwnProperty('hasDependency')) {
                                    // If found, update matching blank amount in other objects that reference this id
                                    additionalCharge.forEach(parent => {
                                        // Check `hasDepedancyData` array in parent items
                                        if (parent.hasDepedancyData) {
                                            parent.hasDepedancyData.forEach(dep => {
                                                // Match based on id and update amount if it is blank (null or undefined)
                                                if (dep.hasAdditionalCharge1?.id === item.id && dep.hasAdditionalCharge1.amount == null) {
                                                    dep.hasAdditionalCharge1.amount = item.amount;
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                            // return success(res,"data",additionalCharge)
                            let calculatedadditionalCharge = {}
                            if (additionalCharge.length) {
                                //chargeType 1-per-unit, 2-slabBased, 3-calculative	
                                for (let j = 0; j < additionalCharge.length; j++) {
                                    if (additionalCharge[j] && additionalCharge[j].chargesType) {
                                        if (additionalCharge[j].chargesType == 1) {
                                            let unitBasedAmount = await CalculativeHelper.calulateUnitBased(additionalCharge[j], finalShipmentWeight, data.items)
                                            if (unitBasedAmount) {
                                                calculatedadditionalCharge[additionalCharge[j].labelText] = unitBasedAmount ? unitBasedAmount : 0
                                            }
                                        }
                                        else if (additionalCharge[j].chargesType == 2) {
                                            let slabBasedAmount = await CalculativeHelper.calulateSlabBased(additionalCharge[j], finalShipmentWeight, data.items)


                                            if (slabBasedAmount) {
                                                calculatedadditionalCharge[additionalCharge[j].labelText] = parseFloat(slabBasedAmount).toFixed(2)
                                            }


                                        } else if (additionalCharge[j].chargesType == 3 && !additionalCharge[j].minValue && !additionalCharge[j]?.hasDepedancyData?.length) {
                                            calculatedadditionalCharge[additionalCharge[j].labelText] = parseFloat(additionalCharge[j].amount ? additionalCharge[j].amount : 0).toFixed(2)
                                        }
                                        else {
                                            let calculativeCharges = additionalCharge[j]
                                            let amount = 0
                                            let additionalAmount = 0
                                            let endOperator = ""
                                            if (calculativeCharges.hasDepedancyData.length > 1) {
                                            } else {
                                                amount = await CalculativeHelper.calculateCharge(calculativeCharges, finalShipmentWeight, odaAmount, baseFreight, data.shipmentWeight, data.shipmentAmount, data.items)
                                            }
                                            calculatedadditionalCharge[additionalCharge[j].labelText] = parseFloat(amount).toFixed(2)
                                        }
                                    }


                                }

                            }
                            const baseValues = {
                                'Base Freight': baseFreight,
                                'Chargeable weight': finalShipmentWeight,
                                'Shipment weight': data.shipmentWeight,
                                'ODA': odaAmount,
                                'Shipment Value': data.shipmentAmount
                            };
                            if (additionalCharge.length) {
                                for (let j = 0; j < additionalCharge.length; j++) {
                                    if (additionalCharge[j] && additionalCharge[j].chargesType) {
                                        if (additionalCharge[j].chargesType == 3 && additionalCharge[j]?.hasDepedancyData?.length > 1) {
                                            let charge = additionalCharge[j]
                                            let finalString = charge.finalString
                                            // console.log(finalString);
                                            // Regular expression to match each key and operator
                                            const regex = /([A-Za-z0-9\s]+)|([\+\-%\!@#\$&\*\(\)_\-\+=\{\}\[\]\\|:;'"<>,.\/?^~`]+)/g;


                                            let finalFormula = ''
                                            let match;
                                            const result = [];

                                            while ((match = regex.exec(finalString)) !== null) {
                                                if (match[1]) {
                                                    // If it matches the key
                                                    const key = match[1].trim();
                                                    // Filter out unwanted "null" or empty values
                                                    if (key && key !== null && key !== "null" && key !== "nullnull") {
                                                        result.push({ type: 'key', value: key.replace("nullnull" || "null", "") });
                                                    }
                                                } else if (match[2]) {
                                                    // If it matches the operator
                                                    result.push({ type: 'operator', value: match[2] });
                                                }
                                            }
                                            for (let i = 0; i < result.length; i++) {
                                                if (result[i].type == 'key') {
                                                    let key = result[i].value
                                                    let value = ""
                                                    if (baseValues[key]) {
                                                        value = baseValues[key]
                                                    } else if (calculatedadditionalCharge[key]) {
                                                        value = calculatedadditionalCharge[key]

                                                    } else if ((Number(key))) {
                                                        value = Number(key)

                                                    } else {
                                                        value = 0
                                                    }
                                                    finalFormula += value
                                                } else {
                                                    finalFormula += result[i].value

                                                }
                                            }
                                            let amount = await CalculativeHelper.evaluateLeftToRight(finalFormula)
                                            amount = charge.minValue && Number(charge.minValue) > Number(amount) ? Number(charge.minValue) : Number(amount)
                                            if (calculatedadditionalCharge.hasOwnProperty(additionalCharge[j].labelText)) {
                                                calculatedadditionalCharge[additionalCharge[j].labelText] = parseFloat(amount).toFixed(2);
                                            }



                                        }
                                    }
                                }

                            }

                            let stateCharge = await CalculativeHelper.getStateWiseCharge(getServiceList[i].userId, getSourcePincodeId.state, getDestinationPincodeId.state)
                            if (stateCharge) {
                                calculatedadditionalCharge = Object.assign(calculatedadditionalCharge, stateCharge)
                            }

                            // let totalAdditionalAmount = Object.values(calculatedadditionalCharge).reduce((sum, value) => sum + value, 0);
                            let totalAdditionalAmount = Object.values(calculatedadditionalCharge).reduce((sum, value) => {
                                const numValue = parseFloat(value); // Parse the value as a float
                                if (isNaN(numValue)) {
                                    console.error(`Invalid number encountered: ${value}`);
                                    return sum; // Skip invalid numbers
                                }
                                return sum + numValue; // Keep it as a number for addition
                            }, 0);
                            let totalTaxableAmount = baseFreight + totalAdditionalAmount + odaAmount
                            let gst = (totalTaxableAmount * cargoRate.GST) / 100
                            let finalAmount = totalTaxableAmount + gst
                            // console.log(finalAmount);

                            let finaldata = {
                                orderId: order.id,
                                Order_id: order.Order_id,
                                vendorId: order.vendorId,
                                Serviceid: requestData.serviceId,
                                serviceOldId: order.Serviceid,
                                Shipment_weight: parseFloat(order.Shipment_weight),
                                chargable_weight: finalShipmentWeight,
                                Shipment_value: data.shipmentAmount,
                                Cft: parseFloat(CFT).toFixed(2),
                                Divisor: parseFloat(cargoRate.dividend).toFixed(2),
                                rate: parseFloat(vendorRate.rates) + ((parseFloat(vendorRate.rates) * parseFloat(markup)) / 100),//zone to zone rate(per kg),
                                totalAdditionalAmount: parseFloat(totalAdditionalAmount).toFixed(2),
                                VtotalAdditionalAmount: parseFloat(totalAdditionalAmount).toFixed(2),
                                additionalCharges: JSON.stringify(calculatedadditionalCharge),
                                min_Chargable_weight: parseFloat(cargoRate.cwMin).toFixed(2),
                                minFreight: parseFloat(cargoRate.minFreight).toFixed(2),//min freight ,
                                minODA: parseFloat(odaMin).toFixed(2),
                                odaPerKG: parseFloat(odaperkg).toFixed(2),
                                oda_amount: parseFloat(odaAmount).toFixed(2),
                                taxableAmount: parseFloat(totalTaxableAmount).toFixed(2),
                                V_taxableAmount: parseFloat(totalTaxableAmount).toFixed(2),
                                gst: parseFloat(cargoRate.GST).toFixed(2),
                                gst_Amount: parseFloat(gst).toFixed(2),
                                V_gst_Amount: parseFloat(gst).toFixed(2),
                                totalAmount: parseFloat(order.totalAmount).toFixed(2),
                                V_totalAmount: parseFloat(order.totalAmount).toFixed(2),
                                userId: order.userId,
                                servicetype: getServiceList[i].serviceType,
                                ExpectedDelivery: moment().add(TAT, 'days').format('ddd MMM DD, YYYY'),
                                VGst: parseFloat(cargoRate.GST).toFixed(2),
                                VMinChargableWeight: parseFloat(cargoRate.cwMin).toFixed(2),
                                VMinFreight: parseFloat(cargoRate.minFreight).toFixed(2),
                                VMinODA: parseFloat(odaMin).toFixed(2),
                                VOdaAmount: parseFloat(odaAmount).toFixed(2),
                                VOdaPerKG: parseFloat(odaperkg).toFixed(2),
                                VRate: parseFloat(vendorRate.rates).toFixed(2),
                                VadditionalCharges: JSON.stringify(calculatedadditionalCharge),
                                Vchargable_weight: finalShipmentWeight,
                                specialCharge: 0,
                                VspecialCharge: 0,
                                excess_weight: 0,
                                new_weight: data.shipmentWeight,
                                excess_amount: parseFloat(parseFloat(finalAmount).toFixed(2) - parseFloat(order.totalAmount).toFixed(2)).toFixed(2),
                                new_amount: parseFloat(finalAmount).toFixed(2),
                                rateType: 2,
                                remark: requestData.remark ? JSON.stringify([{ userId: creatorId, userType: 'admin', remark: requestData.remark }]) : JSON.stringify([{ userId: creatorId, userType: 'admin', remark: "" }])

                            }

                            await OrderWeightReconcilation.create(finaldata)
                            return { status: 1, amount: 0 }

                        }
                        return { status: 7, amount: 0 }

                    }
                    return { status: 8, amount: 0 }
                }
                return { status: 9, amount: 0 }
            }
            return { status: 10, amount: 0 }


        }
        return { status: 11, amount: 0 }
    }

}