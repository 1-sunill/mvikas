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
const RatePerKgPerBoxHelper = require('../../../../helper/ratePerKgPerBoxServiceList')
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
const NotificationHelper = require('../../../../helper/notification');
const { model } = require("mongoose");
module.exports = {
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
                userId: req.decodedData.id
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
    acceptRejectRateReconcilation: async (req, res) => {
        try {
            // Validate the request
            let requests = req.body
            const validate = new Validator(requests, {
                type: "required|in:Accept,Dispute",
                id: "required",
                remark: "required",

            });
            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            requests.userType = 'user'
            let exist = await OrderWeightReconcilation.findOne({
                where: {
                    id: requests.id
                }
            })
            if (!exist)
                return response(res, 422, 'Weight reconcilation not found')
            let order = await Order.findOne({
                where: {
                    id: exist.orderId
                }
            })
            if (!order)
                return response(res, 422, 'Order not found')
            await RatePerKgPerBoxHelper.acceptRejectWeightReconcilation(req, requests, order, exist)
            return success(res, "Success")
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    getRateReconcilationDashboard: async (req, res) => {
        try {
            let results = await OrderWeightReconcilation.findAll({
                where: {
                    userId: req.decodedData.id
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
                if (status == 4 || status == 5) data.totalDescrepancyAccespet +=1;
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