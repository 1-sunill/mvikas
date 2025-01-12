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
const OrderSpecialCharge = db.mvOrderSpecialCharge

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
const Razorpay = require('razorpay');
const fs = require("fs");
const pdf = require("html-pdf-node");
const ejs = require("ejs");
const { uploadPdfToS3, generateQr } = require("../../../../helper/aws");
const ExcelJS = require('exceljs');
const NotificationHelper = require('../../../../helper/notification')
module.exports = {
    getVendors: async (req, res) => {
        try {

            let request = req.body;
            // Validate the request
            const validate = new Validator(request, {
                sourcePincode: "required|integer|minLength:6|maxLength:6",
                destinationPincode: "required|integer|minLength:6|maxLength:6",
                shipmentAmount: "required",
                toPay: "required|in:true,false",
                isB2C: "required|in:true,false",
                items: "required|array",
                shipmentWeight: "required",
                // rateType: "nullable|in:1,2"
            });

            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            request.rateType = request.rateType ? request.rateType : 1//default per kg
            let user = await User.findOne({
                where: {
                    id: req.decodedData.id
                },
                include: [{
                    model: UserAccountDetails,
                    as: "account"
                }]
            })

            let markup = 0;
            //get assigned ventor to user
            let assignedVendors = await AssociateVendors.findAll({
                where: {
                    userId: req.decodedData.id
                },
                include: [{
                    model: User,
                    where: {
                        [Op.or]: [{
                            isBlocked: false
                        }, {
                            isBlocked: null
                        }],
                        isVendor: true,
                        isActive: true
                    },
                    as: "AssciateVendor",
                    attributes: ['id', 'name']
                }]
            })
            if (!assignedVendors.length)
                return success(res, ORDER_CONSTANTS.VENDORS, [])
            let getServiceList = await Service.findAll({
                where: {
                    userId: {
                        [Op.in]: assignedVendors.map(vendor => vendor.vendorId)
                    },
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
                                    vendorId: getServiceList[i].userId,
                                    rateType: request.rateType
                                }
                            })

                            if (cargoRate) {
                                if (await CalculativeHelper.checkCargoRateDateValidation(cargoRate.dateFrom, cargoRate.dateTo)) {

                                    let vendorRate = await VendorRate.findOne({
                                        where: {
                                            cargoId: cargoRate.id,
                                            zoneIdFrom: checkSourcePincodeMapWithZone.zoneId,
                                            zoneIdTo: checkDestinationPincodeMapWithZone.zoneId,
                                            rateType: request.rateType

                                        }
                                    })
                                    if (vendorRate) {
                                        if (cargoRate.rateType == 1) { //rate type per kg                                          

                                            let vservice = await RatePerKgPerBoxServiceList.getRatePerKgServiceList(vendorRate, cargoRate, request.items, request.shipmentWeight, ODA1, ODA2, ODA3, ODA11, ODA22, ODA33, request.shipmentAmount, getServiceList[i], user, markup, getSourcePincodeId, getDestinationPincodeId, TAT)
                                            if (vservice)
                                                finalServiceList.push(vservice)
                                        } else {
                                            console.log("rate per box");

                                            //rate type per box
                                            let vservice = await RatePerKgPerBoxServiceList.getRatePerboxServiceList(vendorRate, cargoRate, request.items, request.shipmentWeight, ODA1, ODA2, ODA3, ODA11, ODA22, ODA33, request.shipmentAmount, getServiceList[i], user, markup, getSourcePincodeId, getDestinationPincodeId, TAT)
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
            return success(res, ORDER_CONSTANTS.VENDORS, finalServiceList)

        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    createOrder: async (req, res) => {
        try {
            let request = req.body;
            // Validate the request
            const validate = new Validator(request, {
                paymentMode: "required|in:Gateway,Wallet,Paylater",
                sourcePincode: "required|integer|minLength:6|maxLength:6",
                destinationPincode: "required|integer|minLength:6|maxLength:6",
                shipmentAmount: "required|integer",
                toPay: "required|in:true,false",
                isB2C: "required|in:true,false",
                items: "required",
                details: "required",
                PickupCompanyName: "required",
                Pickupaddress: "required",
                Pickuppersonmobile: "required|maxLength:11",
                PickupCompanyName: "required",
                Pickuppersonname: "required",
                pickuptime: "required",
                PickupAddressId: "required",
                deliveryaddressid: "required",
                deliveryaddress: "required",
                deliverypersonname: "required",
                deliverypersonmobile: "required|maxLength:11",
                deliverypersonemail: "nullable",
                deliveryslot: "required",
                returnaddress: "required",
                returnpersonname: "required",
                returnpersonmobile: "required|maxLength:11",
                returnremarks: "nullable",
                // EWayBillNo: "required",
                // EWayBillExpDate: "required",
                ItemCategory: "required",
                ItemType: "required",
                iteminvoice: "required",
                Itemname: "required",
                // EWayBillNo: "required",
                // EWayBillExpDate: "required",
                OtherInfromation: "nullable"
            });
            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            let details = JSON.parse(request.details)
            if (parseFloat(request.shipmentAmount) > 49999 && (!request.EWayBillNo && request.EWayBillNo == null))
                return response(res, 422, "E-Way bill number required")
            if (parseFloat(request.shipmentAmount) > 49999 && (!request.EWayBillExpDate && request.EWayBillExpDate == null))
                return response(res, 422, "E-Way bill expiry required")
            console.log(details);
            let user = await User.findOne({
                where: {
                    id: req.decodedData.id
                },
                include: [{
                    model: UserAccountDetails,
                    as: "account"
                }]
            })
            details.additionalCharges = JSON.stringify(details.additionalCharges)
            details.VadditionalCharges = JSON.stringify(details.additionalCharges)
            request.IsB2C = request.isB2C == "true" ? 1 : 0
            if (!user)
                return response(res, 422, USER_CONSTANTS.USER_NOT_FOUND)
            let vendor = await User.findOne({
                where: {
                    id: details.vendorId
                }
            })
            if (!vendor)
                return response(res, 422, ORDER_CONSTANTS.VENDOR_NOT_FOUND)
            if (request.paymentMode == "Wallet") {
                let availableWalletAmount = user.account.availableWalletAmount ? atob(user.account.availableWalletAmount) : 0
                if (parseFloat(availableWalletAmount) < parseFloat(details.totalAmount))
                    return response(res, 422, "Insufficient wallet amount")
            }
            if (request.paymentMode == "Paylater") {
                if (!user.account)
                    return response(res, 422, "You are not eligible for this option because your account is not active for postpaid payments.")
                if (!user.account.billingType == "prepaid")
                    return response(res, 422, "You are not eligible for this option because your account is not active for postpaid payments.")
                if (!user.account.availableAmount)
                    return response(res, 422, "Insufficient credit limit.")
                if (parseFloat(user.account.availableAmount) < parseFloat(details.totalAmount))
                    return response(res, 422, "Insufficient credit limit.")
            }
            if (req.files && req.files.invoiceImage) {
                const image = await aws(req.files.invoiceImage, 'orderDetailInvoice');
                request.imagepath = image.Location;
            }
            let lastInserted = await Order.findOne({
                attributes: [[fn('max', col('MvikasDocketNo')), 'mvdockcet']],
                raw: true,
            });
            request.vendorOldId = details.vendorId
            request.MvikasDocketNo = lastInserted && lastInserted.mvdockcet ? `${lastInserted.mvdockcet.slice(0, 3)}${parseInt(lastInserted.mvdockcet.slice(3, lastInserted.mvdockcet.length)) + 1}` : "B2B1610199800001"
            request.invoiceNumber = new Date().getTime()
            request.Customername = user.name
            request.DeliveryPersonEmail = request.deliverypersonemail
            request.isPayLater = request.paymentMode == 'Paylater' ? true : false
            request.userId = req.decodedData.id
            request.Frompincode = request.sourcePincode
            request.Topincode = request.destinationPincode
            request.paymentmode = request.paymentMode
            request.gatewayOrderId = request.gatewayOrderId ? request.gatewayOrderId : ""
            request.paymentStatus = request.paymentMode == "Gateway" ? "Initiated" : "Completed"
            request.ExpectedDelivery = moment().add(details.tat, 'days').format('YYYY-MM-DD')
            request.Vdeliveryslot = request.deliveryslot
            request.Vpickuptime = request.pickuptime
            request.Vchargable_weight = details.chargable_weight
            let pickupaddress = await Address.findOne({
                where: {
                    id: request.PickupAddressId
                }
            })
            let deliveryaddress = await Address.findOne({
                where: {
                    id: request.deliveryaddressid
                }
            })
            request.Pickupaddress = `${pickupaddress.fullAddress}, ${pickupaddress.city}, ${pickupaddress.state}, ${pickupaddress.country}, ${pickupaddress.pincode}`
            request.deliveryaddress = `${deliveryaddress.fullAddress}, ${deliveryaddress.city}, ${deliveryaddress.state}, ${deliveryaddress.country}, ${deliveryaddress.pincode}`
            let orderData = request
            orderData = Object.assign(orderData, details)
            orderData.OrderStatus = 1
            let Order_id = ""
            let items = []
            if (typeof request.items === 'string') {
                // If it's a string, parse it
                items = JSON.parse(request.items);
            } else {
                // If it's already an object, use it directly
                items = request.items;
            }
            //return success(res, ORDER_CONSTANTS.PLACED, request)
            let razorpayData = null
            if (request.paymentMode == "Gateway") {
                let data = {
                    paidAmount: details.totalAmount,
                    userId: req.decodedData.id,
                    user: {
                        name: user.name,
                        mobile: user.mobile,
                        email: user.email
                    }
                }
                razorpayData = await PaymentService.initiatePayment(data)
                request.gatewayOrderId = razorpayData.id
            }

            let paymentCreated = await Payment.create({
                userId: req.decodedData.id,
                vendorId: details.vendorId,
                vendorOldId: details.vendorId,
                paymentType: request.paymentMode == "Gateway" ? 'Online' : request.paymentMode,
                billingType: user.account.billingType,
                creditLimit: user.account.creditLimit,
                availableLimit: user.account.availableAmount,
                utilizedLimit: user.account.creditLimit && user.account.availableAmount && request.paymentMode == 'Paylater' ? parseFloat(user.account.availableAmount) - parseFloat(details.totalAmount) : 0.0,
                transactionId: '',
                totalAmount: details.totalAmount,
                taxableAmount: details.taxableAmount,
                orderId: request.gatewayOrderId,
                status: request.paymentMode == "Gateway" ? 'Initiated' : 'Completed'
            })
            request.PaymentId = paymentCreated.id
            let orderCreated = await Order.create(orderData)
            Order_id = "MV-B2B/" + orderCreated.id
            await Order.update({
                Order_id: Order_id,
                invoiceNumber: `B2B/${moment().format("YYYY")}/${orderCreated.id}`
            }, {
                where: {
                    id: orderCreated.id
                }
            })
            let j = 1
            for (let index = 0; index < items.length; index++) {
                let itemDimension = await OrderItemDimension.create({
                    Orderid: Order_id,
                    Length: items[index].L,
                    Height: items[index].H,
                    Breadth: items[index].B,
                    Volume_weight: items[index].L * items[index].B * items[index].H * items[index].boxes,
                    boxes: items[index].boxes,
                    Unit: items[index].unit,
                    Actual_Weight: items[index].boxWeight
                })
                let orderItems = []
                let orderItemStatus = []
                for (let i = 0; i < items[index].boxes; i++) {
                    let item = {
                        Itemid: Order_id + "-" + (j),
                        OrderdimId: itemDimension.id,
                        ItemStatus: 1,
                        Orderid: Order_id,
                        Length: items[index].L,
                        Height: items[index].H,
                        Breadth: items[index].B,
                        BarCode: null,
                        status: "Booked"
                    }
                    orderItems.push(item)
                    orderItemStatus.push({
                        ItemId: Order_id + "-" + (j),
                        OrderId: Order_id,
                        userId: req.decodedData.id,
                        StatusType: 1, //booked
                        status: 1,
                        ExcelRemarks: "Booked"
                    })
                    j = j + 1
                }
                await OrderedItemsStatus.bulkCreate(orderItemStatus)
                await OrderItem.bulkCreate(orderItems)
            }
            if (request.paymentMode == "Paylater") {
                let bodyValues = [user.name, Order_id]
                await NotificationHelper.createOrderUpdateNotification(Order_id, details.vendorId, req.decodedData.id, 1, bodyValues, `91${user.mobile}`, [process.env.MSG91_BUTTON_URL])
                await UserAccountDetails.update({ availableAmount: parseFloat(user.account.availableAmount) - parseFloat(details.totalAmount) }, {
                    where: {
                        userId: req.decodedData.id
                    }
                })
            }
            if (request.paymentMode == "Wallet") {
                let bodyValues = [user.name, Order_id]
                await NotificationHelper.createOrderUpdateNotification(Order_id, details.vendorId, req.decodedData.id, 1, bodyValues, `91${user.mobile}`, [process.env.MSG91_BUTTON_URL])
                let availableWalletAmount = user.account.availableWalletAmount ? atob(user.account.availableWalletAmount) : 0
                await UserAccountDetails.update({
                    availableWalletAmount: btoa(parseFloat(availableWalletAmount) - parseFloat(details.totalAmount))
                }, {
                    where: {
                        userId: req.decodedData.id
                    }
                })

            }
            if (request.paymentMode == "Paylater") {
                return success(res, ORDER_CONSTANTS.PLACED, { orderId: Order_id, totalAmount: details.totalAmount, availableAmount: parseFloat(user.account.availableAmount) - parseFloat(details.totalAmount) })

            }
            else if (request.paymentMode == "Gateway") {
                return success(res, ORDER_CONSTANTS.PLACED, { orderId: Order_id, totalAmount: details.totalAmount, gatewayOrderId: razorpayData.id, amount: razorpayData.amount, currency: razorpayData.currency })
            } else {
                return success(res, ORDER_CONSTANTS.PLACED, { orderId: Order_id, totalAmount: details.totalAmount })

            }
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
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
                userId: req.decodedData.id,
                paymentStatus: {
                    [Op.ne]: 'Initiated'
                }
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
            if (column == 'Order_Id')
                column = 'id'
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
            if (status) {
                params.latestStatus = status
            }
            let orders = await Order.findAll({
                where: params,
                include: [{
                    model: OrderStatusType,
                    as: "orderStatus"
                },
                {
                    model: OrderSpecialCharge
                },
            ],
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
            page = parseInt(page);
            limit = parseInt(limit);
            let order = await Order.findOne({
                where: {
                    Order_id: orderId,
                    userId: req.decodedData.id
                }
            })
            if (!order)
                return response(res, 422, "Invalid order id")
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
                // items[i].dataValues.vendorId = order.vendorId
                items[i].dataValues.vendorId = order.vendorOldId
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
                orderId: order.id,
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
    getTrackOrder: async (req, res) => {
        try {
            let userId = ""
            const token =
                (req.headers.authorization
                    ? req.headers.authorization.split(" ")[1]
                    : "") ||
                (req.body && req.body.access_token) ||
                req.body.token ||
                req.query.token ||
                req.headers["x-access-token"];
            if (token) {
                let decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
                userId = decoded.id
            }
            // Validate the request
            const validate = new Validator(req.query, {
                orderId: "required"
            });

            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            let {
                orderId = ""
            } = req.query;
            let order = ""
            if (userId) {
                order = await Order.findOne({
                    where: {
                        [Op.or]: [{
                            Order_id: orderId
                        }, {
                            invoiceNumber: orderId
                        }, {
                            LSPDocketNo: orderId
                        }, {
                            iteminvoice: orderId
                        }, {
                            MvikasDocketNo: orderId
                        }, {
                            OtherInfromation: orderId
                        }],
                        userId: userId
                    },
                    include: [{
                        model: OrderStatusType,
                        as: 'orderStatus'
                    }]
                })
            } else {
                order = await Order.findOne({
                    where: {
                        [Op.or]: [{
                            Order_id: orderId
                        }, {
                            invoiceNumber: orderId
                        }, {
                            LSPDocketNo: orderId
                        }, {
                            iteminvoice: orderId
                        },
                        {
                            MvikasDocketNo: orderId
                        }, {
                            OtherInfromation: orderId
                        }]
                        // userId: req.decodedData.id
                    },
                    include: [{
                        model: OrderStatusType,
                        as: 'orderStatus'
                    }]
                })
                let multiExist = await Order.findAll({
                    where: {
                        OtherInfromation: orderId
                    }
                })
                if (multiExist.length > 1)
                    return response(res, 422, "Invalid track number")

            }
            if (!order)
                return response(res, 422, "Invalid track number")


            let params = {
                Orderid: order.Order_id
            }

            let items = await OrderItem.findAll({
                where: params,
                include: [{
                    model: OrderStatusType,
                    as: "Itemstatus",
                    attributes: ['id', 'name']
                }],
                order: [
                    ['id', 'ASC']
                ]

            });
            for (let i = 0; i < items.length; i++) {
                // items[i].dataValues.userId = order.userId
                // items[i].dataValues.vendorId = order.vendorId
                items[i].dataValues.orderedItemsStatus = await OrderedItemsStatus.findAll({
                    where: {
                        ItemId: items[i].Itemid
                    },
                    include: [{
                        model: OrderStatusType,
                        as: "statusType",
                        attributes: ['id', 'name']
                    }, {
                        model: OrderItemStatusRemark,
                        as: "statusRemark"
                    }],
                    attributes: ['id', 'ItemId', 'StatusType', 'ExcelRemarks', 'DelayReason', 'DeliveredAt', 'PODUrl', 'createdAt', 'updatedAt']
                })
            }


            let count = await OrderItem.count({ where: params })
            let data = {
                details: {
                    createdAt: order.createdAt,
                    updatedAt: order.updatedAt,
                    orderId: order.Order_id,
                    ETA: order.ExpectedDelivery,
                    status: order.orderStatus.name
                },
                list: items,
                count: count
            }
            return success(res, ORDER_CONSTANTS.ORDER_ITEM, data)
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    createOrderIdForPaymentGateway: async (req, res) => {
        try {
            const validate = new Validator(req.body, {
                totalAmount: "required"
            });

            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            let request = req.body
            let user = await User.findOne({
                where: {
                    id: req.decodedData.id
                }
            })
            if (!user)
                return response(res, 422, USER_CONSTANTS.USER_NOT_FOUND)
            // if (!user.isUser)
            // return response(res, 422, ORDER_CONSTANTS.ORDER_DENIED)

            let data = {
                paidAmount: request.totalAmount,
                userId: req.decodedData.id,
                user: {
                    name: user.name,
                    mobile: user.mobile,
                    email: user.email
                }
            }
            let razorpayData = await PaymentService.initiatePayment(data)
            return success(res, ORDER_CONSTANTS.RAZORPAY_ORDER_ID, { gatewayOrderId: razorpayData.id, amount: razorpayData.amount, currency: razorpayData.currency })
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    submitOrderRatingAndReview: async (req, res) => {
        try {
            let request = req.body
            const validate = new Validator(request, {
                orderId: "required",
                vendorId: "required",
                rating: "required|min:1|max:5",
                reviewType: "required",
                reviewDesc: "nullable"
            });
            console.log(req.decodedData.id);
            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            if (!await OrderReviewType.findOne({
                where: {
                    id: request.reviewType,

                }
            }))
                return response(res, 422, 'Invalid review type')
            let order = await Order.findOne({
                where: {
                    Order_id: request.orderId,
                    userId: req.decodedData.id,
                    vendorId: request.vendorId
                }
            })
            if (!order)
                return response(res, 422, "Invalid order id")
            let reviewExist = await OrderReview.findOne({
                where: {
                    Orderid: request.orderId,
                    userId: req.decodedData.id,
                    vendorId: request.vendorId
                }
            })
            if (reviewExist) {
                if (reviewExist.isApproved)
                    return response(res, 422, "Submission not allowed")

                await OrderReview.update({
                    OrderRating: request.rating,
                    ReviewDesc: request.reviewDesc ? request.reviewDesc : "",
                    ReviewType: request.reviewType
                }, {
                    where: {
                        Orderid: request.orderId,
                        userId: req.decodedData.id,
                        vendorId: request.vendorId
                    }
                })

            } else {
                await OrderReview.create({
                    Orderid: request.orderId,
                    OrderRating: request.rating,
                    ReviewDesc: request.reviewDesc ? request.reviewDesc : "",
                    ReviewType: request.reviewType,
                    userId: req.decodedData.id,
                    vendorId: request.vendorId,
                    isApproved: 0,
                })
            }
            await Order.update({
                rating: request.rating
            }, {
                where: {
                    Order_id: request.orderId,
                    userId: req.decodedData.id,
                    vendorId: request.vendorId
                }
            })
            // let user = await User.findOne({
            //     where: {
            //         id: request.vendorId
            //     }
            // })
            // let rating = user.rating && user.rating > 0 ? ((parseFloat(user.rating) + parseFloat(request.rating)) / 2).toFixed(1) : parseFloat(request.rating)
            // await User.update({ rating: rating }, {
            //     where: {
            //         id: request.vendorId
            //     }
            // })
            return success(res, 'Rating & review submitted')
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    ReviewAndRatingDetails: async (req, res) => {
        try {
            let request = req.query;
            const validate = new Validator(request, {
                orderId: "required"
            });

            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            let order = await Order.findOne({
                where: {
                    Order_id: request.orderId,
                    userId: req.decodedData.id
                },
                include: [{
                    model: OrderStatusType,
                    as: "orderStatus"
                }],
                attributes: ['Order_id', 'vendorId', 'vendorOldId', 'id', 'createdAt', 'Frompincode', 'Topincode', 'taxableAmount', 'gst_Amount', 'totalAmount', 'ExpectedDelivery', 'rating']
            })
            if (!order)
                return response(res, 422, "Invalid order id")
            let review = await OrderReview.findOne({
                where: {
                    Orderid: request.orderId
                },
                include: [{
                    model: OrderReviewType,
                    as: "reviewtype"
                }]
            })
            let vendor = await User.findOne({
                where: {
                    [Op.or]: [{
                        id: order.vendorOldId
                    }]
                },
                attributes: ['id', 'name', 'image']
            })
            order.dataValues.status = order.orderStatus.name
            let data = {
                orderDetail: order,
                vendor: vendor,
                review: review
            }
            return success(res, "Review details", data)
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    exportOrder: async (req, res) => {
        try {
            let order = await Order.findAll({
                where: {
                    userId: req.decodedData.id,
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
                    TaxableAmount: parseFloat(order[i].taxableAmount).toFixed(2),
                    GSTAmount: parseFloat(order[i].gst_Amount).toFixed(2),
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
    paymentHistory: async (req, res) => {
        try {
            let {
                search,
                status,
                page = 1,
                limit = 10,
                fromDate = null,
                toDate = null,
                column = 'createdAt',
                operator = 'equals',
                value,
                sortBy = 'DESC',
                sortByColumn = 'createdAt'
            } = req.query;
            page = parseInt(page);
            limit = parseInt(limit);
            const offset = (page - 1) * limit;
            let params = {
                userId: req.decodedData.id,
                status: {
                    [Op.ne]: 'Initiated'
                }

            }
            let fields = ['paymentType', 'billingType', 'totalAmount', 'taxableAmount', 'createdAt', 'status']
            if (fields.includes(sortByColumn)) {
                sortByColumn = sortByColumn
                sortBy = sortBy ? sortBy : 'DESC'
            } else {
                sortByColumn = 'createdAt'
                if (sortBy == '' || sortBy == null)
                    sortBy = 'DESC'
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
            if (status) {
                if (status == 'Pending') {
                    params = Object.assign(params, {
                        paymentType: {
                            [Op.eq]: "Paylater"
                        }
                    })

                } else {
                    params = Object.assign(params, {
                        paymentType: {
                            [Op.or]: [{
                                [Op.eq]: "Wallet"
                            }, {
                                [Op.eq]: "Online"
                            }]
                        }
                    })
                }
            }
            if (fromDate) {
                fromDate = moment(fromDate).format('YYYY-MM-DD')
                params.createdAt = {
                    [Op.gte]: fromDate
                }
            }
            if (toDate) {
                toDate = moment(toDate).format('YYYY-MM-DD')
                params.createdAt = {
                    [Op.lte]: toDate
                }
            }
            if (fields.includes(column) && value) {
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
                    // {
                    //     Topincode: { [Op.like]: `%${search}%` }
                    // },
                    // {
                    //     Frompincode: { [Op.like]: `%${search}%` }
                    // },
                    // {
                    //     Customername: { [Op.like]: `%${search}%` }
                    // },
                    // {
                    //     iteminvoice: { [Op.like]: `%${search}%` }
                    // },
                    {
                        orderId: { [Op.like]: `%${search}%` }
                    }

                ];
            }
            let list = await Payment.findAll({
                where: params,
                attributes: [
                    "id",
                    "userId",
                    "vendorId",
                    "vendorOldId",
                    "paymentType",
                    "billingType",
                    "creditLimit",
                    "availableLimit",
                    "utilizedLimit",
                    "totalAmount",
                    "transactionId",
                    "orderId",
                    "refundDate",
                    "refundAmount",
                    "status",
                    "isResetCredit",
                    "deletedAt",
                    "walletId",
                    "walletTransactionId",
                    "taxableAmount",
                    "createdAt",
                    "updatedAt",
                    [literal(`'MVikas'`), 'paymentTo']
                ],
                include: [
                    {
                        model: User, as: "Vendor", attributes: ['id', 'name', 'mobile']

                    },
                    {
                        model: User,
                        as: 'vendorold',
                        attributes: ['id', 'name', 'email', 'mobile']
                    }],
                limit,
                offset,
                order: [
                    [sortByColumn, sortBy]
                ]
            });
            let count = await Payment.count({ where: params })
            let data = {
                list: list,
                count: count,
                limit: limit
            }
            return success(res, 'Payment', data)
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    exportPayment: async (req, res) => {
        try {
            let list = await Payment.findAll({
                where: {
                    userId: req.decodedData.id,
                    status: {
                        [Op.ne]: 'Initiated'
                    }
                },
                include: [{ model: User, as: 'vendorold', attributes: ['id', 'name'] }]
            })
            // Define header as a simple array of strings
            let headers = [
                'Type',
                'Payment Date',
                'Payment To',
                'Service From',
                'Taxable Amount',
                'Total Amount',
                'Status'
            ];

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Payment');
            // Add headers to the worksheet
            worksheet.columns = headers.map(header => ({ header, key: header }));

            // Add data rows
            list.forEach(o => {
                worksheet.addRow({
                    'Type': o.paymentType,
                    'Payment Date': o.createdAt,
                    'Payment To': 'Mvikas',
                    'Service From': o.vendorold && o.vendorold.name ? o.vendorold.name : "",
                    'Taxable Amount': o.taxableAmount,
                    'Total Amount': o.totalAmount,
                    'Status': o.status
                });
            });

            // Write the workbook to the response
            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                'attachment; filename=' + 'Payment.xlsx'
            );

            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    paymentInvoice: async (req, res) => {
        try {
            // Validate the request
            const validate = new Validator(req.query, {
                orderId: "required"
            });

            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            let payment = await Payment.findOne({ where: { id: req.query.orderId } })
            let order = await Order.findOne({ where: { PaymentId: payment.id } })
            if (!order)
                return response(res, 422, "No data found")
            let items = await OrderItem.count({
                where: {
                    Orderid: order.Order_id
                }
            })
            let user = await User.findOne({
                where: {
                    id: order.userId
                }
            })
            let masterDocketURL = ""

            let htmlContent;
            try {
                htmlContent = fs.readFileSync("views/mvload/userpaymentinvoice.ejs", "utf-8");
            } catch (err) {
                console.error("Error reading EJS template file:", err);
                return response(res, 422, "Something went wrong")

            }
            const dynamicData = {
                customerName: order.Customername,
                customerGST: user.GSTNo ? user.GSTNo : 'N/A',
                invoiceDate: moment(order.createdAt).format("YYYY-MM-DD"),
                invoiceNumber: order.invoiceNumber,
                billingAddress: user.billingAddressLine1 && user.billingAddressLine2 ? `${user.billingAddressLine1}, ${user.billingAddressLine2}, ${user.billingAddressCity}, ${user.billingAddressState}, ${user.billingAddressCountry}, ${user.billingAddressPincode}` : "N/A",
                pickupAddress: order.Pickupaddress,
                shippingAddress: order.deliveryaddress,
                itemName: order.Itemname,
                quantity: items,
                rate: order.rate,
                taxableAmount: order.taxableAmount,
                gstAmount: order.gst_Amount,
                gst: order.gst,
                totalAmount: order.totalAmount,
                totalAmountInWord: await numberToword.numberToWords(parseFloat(order.totalAmount)),
                bankName: "",
                IFSC: "",
                accountNumber: ""
            };

            const compiledHtml = ejs.render(htmlContent, dynamicData);
            const options = { format: "A4" };

            // Generate PDF
            try {
                const pdfBuffer = await pdf.generatePdf(
                    { content: compiledHtml },
                    options
                );

                // Upload PDF to S3
                const pdfFile = await uploadPdfToS3(pdfBuffer, "pdf", `paymentinvoice_${order.Order_id}`);
                masterDocketURL = pdfFile.url
                // Respond with the S3 URL of the uploaded PDF
                // await Order.update({ masterDocketURL: masterDocketURL }, {
                //     where: {
                //         id: order.id
                //     }
                // })

            } catch (error) {
                console.error("PDF generation or S3 upload failed:", error);
                return serverError(res, SYSTEM_FAILURE);
            }


            return success(res, "Success", { url: masterDocketURL });

        } catch (error) {
            console.log("error---------------", error)
            // req.logger.error(error)
            return failed(res, SYSTEM_FAILURE);
        }
    },
    downloadMasterDocket: async (req, res) => {
        try {
            // Validate the request
            const validate = new Validator(req.query, {
                orderId: "required"
            });

            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            let order = await Order.findOne({ where: { id: req.query.orderId } })
            if (!order)
                return response(res, 422, "No data found")
            let items = await OrderItem.count({
                where: {
                    Orderid: order.Order_id
                }
            })
            let user = await User.findOne({
                where: {
                    id: order.userId
                }
            })
            let masterDocketURL = ""
            if (masterDocketURL) {
                masterDocketURL = order.masterDocketURL
            } else {
                let htmlContent;
                try {
                    htmlContent = fs.readFileSync("views/mvload/masterDocket.ejs", "utf-8");
                } catch (err) {
                    console.error("Error reading EJS template file:", err);
                    return response(res, 422, "Something went wrong")

                }
                let trackurl = `${process.env.TRACK_ORDER_URL}?id=${order.Order_id}`
                let qrData = await generateQr(trackurl, 'orderTrack')
                const dynamicData = {
                    consignorName: order.Pickuppersonname,
                    consignorAddress: order.Pickupaddress,
                    Frompincode: order.Frompincode,
                    consignorMobile: order.Pickuppersonmobile,
                    OrderId: order.Order_id,
                    bookingDate: moment(order.createdAt).format("Do MMM YY"),
                    invoiceDate: moment(order.createdAt).format("Do MMM YY"),
                    shipmentWeight: parseFloat(order.Shipment_weight).toFixed(2),
                    shipmentValue: parseFloat(order.Shipment_value).toFixed(2),
                    consigneeName: order.deliverypersonname,
                    consigneeAddress: order.deliveryaddress,
                    toPinCode: order.Topincode,
                    consigneeMobile: order.deliverypersonmobile,
                    deliveryDate: moment(order.deliveryDate).format("Do MMM YY"),
                    noOfBox: items,
                    qr: qrData,
                    GSTIN: user && user.GSTNo ? user.GSTNo : "N/A",
                    EWAY: order.EWayBillNo ? order.EWayBillNo : "N/A",
                    invoiceNumber: order.invoiceNumber ? order.invoiceNumber : "N/A",
                    iteminvoice: order.iteminvoice ? order.iteminvoice : "N/A"

                };

                const compiledHtml = ejs.render(htmlContent, dynamicData);
                const options = { format: "A4" };

                // Generate PDF
                try {
                    const pdfBuffer = await pdf.generatePdf(
                        { content: compiledHtml },
                        options
                    );

                    // Upload PDF to S3
                    const pdfFile = await uploadPdfToS3(pdfBuffer, "pdf", `masterDocket_${order.Order_id}`);
                    masterDocketURL = pdfFile.url
                    // Respond with the S3 URL of the uploaded PDF
                    await Order.update({ masterDocketURL: masterDocketURL }, {
                        where: {
                            id: order.id
                        }
                    })

                } catch (error) {
                    console.error("PDF generation or S3 upload failed:", error);
                    return serverError(res, SYSTEM_FAILURE);
                }
            }

            return success(res, "Success", { url: masterDocketURL });

        } catch (error) {
            console.log("error---------------", error)
            // req.logger.error(error)
            return failed(res, SYSTEM_FAILURE);
        }
    },
    downloadDocket: async (req, res) => {
        try {
            // Validate the request
            const validate = new Validator(req.query, {
                orderId: "required"
            });

            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            let order = await Order.findOne({ where: { id: req.query.orderId } })
            if (!order)
                return response(res, 422, "No data found")
            let items = await OrderItem.findAll({
                where: {
                    Orderid: order.Order_id
                }
            })
            let docketURL = ""
            if (docketURL) {
                docketURL = order.docketURL
            } else {
                // try {
                //     htmlContent = fs.readFileSync("views/mvload/masterDocket.ejs", "utf-8");
                // } catch (err) {
                //     console.error("Error reading EJS template file:", err);
                //     return response(res, 422, "Something went wrong")

                // }
                // const dynamicData = {
                //     consignorName: order.Pickuppersonname,
                //     consignorAddress: order.Pickupaddress,
                //     Frompincode: order.Frompincode,
                //     consignorMobile: order.Pickuppersonmobile,
                //     OrderId: order.Order_id,
                //     bookingDate: moment(order.createdAt).format("Do MMM YY"),
                //     invoiceDate: moment(order.createdAt).format("Do MMM YY"),
                //     shipmentWeight: parseFloat(order.Shipment_weight).toFixed(2),
                //     shipmentValue: parseFloat(order.Shipment_value).toFixed(2),
                //     consigneeName: order.deliverypersonname,
                //     consigneeAddress: order.deliveryaddress,
                //     toPinCode: order.Topincode,
                //     consigneeMobile: order.deliverypersonmobile,
                //     deliveryDate: moment(order.deliveryDate).format("Do MMM YY")
                // };

                // const compiledHtml = ejs.render(htmlContent, dynamicData);
                // const options = { format: "A4" };
                let htmlContent;
                try {
                    htmlContent = fs.readFileSync("views/mvload/customerDocket.ejs", "utf-8");
                } catch (err) {
                    console.error("Error reading EJS template file:", err);
                    return response(res, 422, "Something went wrong");
                }

                let user = await User.findOne({
                    where: {
                        id: order.userId
                    }
                })
                // Array to hold the compiled HTML for all orders
                let compiledHtmlArray = [];
                let trackurl = `${process.env.TRACK_ORDER_URL}?id=${order.Order_id}`
                let qrData = await generateQr(trackurl, 'orderTrack')
                items.forEach((item, index) => {
                    const dynamicData = {
                        consignorName: order.Pickuppersonname,
                        consignorAddress: order.Pickupaddress,
                        Frompincode: order.Frompincode,
                        consignorMobile: order.Pickuppersonmobile,
                        OrderId: order.Order_id,
                        bookingDate: moment(order.createdAt).format("Do MMM YY"),
                        invoiceDate: moment(order.createdAt).format("Do MMM YY"),
                        shipmentWeight: parseFloat(order.Shipment_weight).toFixed(2),
                        shipmentValue: parseFloat(order.Shipment_value).toFixed(2),
                        consigneeName: order.deliverypersonname,
                        consigneeAddress: order.deliveryaddress,
                        toPinCode: order.Topincode,
                        consigneeMobile: order.deliverypersonmobile,
                        deliveryDate: moment(order.deliveryDate).format("Do MMM YY"),
                        noOfBox: items.length,
                        itemNo: index + 1,
                        chargableWeight: parseFloat(order.chargable_weight).toFixed(2),
                        itemId: item.Itemid,
                        qr: qrData,
                        GSTIN: user && user.GSTNo ? user.GSTNo : "N/A",
                        EWAY: order.EWayBillNo ? order.EWayBillNo : "N/A",
                        invoiceNumber: order.invoiceNumber ? order.invoiceNumber : "N/A",
                        iteminvoice: order.iteminvoice ? order.iteminvoice : "N/A"

                    };

                    // Render the HTML for each order
                    const compiledHtml = ejs.render(htmlContent, dynamicData);

                    // Add compiled HTML to array, along with a page break after each item
                    compiledHtmlArray.push(compiledHtml + '<div style="page-break-after: always;"></div>');
                });

                // Join all the HTML content into one
                const completeHtml = compiledHtmlArray.join("");

                // PDF options
                const options = { format: "A4" };

                // Generate PDF
                try {
                    const pdfBuffer = await pdf.generatePdf(
                        { content: compiledHtmlArray },
                        options
                    );

                    // Upload PDF to S3
                    const pdfFile = await uploadPdfToS3(pdfBuffer, "pdf", `Docket_${order.Order_id}`);
                    docketURL = pdfFile.url
                    // Respond with the S3 URL of the uploaded PDF
                    await Order.update({ docketURL: docketURL }, {
                        where: {
                            id: order.id
                        }
                    })

                } catch (error) {
                    console.error("PDF generation or S3 upload failed:", error);
                    return serverError(res, SYSTEM_FAILURE);
                }
            }

            return success(res, "Success", { url: docketURL });

        } catch (error) {
            console.log("error---------------", error)
            // req.logger.error(error)
            return failed(res, SYSTEM_FAILURE);
        }
    },
    downloadOrderItemLabel: async (req, res) => {
        try {
            // Validate the request
            const validate = new Validator(req.query, {
                orderId: "required",
                itemId: "required"
            });

            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            let order = await Order.findOne({ where: { id: req.query.orderId } })
            if (!order)
                return response(res, 422, "No data found")
            let item = await OrderItem.findOne({
                where: {
                    id: req.query.itemId
                }
            })
            if (!item)
                return response(res, 422, "No data found")
            let items = await OrderItem.findAll({
                where: {
                    Orderid: order.Order_id
                }
            })
            let labelURL = ""
            if (order.labelURL) {
                labelURL = order.labelURL
            } else {
                let htmlContent;
                try {
                    htmlContent = fs.readFileSync("views/mvload/orderItemLabel.ejs", "utf-8");
                } catch (err) {
                    console.error("Error reading EJS template file:", err);
                    return response(res, 422, "Something went wrong")

                }
                let trackurl = `${process.env.TRACK_ORDER_URL}?id=${order.Order_id}`
                let qrData = await generateQr(trackurl, 'orderTrack')
                let itemIndex = items.findIndex(item => item.Itemid == item.Itemid)
                const dynamicData = {
                    consignorName: order.Pickuppersonname,
                    consignorAddress: order.Pickupaddress,
                    Frompincode: order.Frompincode,
                    consignorMobile: order.Pickuppersonmobile,
                    OrderId: order.Order_id,
                    bookingDate: moment(order.createdAt).format("Do MMM YY"),
                    invoiceDate: moment(order.createdAt).format("Do MMM YY"),
                    shipmentWeight: parseFloat(order.Shipment_weight).toFixed(2),
                    shipmentValue: parseFloat(order.Shipment_value).toFixed(2),
                    consigneeName: order.deliverypersonname,
                    consigneeAddress: order.deliveryaddress,
                    toPinCode: order.Topincode,
                    consigneeMobile: order.deliverypersonmobile,
                    deliveryDate: moment(order.deliveryDate).format("Do MMM YY"),
                    docketNumber: order.MvikasDocketNo,
                    itemId: item.Itemid,
                    itemL: item.Length,
                    itemB: item.Breadth,
                    itemH: item.Height,
                    itemName: order.Itemname,
                    itemType: order.ItemType,
                    itemCategory: order.ItemCategory,
                    returnAddress: order.returnaddress,
                    totalItem: items.length,
                    itemNumber: itemIndex + 1,
                    qr: qrData
                };

                const compiledHtml = ejs.render(htmlContent, dynamicData);
                const options = { format: "A4" };

                // Generate PDF
                try {
                    const pdfBuffer = await pdf.generatePdf(
                        { content: compiledHtml },
                        options
                    );

                    // Upload PDF to S3
                    const pdfFile = await uploadPdfToS3(pdfBuffer, "pdf", `itemlabel_${order.Order_id}`);
                    labelURL = pdfFile.url
                    // Respond with the S3 URL of the uploaded PDF
                    await OrderItem.update({ labelURL: labelURL }, {
                        where: {
                            id: item.id
                        }
                    })

                } catch (error) {
                    console.error("PDF generation or S3 upload failed:", error);
                    return serverError(res, SYSTEM_FAILURE);
                }
            }

            return success(res, "Success", { url: labelURL });

        } catch (error) {
            console.log("error---------------", error)
            // req.logger.error(error)
            return failed(res, SYSTEM_FAILURE);
        }
    },
    webhookHandler: async (req, res) => {
        try {
            const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
            const requestData = req.body;
            const razorpayEvent = requestData.event;
            const razorpayOrderDetails = requestData?.payload?.payment?.entity
            const razorpayOrderMetadata = razorpayOrderDetails?.notes;
            console.log(razorpayOrderDetails, "razor pay");
            // Verify webhook signature
            const hmac = crypto.createHmac('sha256', secret);
            hmac.update(JSON.stringify(requestData));
            const generatedSignature = hmac.digest('hex');
            const incomingSignature = req.headers['x-razorpay-signature'];
            if (generatedSignature !== incomingSignature) {
                console.log({ message: "Invalid signature", data: requestData })
                // req.logger.error({ message: "Invalid signature", data: requestData })
                throw new Error('Invalid signature');
            }

            // Save webhook data to database
            requestData.payload = JSON.stringify(requestData.payload)
            await PaymentService.updateBookingTransactionOrderStatus(
                razorpayOrderMetadata,
                razorpayOrderDetails
            )
            return res.status(200).json({ success: true });
        } catch (error) {
            console.log("error---------------", error)
            // req.logger.error(error)
            return failed(res, SYSTEM_FAILURE);
        }
    },
    refundWebhookHandler: async (req, res) => {
        try {
            console.log("req.body---------", req.body)
            const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
            const requestData = req.body;
            const razorpayEvent = requestData.event;
            const razorpayOrderDetails = requestData?.payload?.payment?.entity
            const razorpayOrderMetadata = razorpayOrderDetails?.notes;
            // Razorpay sends the signature in 'x-razorpay-signature' header
            const razorpaySignature = req.headers['x-razorpay-signature'];

            // The payload sent by Razorpay
            const payload = JSON.stringify(req.body);

            // Generate the expected signature using the secret
            const hmac = crypto.createHmac('sha256', secret);
            hmac.update(payload);
            const expectedSignature = hmac.digest('hex');
            console.log("Received event:", razorpayEvent);
            console.log("Razorpay order details:", razorpayOrderDetails);
            console.log("Razorpay razorpayOrderMetadata:", razorpayOrderMetadata);

            if (expectedSignature !== razorpaySignature) {
                req.logger.error({ message: "Invalid signature", data: requestData })
                throw new Error('Invalid signature');
            }

            // Save webhook data to database
            requestData.payload = JSON.stringify(requestData.payload)

            await PaymentService.updateRefundTransactionStatus(
                razorpayOrderMetadata,
                razorpayOrderDetails
            )
            return res.status(200).json({ success: true });
        } catch (error) {
            console.log(error);
            return failed(res, SYSTEM_FAILURE);

        }

    },
    getAdditionalServiceCharge: async (req, res) => {
        try {
            let request = req.body;
            // Validate the request
            const validate = new Validator(request, {
                cargoId: "required",
                taxableAmount: "required",
                box: "required",
                chargableWeight: "required",
                chargeType: "required|in:floor,mallCharge,sundayCharge,csdCharge,appointmentCharge",
                floor: "requiredIf:chargeType,floor"

            });
            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            let cargoRate = await CargoRate.findOne({
                where: {
                    id: request.cargoId
                }
            })
            if (!cargoRate)
                return response(res, 422, 'Invalid cargo rate');
            let charge = 0
            if (request.chargeType == 'floor') {
                let floorExist = cargoRate.floorCharge
                if (floorExist) {
                    floorExist = JSON.parse(floorExist)
                    const exist = floorExist.find(floor => floor.floorName === request.floor);
                    if (exist) {
                        let perBoxCharge = parseFloat(request.box) * parseFloat(exist.charge)
                        charge = perBoxCharge > parseFloat(exist.minCharge) ? perBoxCharge : parseFloat(exist.minCharge)
                    }

                }
            }
            else if (request.chargeType == 'mallCharge') {
                charge = cargoRate.mallCharge ? parseFloat(cargoRate.mallCharge) : 0
            }
            else if (request.chargeType == 'sundayCharge') {
                charge = cargoRate.sundayCharge ? parseFloat(cargoRate.sundayCharge) : 0
            } else if (request.chargeType == 'csdCharge') {
                charge = cargoRate.csdCharge ? parseFloat(cargoRate.csdCharge) : 0
            } else if (request.chargeType == 'appointmentCharge') {
                charge = cargoRate.appointmentCharge ? parseFloat(request.chargableWeight) * parseFloat(cargoRate.appointmentCharge) : 0
                charge = charge > parseFloat(cargoRate.appointmentMin) ? charge : parseFloat(cargoRate.appointmentMin)
            }
            let data = {
                taxableAmount: parseFloat(taxableAmount) + parseFloat(charge),
                charge: charge,
                totalAmount: parseFloat(taxableAmount) + ((parseFloat(taxableAmount) * parse(cargoRate.gst)) / 100)
            }
            return success(res, 'data', data)
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    }
}