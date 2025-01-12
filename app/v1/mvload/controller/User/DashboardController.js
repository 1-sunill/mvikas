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
const AccountDetails = db.mvAccountDetails
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
                    userId: req.decodedData.id
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
            let account = await AccountDetails.findOne({
                where: {
                    userId: req.decodedData.id
                }
            })
            let orderCount = await Order.count({
                where: {
                    paymentStatus: {
                        [Op.ne]: 'Initiated'
                    },
                    userId: req.decodedData.id
                }
            })
            let totalAmountSum = await Order.sum('totalAmount', {
                where: {
                    paymentStatus: {
                        [Op.ne]: 'Initiated'
                    },
                    userId: req.decodedData.id
                }
            });
            let totalPaylaterAmount = await Order.sum('totalAmount', {
                where: {
                    paymentMode: 'Paylater',
                    userId: req.decodedData.id,
                    totalAmount: {
                        [Op.ne]: null
                    }
                }
            });
            let params = {
                receiverId: req.decodedData.id,
                userType: 'User'
            }
            let notificationCount = await Notification.count({ where: params })
            let booked = await Order.count({
                where: {
                    latestStatus: 1,
                    userId: req.decodedData.id
                }
            })
            let pickedUp = await Order.count({
                where: {
                    latestStatus: 2,
                    userId: req.decodedData.id
                }
            })
            let transit = await Order.count({
                where: {
                    latestStatus: 3,
                    userId: req.decodedData.id
                }
            })
            let rto = await Order.count({
                where: {
                    latestStatus: 6,
                    userId: req.decodedData.id
                }
            })
            let delivered = await Order.count({
                where: {
                    latestStatus: 4,
                    userId: req.decodedData.id
                }
            })
            let cancelled = await Order.count({
                where: {
                    latestStatus: 5,
                    userId: req.decodedData.id
                }
            })
            // Get the current date
            const currentDate = moment();
            // Get the year and month
            const currentYear = currentDate.format('YYYY');  // Year in 4 digits
            const currentMonth = currentDate.format('MM');   // Month in 2 digits (01 - 12)
            let billingDate = null
            let paymentDate = null
            if (account.billingCycle && account.billingDay) {
                billingDate = `${currentYear}-${currentMonth}-${account.billingDay}`
                billingDate = moment(billingDate, 'YYYY-MM-DD')
                if (account.billingCycle == 'yearly') {
                    billingDate.add(1, 'year')
                } else if (account.billingCycle == 'monthly') {
                    billingDate.add(1, 'month')

                } else {
                    billingDate.add(1, 'week')
                }
            }
            if (account.paymentCycle && account.paymentDay) {
                paymentDate = `${currentYear}-${currentMonth}-${account.paymentDay}`
                paymentDate = moment(paymentDate, 'YYYY-MM-DD')
                if (account.paymentCycle == 'yearly') {
                    paymentDate.add(1, 'year')
                } else if (account.paymentCycle == 'monthly') {
                    paymentDate.add(1, 'month')

                } else {
                    paymentDate.add(1, 'week')
                }
            }
            let data = {
                accountType: account.billingType,
                creditLimit: account.creditLimit ? account.creditLimit : 0,
                availableLimit: account.availableAmount ? account.availableAmount : 0,
                nextBillingDate: billingDate ? moment(billingDate).format('Do MMMM YYYY') : null,
                paymentDueDate: paymentDate ? moment(paymentDate).format('Do MMMM YYYY') : null,
                noOfOrder: orderCount,
                totalOrderValue: totalAmountSum,
                totalPaymentPending: totalPaylaterAmount ? parseFloat(totalPaylaterAmount).toFixed(2) : 0,
                noOfInvoice: orderCount,
                notificationCount: notificationCount,
                booked: booked,
                pickedUp: pickedUp,
                transit: transit,
                rto: rto,
                delivered: delivered,
                cancelled: cancelled,
                reportChart: reportCount,
                orderChart: [booked, pickedUp, transit, delivered, cancelled, rto]
            }
            return success(res, 'user Dashboard', data)
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
                userType: 'User',
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
    },
    getWalletAmount: async (req, res) => {
        try {
            let userAccount = await AccountDetails.findOne({
                where: {
                    userId: req.decodedData.id
                }
            })
            return success(res, 'Wallet amount', { availableWalletAmount: userAccount.availableWalletAmount ? atob(userAccount.availableWalletAmount) : 0 })
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    }
}