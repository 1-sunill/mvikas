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
const OrderSpecialCharge = db.mvOrderSpecialCharge
const OrderItemStatusRemark = db.mvOrderStatusRemark

const moment = require('moment')
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
const {
    aws
} = require('../../../../helper/aws');
const XLSXDownloader = require("../../Service/XLSXDownloader");
const NotificationHelper = require('../../../../helper/notification')
module.exports = {
    getOrders: async (req, res) => {
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
                sortByColumn = 'createdAt'
            } = req.query;
            page = parseInt(page);
            limit = parseInt(limit);
            const offset = (page - 1) * limit;
            let params = {
                vendorId: req.decodedData.id,
                paymentStatus: {
                    [Op.ne]: 'Initiated'
                }
            }
            if (status) {
                params.latestStatus = status
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
                        Topincode: { [Op.like]: `%${search}%` }
                    },
                    {
                        Frompincode: { [Op.like]: `%${search}%` }
                    },
                    {
                        Customername: { [Op.like]: `%${search}%` }
                    },
                    {
                        iteminvoice: { [Op.like]: `%${search}%` }
                    },
                    {
                        Order_id: { [Op.like]: `%${search}%` }
                    }

                ];
            }
            let orders = await Order.findAll({
                where: params,
                include: [{
                    model: OrderStatusType,
                    as: "orderStatus"
                }, {
                    model: OrderSpecialCharge
                }],
                limit,
                offset,
                order: [
                    [sortByColumn, sortBy]
                ]
            });
            for (let order of orders) {
                order.dataValues.articles = await OrderItem.count({ where: { Orderid: order.Order_id } })
            }
            let count = await Order.count({ where: params })
            let data = {
                list: orders,
                count: count,
                limit: limit
            }
            return success(res, ORDER_CONSTANTS.ORDER, data)
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    getOrderDetails: async (req, res) => {
        try {
            // Validate the request
            const validate = new Validator(req.query, {
                orderId: "required"
            });

            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }

            let {
                orderId = "",
                page = 1,
                limit = 10,
                column = 'Itemid',
                operator = 'equals',
                value,
                sortBy = 'DESC',
                sortByColumn = 'createdAt'
            } = req.query;
            let order = await Order.findOne({
                where: {
                    Order_id: orderId,
                    vendorId: req.decodedData.id
                }
            })
            if (!order)
                return response(res, 422, "Invalid order id")
            page = parseInt(page);
            limit = parseInt(limit);
            const offset = (page - 1) * limit;
            let params = {
                Orderid: orderId
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

            let items = await OrderItem.findAll({
                where: params,
                include: [{
                    model: OrderStatusType,
                    as: "Itemstatus",
                    attributes: ['id', 'name']
                }],
                limit,
                offset,
                order: [
                    [sortByColumn, sortBy]
                ]

            });
            for (let i = 0; i < items.length; i++) {
                items[i].dataValues.userId = order.userId
                items[i].dataValues.vendorId = order.vendorId
                items[i].dataValues.podOrderId = order.id
                items[i].dataValues.orderedItemsStatus = await OrderedItemsStatus.findAll({
                    where: {
                        ItemId: items[i].Itemid
                    },
                    include: [{
                        model: OrderStatusType,
                        as: "statusType",
                        attributes: ['id', 'name']
                    }],
                    attributes: ['id', 'ItemId', 'StatusType', 'ExcelRemarks', 'DelayReason', 'DeliveredAt', 'PODUrl']
                })
            }


            let count = await OrderItem.count({ where: params })
            let data = {
                orderStatus: order.latestStatus,
                list: items,
                count: count,
                limit: limit
            }
            return success(res, ORDER_CONSTANTS.ORDER_ITEM, data)
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    updateOrderItemStatus: async (req, res) => {
        try {
            let request = req.body
            const validate = new Validator(request, {
                type: "required|in:single,bulk",
                orderId: "required",
                itemId: "requiredIf:type,single",
                statusType: "required",
                userId: "required",
                ExcelRemarks: "sometimes",
                DelayReason: "nullable"
            });
            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            let orderExist = await Order.findOne({
                where: {
                    Order_id: request.orderId,
                    vendorId: req.decodedData.id,
                    userId: request.userId
                }
            })
            if (!orderExist)
                return response(res, 422, "Order not found")
            let orderStatusType = await OrderStatusType.findOne({
                where: {
                    id: request.statusType
                }
            })
            if (!orderStatusType)
                return response(res, 422, ORDER_CONSTANTS.INVALID_STATUS)
            if (request.type == 'single') {
                let itemExist = await OrderItem.findOne({
                    where: {
                        Itemid: request.itemId,
                        Orderid: request.orderId
                    }
                })
                if (!itemExist)
                    return response(res, 422, "Item not found")

                if (parseInt(request.statusType) < parseInt(itemExist.ItemStatus))
                    return response(res, 422, "You can't revert back")
                if (parseInt(request.statusType) == parseInt(itemExist.ItemStatus)) {
                    let orderitemstatus = await OrderedItemsStatus.findOne({
                        where: {
                            ItemId: request.itemId,
                            OrderId: request.orderId,
                            userId: request.userId,
                            StatusType: request.statusType
                        }
                    })
                    await OrderItemStatusRemark.create({
                        orderItemStatusId: orderitemstatus.id,
                        remark: request.ExcelRemarks ? request.ExcelRemarks : orderStatusType.name,
                        delayReason: request.DelayReason ? request.DelayReason : "",
                        createdAt: new Date(),
                        updatedAt: new Date()
                    })
                } else {
                    await OrderItem.update({
                        ItemStatus: request.statusType,
                        status: orderStatusType.name
                    }, {
                        where: {
                            Itemid: request.itemId
                        }
                    })
                    await OrderedItemsStatus.create({
                        ItemId: request.itemId,
                        OrderId: request.orderId,
                        userId: request.userId,
                        StatusType: request.statusType,
                        status: 1,
                        ExcelRemarks: request.ExcelRemarks ? request.ExcelRemarks : orderStatusType.name,
                        DelayReason: request.DelayReason ? request.DelayReason : "",
                        DeliveredAt: orderStatusType.name == "Delivered" ? new Date() : null

                    })
                    const lastestStatus = await OrderItem.findOne({
                        where: {
                            Itemid: request.itemId
                        },
                        order: [['ItemStatus', 'DESC']]
                    });
                    if (!request.orderId || !request.vendorId || !request.userId) {
                       return failed(res,"Missing required parameters: orderId, vendorId, or userId.");
                    }
                    
                    await Order.update({ latestStatus: lastestStatus.ItemStatus }, {
                        where: {
                            Order_id: request.orderId,
                            vendorId: request.vendorId,
                            userId: request.userId
                        }
                    })
                }
            } else {
                let items = await OrderItem.findAll({
                    where: {
                        Orderid: request.orderId
                    }
                })
                if (!items.length)
                    return response(res, 422, "Items not found")
                for (let i = 0; i < items.length; i++) {
                    let exist = await OrderedItemsStatus.findOne({
                        where: {
                            ItemId: items[i].Itemid,
                            OrderId: orderExist.Order_id,
                            userId: orderExist.userId,
                            StatusType: request.statusType,
                        }
                    })
                    if (exist) {
                        await OrderedItemsStatus.update({
                            ExcelRemarks: request.ExcelRemarks ? request.ExcelRemarks : "",
                            DelayReason: request.delayReason ? request.delayReason : "",
                            DeliveredAt: orderStatusType.name == "Delivered" ? new Date() : null

                        }, {
                            where: {
                                id: exist.id
                            }
                        })
                        await OrderItemStatusRemark.create({
                            orderItemStatusId: exist.id,
                            remark: request.delayReason ? request.delayReason : "",
                            delayReason: request.delayReason ? request.delayReason : "",
                            createdAt: new Date(),
                            updatedAt: new Date()
                        })
                    } else {
                        let created = await OrderedItemsStatus.create({
                            ItemId: items[i].Itemid,
                            OrderId: request.orderId,
                            userId: request.userId,
                            StatusType: request.statusType,
                            status: 1,
                            ExcelRemarks: request.ExcelRemarks ? request.ExcelRemarks : orderStatusType.name,
                            DelayReason: request.DelayReason ? request.DelayReason : "",
                            DeliveredAt: orderStatusType.name == "Delivered" ? new Date() : null

                        })
                        await OrderItemStatusRemark.create({
                            orderItemStatusId: created.id,
                            remark: request.ExcelRemarks ? request.ExcelRemarks : orderStatusType.name,
                            delayReason: request.DelayReason ? request.DelayReason : "",
                            createdAt: new Date(),
                            updatedAt: new Date()
                        })
                    }
                }

                await OrderItem.update({
                    ItemStatus: request.statusType,
                    status: orderStatusType.name
                }, {
                    where: {
                        Orderid: request.orderId
                    }
                })

            }
            await Order.update({ updatedAt: new Date(), latestStatus: request.statusType }, {
                where: {
                    Order_id: request.orderId,
                    vendorId: req.decodedData.id,
                    userId: request.userId
                }
            })
            let items = await OrderItem.count({
                where: {
                    Orderid: request.orderId
                }
            })
            let user = await User.findOne({
                where:
                {
                    id: request.userId
                },
                attributes: ['id', 'mobile', 'email']
            })
            let bodyValues = [request.orderId, orderStatusType.name, moment(orderExist.createdAt).format('DD MM YYYY'), items, orderExist.deliveryaddress, '', moment(orderExist.ExpectedDelivery).format('DD MM YYYY'), orderExist.MvikasDocketNo, orderExist.invoiceNumber, orderExist.deliverypersonname]
            await NotificationHelper.createOrderUpdateNotification(user.email, request.orderId, req.decodedData.id, request.userId, request.statusType, bodyValues, `91${user.mobile}`, [process.env.MSG91_BUTTON_URL])
            return success(res, ORDER_CONSTANTS.STATUS_CHANGED)
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    uploadPOD: async (req, res) => {
        try {
            let request = req.body
            const validate = new Validator(request, {
                orderId: "required"
            });
            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            if (!req.files && !req.files.podImage)
                return response(res, 422, 'POD image required')

            let orderExist = await Order.findOne({
                where: {
                    id: request.orderId,
                    vendorId: req.decodedData.id
                }
            })
            if (!orderExist)
                return response(res, 422, "Order not found")
            const image = await aws(req.files.podImage, 'orderPOD');
            await Order.update({ PODUrl: image.Location }, {
                where: {
                    id: request.orderId,
                    vendorId: req.decodedData.id
                }
            })
            return success(res, 'POD uploaded')
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    // exportOrder: async (req, res) => {
    //     try {
    //         let order = await Order.findAll({
    //             where: {
    //                 vendorId: req.decodedData.id,
    //                 paymentStatus: {
    //                     [Op.ne]: 'Initiated'
    //                 }
    //             }
    //         })
    //         let header = [
    //             { header: 'Order Number', key: 'Order_id' },
    //             { header: 'From Pin', key: 'Frompincode' },
    //             { header: 'To Pin', key: 'Topincode' },
    //             { header: 'Taxable Amount', key: 'taxableAmount' },
    //             { header: 'GST Amount', key: 'gst' },
    //             { header: 'Total Amount', key: 'totalAmount' },
    //             { header: 'Pickup Address', key: 'Pickupaddress' },
    //             { header: 'Pickup Person Name	', key: 'Pickuppersonname' },
    //             { header: 'Pickup Person No.', key: 'Pickuppersonmobile' },
    //             { header: 'Delivery Address', key: 'deliveryaddress' },
    //             { header: 'Delivery Address No.', key: 'deliverypersonmobile' },
    //             { header: 'Customer Invoice', key: 'iteminvoice' },
    //             { header: 'Item Invoice', key: 'iteminvoice' },
    //             { header: 'Docker Number', key: 'MvikasDocketNo' }
    //         ]
    //         let data = []
    //         for (let i = 0; i < order.length; i++) {
    //             data.push({
    //                 Order_id: order[i].Order_id,
    //                 Frompincode: order[i].Frompincode,
    //                 Topincode: order[i].Topincode,
    //                 Topincode: order[i].Topincode,
    //                 gst: order[i].gst,
    //                 totalAmount: order[i].totalAmount,
    //                 Pickupaddress: order[i].Pickupaddress,
    //                 Pickuppersonname: order[i].Pickuppersonname,
    //                 Pickuppersonmobile: order[i].Pickuppersonmobile,
    //                 deliveryaddress: order[i].deliveryaddress,
    //                 deliverypersonmobile: order[i].deliverypersonmobile,
    //                 iteminvoice: order[i].iteminvoice,
    //                 MvikasDocketNo: order[i].MvikasDocketNo
    //             })
    //         }
    //         await XLSXDownloader.downloadXLSX(res, data, header, 'Order')
    //         // return success(res, 'Success')
    //     } catch (error) {
    //         console.error(SYSTEM_FAILURE, error);
    //         return failed(res, SYSTEM_FAILURE);
    //     }
    // },
    exportOrder: async (req, res) => {
        try {
            let order = await Order.findAll({
                where: {
                    vendorId: req.decodedData.id,
                    paymentStatus: {
                        [Op.ne]: 'Initiated'
                    }
                },
                include: [{
                    model: OrderStatusType,
                    as: "orderStatus"
                }]
            })
            let header = [
                { header: 'Order Number', key: 'Order_id' },
                { header: 'Booking Date', key: 'bookingDate' },
                { header: 'From Pin', key: 'Frompincode' },
                { header: 'To Pin', key: 'Topincode' },
                { header: 'Status', key: 'Status' },
                { header: 'ETA', key: 'ETA' },
                { header: 'Shipment weight', key: 'Shipmentweight' },
                { header: 'Chargeable Weight', key: 'ChargeableWeight' },
                { header: 'Shipment Value', key: 'ShipmentValue' },
                { header: 'Rate', key: 'Rate' },
                { header: 'Additional Charge', key: 'AdditionalCharge' },
                { header: 'Taxable Amount', key: 'TaxableAmount' },
                { header: 'GST Amount', key: 'GSTAmount' },
                { header: 'Total Amount', key: 'totalAmount' },
                { header: 'Pickup Person Name	', key: 'Pickuppersonname' },
                { header: 'Pickup Address', key: 'Pickupaddress' },
                { header: 'Pickup Person No.', key: 'Pickuppersonmobile' },
                { header: 'Delivery Person Name', key: 'DeliveryPersonName' },
                { header: 'Delivery Address', key: 'deliveryaddress' },
                { header: 'Delivery Address No.', key: 'deliverypersonmobile' },
                { header: 'Customer Invoice', key: 'invoiceNumber' },
                { header: 'Item Invoice', key: 'iteminvoice' },
                { header: 'Docker Number', key: 'MvikasDocketNo' },
                { header: 'LSP Docket No', key: 'LSPDocketNo' },
                { header: 'Other info.', key: 'otherinfo' }
            ]
            let data = []
            for (let i = 0; i < order.length; i++) {
                data.push({
                    Order_id: order[i].Order_id,
                    bookingDate: moment(order[i].createdAt).format('DD MM YYYY'),
                    Frompincode: order[i].Frompincode,
                    Topincode: order[i].Topincode,
                    Status: order[i].orderStatus.name,
                    ETA: moment(order[i].ExpectedDelivery).format('DD MM YYYY'),
                    Shipmentweight: parseFloat(order[i].Shipment_weight).toFixed(2),
                    ChargeableWeight: parseFloat(order[i].chargable_weight).toFixed(2),
                    ShipmentValue: parseFloat(order[i].Shipment_value).toFixed(2),
                    Rate: parseFloat(order[i].rate).toFixed(2),
                    AdditionalCharge: JSON.parse(order[i].additionalCharges),
                    totalAmount: order[i].totalAmount,
                    Pickuppersonname: order[i].Pickuppersonname,
                    Pickupaddress: order[i].Pickupaddress,
                    Pickuppersonmobile: order[i].Pickuppersonmobile,
                    DeliveryPersonName: order[i].deliverypersonname,
                    deliveryaddress: order[i].deliveryaddress,
                    deliverypersonmobile: order[i].deliverypersonmobile,
                    invoiceNumber: order[i].invoiceNumber,
                    iteminvoice: order[i].iteminvoice,
                    MvikasDocketNo: order[i].MvikasDocketNo,
                    LSPDocketNo: order[i].LSPDocketNo ? order[i].LSPDocketNo : "",
                    otherinfo: order[i].OtherInfromation ? order[i].OtherInfromation : ""
                })
            }
            await XLSXDownloader.downloadXLSX(res, data, header, 'Order')
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    createSpecialCharge: async (req, res) => {
        try {
            let request = req.body
            const validate = new Validator(request, {
                orderId: "required",
                amount: "required",
                type: "required|string"
            });
            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            if (isNaN(request.amount))
                return response(res, 422, "Please enter valid number.")
            let order = await Order.findOne({
                where: {
                    id: request.orderId
                }
            })
            if (!order)
                return response(res, 422, "Order not found")
            if (order.latestStatus == 4)
                return response(res, 422, "Special charge not applicable after deliverd")
            if (order.latestStatus == 5)
                return response(res, 422, "Special charge not applicable after cancelled")
            let OrderSpecialChargeExist = await OrderSpecialCharge.findOne({
                where: {
                    orderId: request.orderId
                }
            })
            let attachment = ""
            if (req.files && req.files.attachment) {
                const image = await aws(req.files.attachment, 'specialChargeAttachment');
                attachment = image.Location
            }

            if (OrderSpecialChargeExist) {
                if (OrderSpecialChargeExist?.status != 1) {
                    await OrderSpecialCharge.update({
                        amount: request.amount,
                        type: request.type,
                        status: 0,
                        remark: request.remark ? request.remark : "",
                        attachment: attachment ? attachment : ""
                    }, {
                        where:
                        {
                            orderId: request.orderId
                        }
                    })
                } else {
                    return response(res, 422, "You can't update after approval")
                }
            } else {
                await OrderSpecialCharge.create({
                    orderId: request.orderId,
                    amount: request.amount,
                    type: request.type,
                    status: 0,
                    remark: request.remark ? request.remark : "",
                    attachment: attachment ? attachment : ""
                })
            }
            return success(res, "Charge request sent")
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    }
}