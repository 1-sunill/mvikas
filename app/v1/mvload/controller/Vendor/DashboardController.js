const {
    success,
    failed,
    serverError,
    validateFail,
    response
} = require("../../../../helper/response");

const {
    SYSTEM_FAILURE,
    ORDER_CONSTANTS
} = require('../../../../helper/message');
const db = require("../../../../../models");
const _ = require("lodash");
const Service = db.mvService;
const Associate = db.mvAssociateVendors;
const User = db.mvUser;
const Pincode = db.mvPincode
const ZonePinMap = db.mvZonePinMap
const ZoneServiceMap = db.mvZoneServiceMap
const VendorRate = db.mvVendorRates
const Order = db.mvorder
const OrderItemDimension = db.mvOrderDimension
const OrderItem = db.mvOrderItem
const OrderItemStatus = db.mvOrderedItemStatus
const OrderedItemsStatus = db.mvOrderedItemStatus
const OrderStatusType = db.mvOrderStatusType
const Notification = db.mvnotification
const moment = require('moment')
const ExcelJS = require('exceljs');

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
    dashboard: async (req, res) => {
        try {
            let order = await Order.findAll({
                where: {
                    paymentStatus: {
                        [Op.ne]: 'Initiated'
                    },
                    vendorId: req.decodedData.id
                },
                attributes: [
                    [fn("MONTH", col("createdAt")), "month"],
                    [fn("count", "*"), "count"],
                ],
                group: ["month"],
            });
            let reportCount = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            for (let i = 0; i < order.length; i++) {
                reportCount.splice(order[i].dataValues.month - 1, 0, order[i].dataValues.count)
            }
            let orderCount = await Order.count({
                where: {
                    paymentStatus: {
                        [Op.ne]: 'Initiated'
                    },
                    vendorId: req.decodedData.id
                }
            })
            let orderRejectedCount = await Order.count({
                where: {
                    paymentStatus: {
                        [Op.ne]: 'Initiated'
                    },
                    OrderStatus: 2,
                    vendorId: req.decodedData.id
                }
            })
            let totalUser = await Associate.count({
                where: {
                    vendorId: req.decodedData.id
                }
            })
            let nonserviceablePincode = await ZoneServiceMap.count({
                where: {
                    vendorId: req.decodedData.id,
                    isODA: null
                }
            })
            let serviceablePincode = await ZoneServiceMap.count({
                where: {
                    vendorId: req.decodedData.id,
                    isODA: {
                        [Op.in]: ['serviceable']
                    }
                }
            })
            let oda1Pincode = await ZoneServiceMap.count({
                where: {
                    vendorId: req.decodedData.id,
                    isODA: {
                        [Op.in]: ['ODA1']
                    }
                }
            })
            let oda2Pincode = await ZoneServiceMap.count({
                where: {
                    vendorId: req.decodedData.id,
                    isODA: {
                        [Op.in]: ['ODA2']
                    }
                }
            })
            let oda3Pincode = await ZoneServiceMap.count({
                where: {
                    vendorId: req.decodedData.id,
                    isODA: {
                        [Op.in]: ['ODA3']
                    }
                }
            })
            let params = {
                receiverId: req.decodedData.id,
                userType: 'Vendor'
            }
            let notificationCount = await Notification.count({ where: params })
            let booked = await Order.count({
                where: {
                    latestStatus: 1,
                    vendorId: req.decodedData.id
                }
            })
            let pickedUp = await Order.count({
                where: {
                    latestStatus: 2,
                    vendorId: req.decodedData.id
                }
            })
            let transit = await Order.count({
                where: {
                    latestStatus: 3,
                    vendorId: req.decodedData.id
                }
            })
            let rto = await Order.count({
                where: {
                    latestStatus: 6,
                    vendorId: req.decodedData.id
                }
            })
            let delivered = await Order.count({
                where: {
                    latestStatus: 4,
                    vendorId: req.decodedData.id
                }
            })
            let cancelled = await Order.count({
                where: {
                    latestStatus: 5,
                    vendorId: req.decodedData.id
                }
            })
            let data = {
                noOfOrder: orderCount,
                orderRejectedCount: orderRejectedCount,
                totalUser: totalUser,
                noOfInvoice: orderCount,
                nonserviceablePincode: nonserviceablePincode,
                serviceablePincode: serviceablePincode,
                oda1Pincode: oda1Pincode,
                oda2Pincode: oda2Pincode,
                oda3Pincode: oda3Pincode,
                notificationCount: notificationCount,
                booked: booked,
                pickedUp: pickedUp,
                transit: transit,
                rto: rto,
                delivered: delivered,
                cancelled: cancelled,
                reportChart: reportCount,
                orderChart: [booked, pickedUp, transit, rto, delivered, cancelled]
            }
            return success(res, 'Vendor Dashboard', data)
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    notificationList: async (req, res) => {
        try {
            let {
                page = 1,
                limit = 10
            } = req.query;
            page = parseInt(page);
            limit = parseInt(limit);
            const offset = (page - 1) * limit;
            let params = {
                receiverId: req.decodedData.id,
                userType: 'Vendor'
            }
            params = Object.assign(params, {
                [Op.or]: [{
                    scheduleDate: {
                        [Op.lte]: new Date()
                    }
                }, {
                    scheduleDate: null
                }]
            })
            let notification = await Notification.findAll({
                where: params,
                limit,
                offset,
                order: [
                    ['createdAt', 'DESC']
                ]
            })
            let count = await Notification.count({ where: params })
            let data = {
                list: notification,
                count: count,
                limit: limit
            }
            await Notification.update({ isRead: true }, {
                where: params
            })
            return success(res, 'Notification list', data)
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    }
}