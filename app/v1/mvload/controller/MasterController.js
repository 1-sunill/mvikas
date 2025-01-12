const {
    success,
    failed,
    serverError,
    validateFail,
    response
} = require("../../../helper/response");
const {
    SYSTEM_FAILURE,
    GENERAL_MESSAGE
} = require('../../../helper/message');
const db = require("../../../../models");
const _ = require("lodash");
const Category = db.mvcategory;
const SubCategory = db.mvsubcategory;
const MvVendorSetting = db.mvVendorSetting;
const ItemType = db.mvItemType;
const OrderStatusType = db.mvOrderStatusType
const OrderReviewType = db.mvreviewType
const User = db.mvUser
const Service = db.mvService
const Cargorate = db.mvCargoRates
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

module.exports = {
    getCategory: async (req, res) => {
        try {
            let data = await Category.findAll({
                where: {
                    status: true
                }
            })
            return success(res, GENERAL_MESSAGE.SUCCESS, data);
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    getSubCategory: async (req, res) => {
        try {
            let data = await SubCategory.findAll({
                where: {
                    status: true
                }
            })
            return success(res, GENERAL_MESSAGE.SUCCESS, data);
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    getPickupSlot: async (req, res) => {
        try {
            let request = req.query;
            // Validate the request
            const validate = new Validator(request, {
                vendorId: "required"
            });

            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }

            let data = await MvVendorSetting.findAll({
                where: {
                    isActive: true,
                    name: 'picupSlot',
                    userId: request.vendorId
                }
            })
            return success(res, GENERAL_MESSAGE.SUCCESS, data);
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    getDeliverySlot: async (req, res) => {
        try {
            let request = req.query;
            // Validate the request
            const validate = new Validator(request, {
                vendorId: "required"
            });

            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            let data = await MvVendorSetting.findAll({
                where: {
                    isActive: true,
                    name: 'deliverySlot',
                    userId: request.vendorId

                }
            })
            return success(res, GENERAL_MESSAGE.SUCCESS, data);
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    getItemType: async (req, res) => {
        try {
            let data = await ItemType.findAll({
                where: {
                    status: true
                },
                attributes: ['id', 'name']
            })
            return success(res, GENERAL_MESSAGE.SUCCESS, data);
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    getOrderStatusType: async (req, res) => {
        try {
            let data = await OrderStatusType.findAll({
                where: {
                    status: true
                },
                attributes: ['id', 'name']
            })
            return success(res, GENERAL_MESSAGE.SUCCESS, data);
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    getOrderReviewType: async (req, res) => {
        try {
            let data = await OrderReviewType.findAll({
                where: {
                    status: true
                },
                attributes: ['id', 'name']
            })
            return success(res, GENERAL_MESSAGE.SUCCESS, data);
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    getServiceListByVendorId: async (req, res) => {
        //get service list by vendorid except existing service
        try {
            let request = req.query;
            const validate = new Validator(request, {
                vendorId: "required",
                serviceId: "required"
            });

            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            let perBoxService = await Cargorate.findAll({
                where: {
                    vendorId: request.vendorId,
                    serviceId: {
                        [Op.ne]: request.serviceId
                    }
                }
            })
            let data = await Service.findAll({
                where: {
                    isActive: true,
                    userId: request.vendorId,
                    id: {
                        [Op.in]: perBoxService.map(ser => ser.serviceId)
                    }
                }
            })
            return success(res, 'Service list', data);
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    }



}