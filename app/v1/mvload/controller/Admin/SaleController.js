const {
  success,
  failed,
  serverError,
  validateFail,
  response,
} = require("../../../../helper/response");

const {
  SYSTEM_FAILURE,
  ORDER_CONSTANTS,
} = require("../../../../helper/message");
const db = require("../../../../../models");
const _ = require("lodash");
const Service = db.mvService;
const Associate = db.mvAssociateVendors;
const User = db.mvUser;
const Pincode = db.mvPincode;
const ZonePinMap = db.mvZonePinMap;
const ZoneServiceMap = db.mvZoneServiceMap;
const VendorRate = db.mvRates;
const Order = db.mvorder;
const OrderItemDimension = db.mvOrderDimension;
const OrderItem = db.mvOrderItem;
const OrderItemStatus = db.mvOrderedItemStatus;
const OrderedItemsStatus = db.mvOrderedItemStatus;
const OrderStatusType = db.mvOrderStatusType;
const UserAccountDetails = db.mvAccountDetails;
const OdaTat = db.mvOdaTat;
const CargoRate = db.mvCargoRates;
const VendorSetting = db.mvVendorSetting;
const OrderSpecialCharge = db.mvOrderSpecialCharge;
const OrderItemStatusRemark = db.mvOrderStatusRemark;
const OrderWeightReconcilation = db.mvOrderWeightReconcilation;

const moment = require("moment");
const ExcelJS = require("exceljs");
const fs = require("fs");
const pdf = require("html-pdf-node");
const ejs = require("ejs");
const { uploadPdfToS3 } = require("../../../../helper/aws");
const { Validator } = require("node-input-validator");
const AdminHelper = require("../../../../helper/getAdminData");
const RatePerKgPerBoxServiceList = require("../../../../helper/ratePerKgPerBoxServiceList");
const { fn, col, Op, where, literal } = require("sequelize");
const { aws } = require("../../../../helper/aws");
const numberToword = require("../../../../helper/numberToWord");
const XLSXDownloader = require("../../Service/XLSXDownloader");
const NotificationHelper = require("../../../../helper/notification");
const CalculativeHelper = require("../../../../helper/calculativeFixedCalculation");

module.exports = {
  getSalesReport: async (req, res) => {
    try {
      let {
        search,
        status,
        page = 1,
        limit = 10,
        fromDate = null,
        toDate = null,
        column = "Order_id",
        operator = "equals",
        value,
        sortBy = "DESC",
        sortByColumn = "createdAt",
        days = null,
      } = req.query;
      page = parseInt(page);
      limit = parseInt(limit);
      const offset = (page - 1) * limit;
      let params = {
        paymentStatus: {
          [Op.ne]: "Initiated",
        },
      };
      let adminData = await AdminHelper.getAdminRole(req.decodedData.id);
      if (adminData.role == "kam") {
        params = Object.assign(params, {
          [Op.or]: [
            {
              userId: {
                [Op.in]: adminData.users,
              },
            },
            {
              kamId: req.decodedData.id,
            },
          ],
        });
      }

      if (status) {
        params.latestStatus = status;
      }
      if (days) {
        const date = new Date();
        date.setDate(date.getDate() - parseInt(days));
        params = Object.assign(params, {
          createdAt: { [Op.gte]: date },
        });
      }
      if (fromDate && fromDate != "null" && toDate == "null") {
        params = Object.assign(params, {
          createdAt: {
            [Op.gte]: fromDate + " 00:00:00",
          },
        });
      }
      if (toDate && toDate != "null" && fromDate == "null") {
        params = Object.assign(params, {
          createdAt: {
            [Op.lte]: toDate + " 00:00:00",
          },
        });
      }
      if (fromDate && fromDate != "null" && toDate && toDate != "null") {
        params = Object.assign(params, {
          [Op.and]: [
            {
              createdAt: {
                [Op.gte]: fromDate + " 00:00:00",
              },
            },
            {
              createdAt: {
                [Op.lte]: toDate + " 23:59:00",
              },
            },
          ],
        });
      }
      if (value) {
        switch (operator) {
          case "contains":
            params[column] = { [Op.like]: `%${value}%` };
            break;
          case "equals":
            params[column] = { [Op.eq]: value };
            break;
          case "starts with":
            params[column] = { [Op.like]: `${value}%` };
            break;
          case "ends with":
            params[column] = { [Op.like]: `%${value}` };
            break;
          case "is empty":
            params[column] = { [Op.eq]: null };
            break;
          case "is not empty":
            params[column] = { [Op.ne]: null };
            break;
          case "is any of":
            params[column] = { [Op.in]: value.split(",") };
            break;
          default:
            params[column] = { [Op.eq]: value };
        }
      }
      if (search) {
        // Use Op.or to search in multiple fields
        params[Op.or] = [
          {
            Topincode: { [Op.like]: `%${search}%` },
          },
          {
            Frompincode: { [Op.like]: `%${search}%` },
          },
          {
            Customername: { [Op.like]: `%${search}%` },
          },
          {
            iteminvoice: { [Op.like]: `%${search}%` },
          },
          {
            Order_id: { [Op.like]: `%${search}%` },
          },
          {
            invoiceNumber: { [Op.like]: `%${search}%` },
          },
        ];
      }
      let orders = await Order.findAll({
        include: [
          {
            model: OrderStatusType,
            as: "latestorderstatus",
          },
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email", "mobile"],
          },
          {
            model: User,
            as: "vendor",
            attributes: ["id", "name", "email", "mobile"],
          },
          {
            model: User,
            as: "kam",
            attributes: ["id", "name", "email", "mobile"],
          },
          {
            model: OrderSpecialCharge,
          },
          {
            model: OrderWeightReconcilation,
            as: "weightReconcilation",
            required: false,
          },
        ],
        where: params,
        limit,
        offset,
        order: [[sortByColumn, sortBy]],
      });

      const seenIds = new Set();
      const uniqueLeads = [];

      // Loop through the leads and add only unique ones
      for (const order of orders) {
        if (!seenIds.has(order.id)) {
          seenIds.add(order.id);
          uniqueLeads.push(order);
        }
      }
      let count = await Order.count({
        include: [
          {
            model: OrderStatusType,
            as: "latestorderstatus",
          },
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email", "mobile"],
          },
          {
            model: User,
            as: "vendor",
            attributes: ["id", "name", "email", "mobile"],
          },
          {
            model: User,
            as: "kam",
            attributes: ["id", "name", "email", "mobile"],
          },
        ],
        where: params,
      });
      // for (let order of orders) {
      //   order.dataValues.articles = await OrderItem.count({
      //     where: { Orderid: order.Order_id },
      //   });
      // }

      for (let order of uniqueLeads) {
        order.dataValues.articles = await OrderItem.count({
          where: { Orderid: order.Order_id },
        });
      }
      let data = {
        list: uniqueLeads,
        count: count,
        limit: limit,
      };
      return success(res, "Sales report", data);
    } catch (error) {
      console.error(SYSTEM_FAILURE, error);
      return failed(res, SYSTEM_FAILURE);
    }
  },
  getSaleSpecialList: async (req, res) => {
    try {
      let {
        search,
        status,
        page = 1,
        limit = 10,
        fromDate = null,
        toDate = null,
        sortBy = "DESC",
        sortByColumn = "createdAt",
        days = null,
        chargeFrom = 1,
      } = req.query;
      page = parseInt(page);
      limit = parseInt(limit);
      const offset = (page - 1) * limit;
      let params = {
        paymentStatus: {
          [Op.ne]: "Initiated",
        },
      };
      let adminData = await AdminHelper.getAdminRole(req.decodedData.id);
      if (adminData.role == "kam") {
        params = Object.assign(params, {
          [Op.or]: [
            {
              userId: {
                [Op.in]: adminData.users,
              },
            },
            {
              kamId: req.decodedData.id,
            },
          ],
        });
      }

      if (status) {
        params.latestStatus = status;
      }
      if (days) {
        const date = new Date();
        date.setDate(date.getDate() - parseInt(days));
        params = Object.assign(params, {
          createdAt: { [Op.gte]: date },
        });
      }
      if (fromDate && fromDate != "null" && toDate == "null") {
        params = Object.assign(params, {
          createdAt: {
            [Op.gte]: fromDate + " 00:00:00",
          },
        });
      }
      if (toDate && toDate != "null" && fromDate == "null") {
        params = Object.assign(params, {
          createdAt: {
            [Op.lte]: toDate + " 00:00:00",
          },
        });
      }
      if (fromDate && fromDate != "null" && toDate && toDate != "null") {
        params = Object.assign(params, {
          [Op.and]: [
            {
              createdAt: {
                [Op.gte]: fromDate + " 00:00:00",
              },
            },
            {
              createdAt: {
                [Op.lte]: toDate + " 23:59:00",
              },
            },
          ],
        });
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
          {
            Customername: { [Op.like]: `%${search}%` },
          },
          // {
          //     iteminvoice: { [Op.like]: `%${search}%` }
          // },
          {
            Order_id: { [Op.like]: `%${search}%` },
          },
          // ,
          // {
          //     invoiceNumber: { [Op.like]: `%${search}%` }

          // }
        ];
      }
      let orders = await Order.findAll({
        include: [
          {
            model: OrderStatusType,
            as: "latestorderstatus",
          },
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email", "mobile"],
          },
          {
            model: User,
            as: "vendor",
            attributes: ["id", "name", "email", "mobile"],
          },
          {
            model: User,
            as: "kam",
            attributes: ["id", "name", "email", "mobile"],
          },
          {
            model: OrderSpecialCharge,
            where: {
              chargeFrom: chargeFrom,
            },
            required: true,
          },
        ],
        where: params,
        limit,
        offset,
        order: [[sortByColumn, sortBy]],
      });
      let count = await Order.count({
        include: [
          {
            model: OrderStatusType,
            as: "latestorderstatus",
          },
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email", "mobile"],
          },
          {
            model: User,
            as: "vendor",
            attributes: ["id", "name", "email", "mobile"],
          },
          {
            model: User,
            as: "kam",
            attributes: ["id", "name", "email", "mobile"],
          },
          {
            model: OrderSpecialCharge,
            where: {
              chargeFrom: chargeFrom,
            },
            required: true,
          },
        ],
        where: params,
      });
      for (let order of orders) {
        order.dataValues.articles = await OrderItem.count({
          where: { Orderid: order.Order_id },
        });
      }
      let data = {
        list: orders,
        count: count,
        limit: limit,
      };
      return success(res, "special charge list", data);
    } catch (error) {
      console.error(SYSTEM_FAILURE, error);
      return failed(res, SYSTEM_FAILURE);
    }
  },
  getOrderDetails: async (req, res) => {
    try {
      // Validate the request
      const validate = new Validator(req.query, {
        orderId: "required",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      let {
        orderId = "",
        page = 1,
        limit = 10,
        column = "Itemid",
        operator = "equals",
        value,
        sortBy = "DESC",
        sortByColumn = "createdAt",
      } = req.query;
      let order = await Order.findOne({
        where: {
          Order_id: orderId,
        },
      });
      if (!order) return response(res, 422, "Invalid order id");
      page = parseInt(page);
      limit = parseInt(limit);
      const offset = (page - 1) * limit;
      let params = {
        Orderid: orderId,
      };
      if (value) {
        switch (operator) {
          case "contains":
            params[column] = { [Op.like]: `%${value}%` };
            break;
          case "equals":
            params[column] = { [Op.eq]: value };
            break;
          case "starts with":
            params[column] = { [Op.like]: `${value}%` };
            break;
          case "ends with":
            params[column] = { [Op.like]: `%${value}` };
            break;
          case "is empty":
            params[column] = { [Op.eq]: null };
            break;
          case "is not empty":
            params[column] = { [Op.ne]: null };
            break;
          case "is any of":
            params[column] = { [Op.in]: value.split(",") };
            break;
          default:
            params[column] = { [Op.eq]: value };
        }
      }

      let items = await OrderItem.findAll({
        where: params,
        include: [
          {
            model: OrderStatusType,
            as: "Itemstatus",
            attributes: ["id", "name"],
          },
        ],
        limit,
        offset,
        order: [[sortByColumn, sortBy]],
      });
      for (let i = 0; i < items.length; i++) {
        items[i].dataValues.userId = order.userId;
        items[i].dataValues.vendorId = order.vendorId;
        items[i].dataValues.podOrderId = order.id;
        items[i].dataValues.orderedItemsStatus =
          await OrderedItemsStatus.findAll({
            where: {
              ItemId: items[i].Itemid,
            },
            include: [
              {
                model: OrderStatusType,
                as: "statusType",
                attributes: ["id", "name"],
              },
            ],
            attributes: [
              "id",
              "ItemId",
              "StatusType",
              "ExcelRemarks",
              "DelayReason",
              "DeliveredAt",
              "PODUrl",
            ],
          });
      }

      let count = await OrderItem.count({ where: params });
      let data = {
        orderStatus: order.latestStatus,
        list: items,
        count: count,
        limit: limit,
      };
      return success(res, ORDER_CONSTANTS.ORDER_ITEM, data);
    } catch (error) {
      console.error(SYSTEM_FAILURE, error);
      return failed(res, SYSTEM_FAILURE);
    }
  },
  // updateOrderItemStatus: async (req, res) => {
  //     try {
  //         let request = req.body
  //         const validate = new Validator(request, {
  //             type: "required|in:single,bulk",
  //             orderId: "required",
  //             itemId: "requiredIf:type,single",
  //             statusType: "required",
  //             userId: "required",
  //             vendorId: "required",
  //             ExcelRemarks: "sometimes",
  //             DelayReason: "nullable"
  //         });
  //         const matched = await validate.check();
  //         if (!matched) {
  //             return validateFail(res, validate);
  //         }
  //         let orderExist = await Order.findOne({
  //             where: {
  //                 Order_id: request.orderId,
  //                 vendorId: request.vendorId,
  //                 userId: request.userId
  //             }
  //         })
  //         if (!orderExist)
  //             return response(res, 422, "Order not found")
  //         let orderStatusType = await OrderStatusType.findOne({
  //             where: {
  //                 id: request.statusType
  //             }
  //         })
  //         if (!orderStatusType)
  //             return response(res, 422, ORDER_CONSTANTS.INVALID_STATUS)
  //         if (request.type == 'single') {
  //             let itemExist = await OrderItem.findOne({
  //                 where: {
  //                     Itemid: request.itemId,
  //                     Orderid: request.orderId
  //                 }
  //             })
  //             if (!itemExist)
  //                 return response(res, 422, "Item not found")
  //             await OrderItem.update({
  //                 ItemStatus: request.statusType,
  //                 status: orderStatusType.name
  //             }, {
  //                 where: {
  //                     Itemid: request.itemId
  //                 }
  //             })
  //             await OrderedItemsStatus.create({
  //                 ItemId: request.itemId,
  //                 OrderId: request.orderId,
  //                 userId: request.userId,
  //                 StatusType: request.statusType,
  //                 status: 1,
  //                 ExcelRemarks: request.ExcelRemarks ? request.ExcelRemarks : orderStatusType.name,
  //                 DelayReason: request.DelayReason ? request.DelayReason : "",
  //                 DeliveredAt: orderStatusType.name == "Delivered" ? new Date() : null

  //             })
  //             const lastestStatus = await OrderItem.findOne({
  //                 where: {
  //                     Itemid: request.itemId
  //                 },
  //                 attributes: [[fn('MAX', col('ItemStatus')), 'latestStatus']]
  //             });
  //             await Order.update({ latestStatus: lastestStatus.latestStatus }, {
  //                 where: {
  //                     Order_id: request.orderId,
  //                     vendorId: orderExist.vendorId,
  //                     userId: orderExist.userId
  //                 }
  //             })
  //         } else {
  //             let items = await OrderItem.findAll({
  //                 where: {
  //                     Orderid: request.orderId
  //                 }
  //             })
  //             if (!items.length)
  //                 return response(res, 422, "Items not found")
  //             let createOrderedItemsStatus = []
  //             for (let i = 0; i < items.length; i++) {
  //                 createOrderedItemsStatus.push({
  //                     ItemId: items[i].Itemid,
  //                     OrderId: request.orderId,
  //                     userId: request.userId,
  //                     StatusType: request.statusType,
  //                     status: 1,
  //                     ExcelRemarks: request.ExcelRemarks ? request.ExcelRemarks : orderStatusType.name,
  //                     DelayReason: request.DelayReason ? request.DelayReason : "",
  //                     DeliveredAt: orderStatusType.name == "Delivered" ? new Date() : null

  //                 })
  //             }
  //             await OrderedItemsStatus.bulkCreate(createOrderedItemsStatus)
  //             await OrderItem.update({
  //                 ItemStatus: request.statusType,
  //                 status: orderStatusType.name
  //             }, {
  //                 where: {
  //                     Orderid: request.orderId
  //                 }
  //             })

  //             await Order.update({ updatedAt: new Date(), latestStatus: request.statusType }, {
  //                 where: {
  //                     Order_id: request.orderId,
  //                     vendorId: orderExist.vendorId,
  //                     userId: orderExist.userId
  //                 }
  //             })

  //         }
  //         let items = await OrderItem.count({
  //             where: {
  //                 Orderid: request.orderId
  //             }
  //         })
  //         let user = await User.findOne({
  //             where:
  //             {
  //                 id: request.userId
  //             },
  //             attributes: ['id', 'mobile', 'email']
  //         })
  //         let bodyValues = [request.orderId, orderStatusType.name, moment(orderExist.createdAt).format('DD MM YYYY'), items, orderExist.deliveryaddress, '', moment(orderExist.ExpectedDelivery).format('DD MM YYYY'), orderExist.MvikasDocketNo, orderExist.invoiceNumber, orderExist.deliverypersonname]
  //         await NotificationHelper.createOrderUpdateNotification(user.email, request.orderId, req.decodedData.id, request.userId, request.statusType, bodyValues, `91${user.mobile}`, [process.env.MSG91_BUTTON_URL])

  //         return success(res, ORDER_CONSTANTS.STATUS_CHANGED)
  //     } catch (error) {
  //         console.error(SYSTEM_FAILURE, error);
  //         return failed(res, SYSTEM_FAILURE);
  //     }
  // },
  updateOrderItemStatus: async (req, res) => {
    try {
      let request = req.body;
      const validate = new Validator(request, {
        type: "required|in:single,bulk",
        orderId: "required",
        itemId: "requiredIf:type,single",
        statusType: "required",
        userId: "required",
        vendorId: "required",
        ExcelRemarks: "sometimes",
        DelayReason: "nullable",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      let orderExist = await Order.findOne({
        where: {
          Order_id: request.orderId,
          vendorId: request.vendorId,
          userId: request.userId,
        },
      });
      if (!orderExist) return response(res, 422, "Order not found");
      let orderStatusType = await OrderStatusType.findOne({
        where: {
          id: request.statusType,
        },
      });
      if (!orderStatusType)
        return response(res, 422, ORDER_CONSTANTS.INVALID_STATUS);
      if (request.type == "single") {
        let itemExist = await OrderItem.findOne({
          where: {
            Itemid: request.itemId,
            Orderid: request.orderId,
          },
        });
        if (!itemExist) return response(res, 422, "Item not found");

        if (parseInt(request.statusType) < parseInt(itemExist.ItemStatus))
          return response(res, 422, "You can't revert back");
        if (parseInt(request.statusType) == parseInt(itemExist.ItemStatus)) {
          let orderitemstatus = await OrderedItemsStatus.findOne({
            where: {
              ItemId: request.itemId,
              OrderId: request.orderId,
              userId: request.userId,
              StatusType: request.statusType,
            },
          });
          await OrderItemStatusRemark.create({
            orderItemStatusId: orderitemstatus.id,
            remark: request.ExcelRemarks
              ? request.ExcelRemarks
              : orderStatusType.name,
            delayReason: request.DelayReason ? request.DelayReason : "",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else {
          await OrderItem.update(
            {
              ItemStatus: request.statusType,
              status: orderStatusType.name,
            },
            {
              where: {
                Itemid: request.itemId,
              },
            }
          );
          let orderitemstatus = await OrderedItemsStatus.create({
            ItemId: request.itemId,
            OrderId: request.orderId,
            userId: request.userId,
            StatusType: request.statusType,
            status: 1,
            ExcelRemarks: request.ExcelRemarks
              ? request.ExcelRemarks
              : orderStatusType.name,
            DelayReason: request.DelayReason ? request.DelayReason : "",
            DeliveredAt:
              orderStatusType.name == "Delivered" ? new Date() : null,
          });
          await OrderItemStatusRemark.create({
            orderItemStatusId: orderitemstatus.id,
            remark: request.ExcelRemarks
              ? request.ExcelRemarks
              : orderStatusType.name,
            delayReason: request.DelayReason ? request.DelayReason : "",
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          const lastestStatus = await OrderItem.findOne({
            where: {
              Itemid: request.itemId,
            },
            order: [["ItemStatus", "DESC"]],
          });
          await Order.update(
            { latestStatus: lastestStatus.ItemStatus },
            {
              where: {
                Order_id: request.orderId,
                vendorId: request.vendorId,
                userId: request.userId,
              },
            }
          );
        }
      } else {
        let items = await OrderItem.findAll({
          where: {
            Orderid: request.orderId,
          },
        });
        if (!items.length) return response(res, 422, "Items not found");
        for (let i = 0; i < items.length; i++) {
          let exist = await OrderedItemsStatus.findOne({
            where: {
              ItemId: items[i].Itemid,
              OrderId: orderExist.Order_id,
              userId: orderExist.userId,
              StatusType: request.statusType,
            },
          });
          if (exist) {
            await OrderedItemsStatus.update(
              {
                ExcelRemarks: request.ExcelRemarks ? request.ExcelRemarks : "",
                DelayReason: request.DelayReason ? request.DelayReason : "",
                DeliveredAt:
                  orderStatusType.name == "Delivered" ? new Date() : null,
              },
              {
                where: {
                  id: exist.id,
                },
              }
            );
            await OrderItemStatusRemark.create({
              orderItemStatusId: exist.id,
              remark: request.ExcelRemarks ? request.ExcelRemarks : "",
              delayReason: request.DelayReason ? request.DelayReason : "",
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } else {
            let created = await OrderedItemsStatus.create({
              ItemId: items[i].Itemid,
              OrderId: request.orderId,
              userId: request.userId,
              StatusType: request.statusType,
              status: 1,
              ExcelRemarks: request.ExcelRemarks
                ? request.ExcelRemarks
                : orderStatusType.name,
              DelayReason: request.DelayReason ? request.DelayReason : "",
              DeliveredAt:
                orderStatusType.name == "Delivered" ? new Date() : null,
            });
            await OrderItemStatusRemark.create({
              orderItemStatusId: created.id,
              remark: request.ExcelRemarks
                ? request.ExcelRemarks
                : orderStatusType.name,
              delayReason: request.DelayReason ? request.DelayReason : "",
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        await OrderItem.update(
          {
            ItemStatus: request.statusType,
            status: orderStatusType.name,
          },
          {
            where: {
              Orderid: request.orderId,
            },
          }
        );
      }
      await Order.update(
        { updatedAt: new Date(), latestStatus: request.statusType },
        {
          where: {
            Order_id: request.orderId,
            vendorId: request.vendorId,
            userId: request.userId,
          },
        }
      );
      let items = await OrderItem.count({
        where: {
          Orderid: request.orderId,
        },
      });
      let user = await User.findOne({
        where: {
          id: request.userId,
        },
        attributes: ["id", "mobile", "email"],
      });
      let bodyValues = [
        request.orderId,
        orderStatusType.name,
        moment(orderExist.createdAt).format("DD MM YYYY"),
        items,
        orderExist.deliveryaddress,
        "",
        moment(orderExist.ExpectedDelivery).format("DD MM YYYY"),
        orderExist.MvikasDocketNo,
        orderExist.invoiceNumber,
        orderExist.deliverypersonname,
      ];
      await NotificationHelper.createOrderUpdateNotification(
        user.email,
        request.orderId,
        request.vendorId,
        request.userId,
        request.statusType,
        bodyValues,
        `91${user.mobile}`,
        [process.env.MSG91_BUTTON_URL]
      );
      return success(res, ORDER_CONSTANTS.STATUS_CHANGED);
    } catch (error) {
      console.error(SYSTEM_FAILURE, error);
      return failed(res, SYSTEM_FAILURE);
    }
  },
  uploadPOD: async (req, res) => {
    try {
      let request = req.body;
      const validate = new Validator(request, {
        orderId: "required",
        vendorId: "required",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      if (!req.files && !req.files.podImage)
        return response(res, 422, "POD image required");

      let orderExist = await Order.findOne({
        where: {
          id: request.orderId,
          vendorId: request.vendorId,
        },
      });
      if (!orderExist) return response(res, 422, "Order not found");
      const image = await aws(req.files.podImage, "orderPOD");
      await Order.update(
        { PODUrl: image.Location },
        {
          where: {
            id: request.orderId,
            vendorId: request.vendorId,
          },
        }
      );
      return success(res, "POD uploaded");
    } catch (error) {
      console.error(SYSTEM_FAILURE, error);
      return failed(res, SYSTEM_FAILURE);
    }
  },
  exportSalesReport: async (req, res) => {
    try {
      let {
        search,
        status,
        fromDate = null,
        toDate = null,
        column = "Order_id",
        operator = "equals",
        value,
        sortBy = "DESC",
        sortByColumn = "createdAt",
      } = req.query;
      let params = {
        paymentStatus: {
          [Op.ne]: "Initiated",
        },
      };
      if (fromDate && toDate) {
        fromDate = moment(fromDate).format("YYYY-MM-DD");
        toDate = moment(toDate).format("YYYY-MM-DD");
        params.createdAt = {
          [Op.gte]: fromDate,
        };
        params.createdAt = {
          [Op.lte]: toDate,
        };
      }
      if (fromDate) {
        fromDate = moment(fromDate).format("YYYY-MM-DD");
        params.createdAt = {
          [Op.gte]: fromDate,
        };
      }
      if (toDate) {
        toDate = moment(toDate).format("YYYY-MM-DD");
        params.createdAt = {
          [Op.lte]: toDate,
        };
      }
      if (value) {
        switch (operator) {
          case "contains":
            params[column] = { [Op.like]: `%${value}%` };
            break;
          case "equals":
            params[column] = { [Op.eq]: value };
            break;
          case "starts with":
            params[column] = { [Op.like]: `${value}%` };
            break;
          case "ends with":
            params[column] = { [Op.like]: `%${value}` };
            break;
          case "is empty":
            params[column] = { [Op.eq]: null };
            break;
          case "is not empty":
            params[column] = { [Op.ne]: null };
            break;
          case "is any of":
            params[column] = { [Op.in]: value.split(",") };
            break;
          default:
            params[column] = { [Op.eq]: value };
        }
      }

      if (search) {
        // Use Op.or to search in multiple fields
        params[Op.or] = [
          {
            Topincode: { [Op.like]: `%${search}%` },
          },
          {
            Frompincode: { [Op.like]: `%${search}%` },
          },
          {
            Customername: { [Op.like]: `%${search}%` },
          },
          {
            iteminvoice: { [Op.like]: `%${search}%` },
          },
          {
            Order_id: { [Op.like]: `%${search}%` },
          },
          {
            invoiceNumber: { [Op.like]: `%${search}%` },
          },
        ];
      }
      let order = await Order.findAll({
        where: params,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email", "mobile"],
          },
          {
            model: User,
            as: "vendor",
            attributes: ["id", "name", "email", "mobile"],
          },
          {
            model: User,
            as: "kam",
            attributes: ["id", "name", "email", "mobile"],
          },
          {
            model: User,
            as: "vendorold",
            attributes: ["id", "name", "email", "mobile"],
          },
          {
            model: OrderStatusType,
            as: "latestorderstatus",
          },
          {
            model: OrderSpecialCharge,
          },
        ],
      });

      // Define header as a simple array of strings
      let headers = [
        "Order Number",
        "Order Date",
        "Invoice Number",
        "Customer Name",
        "Customer Email",
        "Customer Number",
        "Vendor Name",
        "Article",
        "Item Type",
        "Category",
        "Customer Invoice No.",
        "Docket Number",
        "LSP Docket No",
        "Item Name",
        "E-Way Bill No.",
        "E-Way Bill Expiry",
        "Order Status",
        "Delivery Address",
        "Delivery Person Name",
        "Pick-Up Address",
        "Pick-Up Person Name",
        "Pick-Up Person Contact No.",
        "From Pin",
        "To Pin",
        "Chargable Weight",
        "Taxable Amt.",
        "Total Amt.",
        "Other Info.",
        "Packaging Type",
        "Transporter Name",
        "MVikas Docket No.",
        "Delivery Address",
        "Delivery Person Name",
        "Pick-Up Address",
        "Pick-Up Person Name",
        "Pick-Up Person Contact No.",
        "From Pin",
        "To Pin",
        "Chargeable Weight",
        "Mall Pickup Charge",
        "CSD Pickup Charge",
        "Sunday Pickup Charge",
        "Sunday Pickup Date",
        "Floor Pickup Charge",
        "Pick-Up Address",
        "Pickup Floor Name",
        "Mall Delivery Charge",
        "CSD Delivery Charge",
        "Sunday Delivery Charge",
        "Sunday Delivery Date",
        "Floor Delivery Charge",
        "Delivery Floor Name",
        "Appointment Delivery Charge",
        "Appointment Delivery Date",
        "Special Charges",
        "SC Reason",
        "SC Remark",
        "SC Status",
        "Assigned To",
      ];

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("sales-report");
      //   return success(res,order)

      // Add headers to the worksheet
      worksheet.columns = headers.map((header) => ({ header, key: header }));
      // Add data rows
      for (let i = 0; i < order.length; i++) {
        let articles = await OrderItem.count({
          where: { Orderid: order[i].Order_id },
        });

        let sp = parseFloat(order[i].totalAmount);
        let pp = parseFloat(order[i].V_totalAmount);
        let percent = parseFloat(((sp - pp) / sp) * 100);
        let finalPLPercent = percent.toFixed(2);
        worksheet.addRow({
          "Order Number": order[i].Order_id,
          "P & L %": finalPLPercent,
          "Order Date": moment(order[i].createdAt).format("YYYY-MM-DD"),
          "Invoice Number": order[i].invoiceNumber,
          "Customer Name": order[i].user.name,
          "Customer Email": order[i].user.email,
          "Customer Number": order[i].user.mobile,
          "Vendor Name": order[i].vendor ? order[i].vendor.name : "",
          Article: articles,
          "Item Type": order[i].ItemType,
          Category: order[i].ItemCategory,
          "Customer Invoice No.": order[i].iteminvoice,
          "Docket Number": order[i].MvikasDocketNo,
          "LSP Docket No": order[i].LSPDocketNo ? order[i].LSPDocketNo : "",
          "Item Name": order[i].Itemname,
          "E-Way Bill No.": order[i].EWayBillNo ? order[i].EWayBillNo : "",
          "E-Way Bill Expiry": order[i].EWayBillExpDate
            ? moment(order[i].EWayBillExpDate).format("YYYY-MM-DD")
            : "",
          "Order Status": order[i]?.latestorderstatus?.name,
          "Delivery Address": order[i].deliveryaddress,
          "Delivery Person Name": order[i].deliverypersonname,
          "Pick-Up Address": order[i].Pickupaddress,
          "Pick-Up Person Name": order[i].Pickuppersonname,
          "Pick-Up Person Contact No.": order[i].Pickuppersonmobile,
          "From Pin": order[i].Frompincode,
          "To Pin": order[i].Topincode,
          "Chargable Weight": order[i].chargable_weight,
          "Taxable Amt.": order[i].taxableAmount,
          "Total Amt.": order[i].totalAmount,
          "Other Info.": order[i].OtherInfromation
            ? order[i].OtherInfromation
            : "",
          "Packaging Type": order[i].ItemType,
          "Transporter Name": order[i].vendor ? order[i].vendor.name : "",
          "MVikas Docket No.": order[i].MvikasDocketNo || "",
          "Delivery Address": order[i].deliveryaddress || "",
          "Delivery Person Name": order[i].deliverypersonname || "",
          "Pick-Up Address": order[i].Pickupaddress || "",
          "Pick-Up Person Name": order[i].Pickuppersonname || "",
          "Pick-Up Person Contact No.": order[i].Pickuppersonmobile || "",
          "From Pin": order[i].Frompincode || "",
          "To Pin": order[i].Topincode || "",
          "Chargeable Weight": order[i].chargable_weight || "",
          "Mall Pickup Charge": order[i].pickupmallCharge || "",
          "CSD Pickup Charge": order[i].pickupcsdCharge || "",
          "Sunday Pickup Charge": order[i].pickupsundayCharge || "",
          "Sunday Pickup Date": order[i].pickupsundayDate || "",
          "Floor Pickup Charge": order[i].Pickupaddress || "",
          "Pick-Up Address": order[i].Pickupaddress || "",
          "Pickup Floor Name": order[i].pickupfloor || "",
          "Mall Delivery Charge": order[i].deliverymallCharge || "",
          "CSD Delivery Charge": order[i].deliverycsdCharge || "",
          "Sunday Delivery Charge": order[i].deliveryvsundayCharge || "",
          "Sunday Delivery Date": order[i].deliverysundayDate || "",
          "Floor Delivery Charge": order[i].deliveryfloorCharge || "",
          "Delivery Floor Name": order[i].deliveryfloor || "",
          "Appointment Delivery Charge":
            order[i].deliveryappointmentCharge || "",
          "Appointment Delivery Date": order[i].deliveryappointmentAt || "",
          "Special Charges": order[i].specialCharge || "",
          "SC Reason": order[i].mvOrderSpecialCharge?.type ?? "",
          "SC Remark": order[i].mvOrderSpecialCharge?.remark ?? "",
          "SC Status":
            order[i].mvOrderSpecialCharge?.status === 0
              ? "Requested"
              : order[i].mvOrderSpecialCharge?.status === 1
              ? "Approved"
              : order[i].mvOrderSpecialCharge?.status === 2
              ? "Declined"
              : "",
          "Assigned To": order[i].kam?.email ?? "",
        });

        // console.log({finalPLPercent})
      }
      //   return success(res,order)

      // order.forEach(async o => {
      //     let articles = await OrderItem.count({ where: { Orderid: o.Order_id } })
      //     worksheet.addRow({
      //         'Order Number': o.Order_id,
      //         'Order Date': moment(o.createdAt).format('YYYY-MM-DD'),
      //         'Invoice Number': o.invoiceNumber,
      //         'Customer Name': o.user.name,
      //         'Customer Email': o.user.email,
      //         'Customer Number': o.user.mobile,
      //         'Vendor Name': o.vendorold ? o.vendorold.name : "",
      //         'Article': articles,
      //         'Item Type': o.ItemType,
      //         'Category': o.ItemCategory,
      //         'Customer Invoice No.': o.iteminvoice,
      //         'Docket Number': o.MvikasDocketNo,
      //         'LSP Docket No': o.LSPDocketNo ? o.LSPDocketNo : "",
      //         'Item Name': o.Itemname,
      //         'E-Way Bill No.': o.EWayBillNo ? o.EWayBillNo : '',
      //         'E-Way Bill Expiry': o.EWayBillExpDate ? moment(o.EWayBillExpDate).format('YYYY-MM-DD') : '',
      //         'Order Status': o?.latestorderstatus?.name,
      //         'Delivery Address': o.deliveryaddress,
      //         'Delivery Person Name': o.deliverypersonname,
      //         'Pick-Up Address': o.Pickupaddress,
      //         'Pick-Up Person Name': o.Pickuppersonname,
      //         'Pick-Up Person Contact No.': o.Pickuppersonmobile,
      //         'From Pin': o.Frompincode,
      //         'To Pin': o.Topincode,
      //         'Chargable Weight': o.chargable_weight,
      //         'Taxable Amt.': o.taxableAmount,
      //         'Total Amt.': o.totalAmount,
      //         'Other Info.': o.OtherInfromation ? o.OtherInfromation : ""
      //     });
      // });

      // Write the workbook to the response
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=" + "sales-report.xlsx"
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error(SYSTEM_FAILURE, error);
      return failed(res, SYSTEM_FAILURE);
    }
  },
  getSalesInvoice: async (req, res) => {
    try {
      let {
        search,
        status,
        page = 1,
        limit = 10,
        fromDate = null,
        toDate = null,
        column = "Order_id",
        operator = "equals",
        value,
        sortBy = "DESC",
        sortByColumn = "createdAt",
        days = null,
      } = req.query;
      page = parseInt(page);
      limit = parseInt(limit);
      const offset = (page - 1) * limit;
      let params = {
        paymentStatus: {
          [Op.ne]: "Initiated",
        },
      };
      if (days) {
        const date = new Date();
        date.setDate(date.getDate() - parseInt(days));
        params = Object.assign(params, {
          createdAt: { [Op.gte]: date },
        });
      }
      if (fromDate && fromDate != "null" && toDate == "null") {
        params = Object.assign(params, {
          createdAt: {
            [Op.gte]: fromDate + " 00:00:00",
          },
        });
      }
      if (toDate && toDate != "null" && fromDate == "null") {
        params = Object.assign(params, {
          createdAt: {
            [Op.lte]: toDate + " 00:00:00",
          },
        });
      }
      if (fromDate && fromDate != "null" && toDate && toDate != "null") {
        params = Object.assign(params, {
          [Op.and]: [
            {
              createdAt: {
                [Op.gte]: fromDate + " 00:00:00",
              },
            },
            {
              createdAt: {
                [Op.lte]: toDate + " 23:59:00",
              },
            },
          ],
        });
      }
      if (value) {
        switch (operator) {
          case "contains":
            params[column] = { [Op.like]: `%${value}%` };
            break;
          case "equals":
            params[column] = { [Op.eq]: value };
            break;
          case "starts with":
            params[column] = { [Op.like]: `${value}%` };
            break;
          case "ends with":
            params[column] = { [Op.like]: `%${value}` };
            break;
          case "is empty":
            params[column] = { [Op.eq]: null };
            break;
          case "is not empty":
            params[column] = { [Op.ne]: null };
            break;
          case "is any of":
            params[column] = { [Op.in]: value.split(",") };
            break;
          default:
            params[column] = { [Op.eq]: value };
        }
      }

      if (search) {
        // Use Op.or to search in multiple fields
        params[Op.or] = [
          {
            Customername: { [Op.like]: `%${search}%` },
          },
          {
            iteminvoice: { [Op.like]: `%${search}%` },
          },
          {
            Order_id: { [Op.like]: `%${search}%` },
          },
          {
            invoiceNumber: { [Op.like]: `%${search}%` },
          },
        ];
      }
      let orders = await Order.findAll({
        where: params,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email", "mobile"],
          },
          {
            model: User,
            as: "vendor",
            attributes: ["id", "name", "email", "mobile"],
          },
        ],
        limit,
        offset,
        order: [[sortByColumn, sortBy]],
      });
      let count = await Order.count({ where: params });
      let data = {
        list: orders,
        count: count,
        limit: limit,
      };
      return success(res, "Sales invoice", data);
    } catch (error) {
      console.error(SYSTEM_FAILURE, error);
      return failed(res, SYSTEM_FAILURE);
    }
  },
  exportSalesInvoice: async (req, res) => {
    try {
      let {
        search,
        status,
        fromDate = null,
        toDate = null,
        column = "Order_id",
        operator = "equals",
        value,
        sortBy = "DESC",
        sortByColumn = "createdAt",
      } = req.query;
      let params = {
        paymentStatus: {
          [Op.ne]: "Initiated",
        },
      };
      if (fromDate && toDate) {
        fromDate = moment(fromDate).format("YYYY-MM-DD");
        toDate = moment(toDate).format("YYYY-MM-DD");
        params.createdAt = {
          [Op.gte]: fromDate,
        };
        params.createdAt = {
          [Op.lte]: toDate,
        };
      }
      if (fromDate) {
        fromDate = moment(fromDate).format("YYYY-MM-DD");
        params.createdAt = {
          [Op.gte]: fromDate,
        };
      }
      if (toDate) {
        toDate = moment(toDate).format("YYYY-MM-DD");
        params.createdAt = {
          [Op.lte]: toDate,
        };
      }
      if (value) {
        switch (operator) {
          case "contains":
            params[column] = { [Op.like]: `%${value}%` };
            break;
          case "equals":
            params[column] = { [Op.eq]: value };
            break;
          case "starts with":
            params[column] = { [Op.like]: `${value}%` };
            break;
          case "ends with":
            params[column] = { [Op.like]: `%${value}` };
            break;
          case "is empty":
            params[column] = { [Op.eq]: null };
            break;
          case "is not empty":
            params[column] = { [Op.ne]: null };
            break;
          case "is any of":
            params[column] = { [Op.in]: value.split(",") };
            break;
          default:
            params[column] = { [Op.eq]: value };
        }
      }

      if (search) {
        // Use Op.or to search in multiple fields
        params[Op.or] = [
          {
            Customername: { [Op.like]: `%${search}%` },
          },
          {
            iteminvoice: { [Op.like]: `%${search}%` },
          },
          {
            Order_id: { [Op.like]: `%${search}%` },
          },
          {
            invoiceNumber: { [Op.like]: `%${search}%` },
          },
        ];
      }
      let order = await Order.findAll({
        where: params,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email", "mobile"],
          },
          {
            model: User,
            as: "vendor",
            attributes: ["id", "name", "email", "mobile"],
          },
        ],
        attributes: [
          "id",
          "createdAt",
          "userId",
          "vendorId",
          "totalAmount",
          "Itemname",
          "Order_id",
          "invoiceNumber",
          "paymentStatus",
        ],
      });

      // Define header as a simple array of strings
      let headers = [
        "Invoice Number",
        "Customer Name",
        "Booking Date",
        "Payment To",
        "Total Amount",
        "Item Name",
        "Order Number",
      ];

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("sales-invoice");

      // Add headers to the worksheet
      worksheet.columns = headers.map((header) => ({ header, key: header }));

      // Add data rows
      order.forEach((o) => {
        worksheet.addRow({
          "Invoice Number": o.invoiceNumber,
          "Customer Name": o.user.name,
          "Booking Date": moment(o.createdAt).format("YYYY-MM-DD"),
          "Payment To": o.vendor.name,
          "Total Amount": parseFloat(o.totalAmount).toFixed(2),
          "Item Name": o.Itemname,
          "Order Number": o.Order_id,
        });
      });

      // Write the workbook to the response
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=" + "sales-invoice.xlsx"
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error(SYSTEM_FAILURE, error);
      return failed(res, SYSTEM_FAILURE);
    }
  },
  salesInvoice: async (req, res) => {
    try {
      // Validate the request
      const validate = new Validator(req.query, {
        orderId: "required",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      let order = await Order.findOne({ where: { id: req.query.orderId } });
      if (!order) return response(res, 422, "No data found");
      let items = await OrderItem.count({
        where: {
          Orderid: order.Order_id,
        },
      });
      let user = await User.findOne({
        where: {
          id: order.userId,
        },
      });
      let masterDocketURL = "";

      let htmlContent;
      try {
        htmlContent = fs.readFileSync(
          "views/mvload/saleorderinvoice.ejs",
          "utf-8"
        );
      } catch (err) {
        console.error("Error reading EJS template file:", err);
        return response(res, 422, "Something went wrong");
      }
      const dynamicData = {
        customerName: order.Customername,
        customerGST: user.GSTNo ? user.GSTNo : "N/A",
        invoiceDate: moment(order.createdAt).format("YYYY-MM-DD"),
        invoiceNumber: order.invoiceNumber,
        billingAddress:
          user.billingAddressLine1 && user.billingAddressLine2
            ? `${user.billingAddressLine1}, ${user.billingAddressLine2}, ${user.billingAddressCity}, ${user.billingAddressState}, ${user.billingAddressCountry}, ${user.billingAddressPincode}`
            : "N/A",
        pickupAddress: order.Pickupaddress,
        shippingAddress: order.deliveryaddress,
        itemName: order.Itemname,
        quantity: items,
        rate: order.rate,
        taxableAmount: order.taxableAmount,
        gstAmount: order.gst_Amount,
        gst: order.gst,
        totalAmount: order.totalAmount,
        totalAmountInWord: await numberToword.numberToWords(
          parseFloat(order.totalAmount)
        ),
        bankName: "",
        IFSC: "",
        accountNumber: "",
        specialCharge: order.specialCharge,
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
        const pdfFile = await uploadPdfToS3(pdfBuffer, "pdf");
        masterDocketURL = pdfFile.url;
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
      console.log("error---------------", error);
      // req.logger.error(error)
      return failed(res, SYSTEM_FAILURE);
    }
  },
  updateLSPDockectNumber: async (req, res) => {
    try {
      // Validate the request
      const validate = new Validator(req.body, {
        orderId: "required",
        LSPDocketNo: "required",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      let order = await Order.findOne({ where: { id: req.body.orderId } });
      if (!order) return response(res, 422, "Invalid order id");
      let LSPDocketNoAlreadyUsed = await Order.findOne({
        where: {
          LSPDocketNo: req.body.LSPDocketNo,
        },
      });
      if (LSPDocketNoAlreadyUsed)
        return response(res, 422, "LSP Docket No already used");
      await Order.update(
        {
          LSPDocketNo: req.body.LSPDocketNo,
        },
        {
          where: {
            id: req.body.orderId,
          },
        }
      );
      return success(res, "LSP Docket number updated");
    } catch (error) {
      console.log("error---------------", error);
      // req.logger.error(error)
      return failed(res, SYSTEM_FAILURE);
    }
  },
  getVendorsForLPUpdate: async (req, res) => {
    try {
      // Validate the request
      const validate = new Validator(req.query, {
        orderId: "required",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      let order = await Order.findOne({
        where: {
          id: req.query.orderId,
        },
      });
      let orderDimension = await OrderItemDimension.findAll({
        where: {
          Orderid: order.Order_id,
        },
      });
      let items = orderDimension.map((item) => ({
        L: item.Length,
        B: item.Breadth,
        H: item.Height,
        boxes: item.boxes,
        unit: item.Unit,
        boxWeight: item.Actual_Weight,
      }));
      let vendorServices = await calculateFinalPrice(order, items);
      return success(res, "lp updated n", vendorServices);
    } catch (error) {
      console.log("error---------------", error);
      return failed(res, SYSTEM_FAILURE);
    }
  },
  updateLp: async (req, res) => {
    try {
      let request = req.body;
      // Validate the request
      const validate = new Validator(request, {
        orderDetails: "required",
        deliverySlot: "required",
        pickupSlot: "required",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      let details = request.orderDetails;
      let data = {
        vendorId: details.vendorId,
        V_totalAmount: details.V_totalAmount,
        V_taxableAmount: details.V_taxableAmount,
        VGst: details.VGst,
        V_gst_Amount: details.V_gst_Amount,
        Vchargable_weight: details.chargable_weight,
        VMinChargableWeight: details.VMinChargableWeight,
        VMinODA: details.VMinODA,
        VOdaAmount: details.VOdaAmount,
        VOdaPerKG: details.VOdaPerKG,
        VRate: details.VRate,
        VtotalAdditionalAmount: details.totalAdditionalAmount,
        isVendorChanged: true,
        VadditionalCharges: JSON.stringify(details.additionalCharges),
        Vdeliveryslot: request.deliverySlot,
        Vpickuptime: request.pickupSlot,
      };
      await Order.update(data, {
        where: {
          id: details.orderId,
        },
      });
      return success(res, "Lp updated");
    } catch (error) {
      console.log("error---------------", error);
      return failed(res, SYSTEM_FAILURE);
    }
  },
  createSpecialCharge: async (req, res) => {
    try {
      let request = req.body;
      const validate = new Validator(request, {
        orderId: "required",
        amount: "required",
        type: "required|string",
        chargeFrom: "required|in:1,2", //1=>sales,2=>purchase
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      if (isNaN(request.amount))
        return response(res, 422, "Please enter valid number.");
      let order = await Order.findOne({
        where: {
          id: request.orderId,
        },
      });
      if (!order) return response(res, 422, "Order not found");
      if (order.latestStatus == 4)
        return response(
          res,
          422,
          "Special charge not applicable after delivered"
        );
      if (order.latestStatus == 5)
        return response(
          res,
          422,
          "Special charge not applicable after cancelled"
        );
      let OrderSpecialChargeExist = await OrderSpecialCharge.findOne({
        where: {
          orderId: request.orderId,
          chargeFrom: request.chargeFrom,
        },
      });
      let attachment = "";
      if (req.files && req.files.attachment) {
        const image = await aws(
          req.files.attachment,
          "specialChargeAttachment"
        );
        attachment = image.Location;
      }
      if (OrderSpecialChargeExist) {
        if (OrderSpecialChargeExist?.status != 1) {
          await OrderSpecialCharge.update(
            {
              amount: request.amount,
              type: request.type,
              chargeFrom: request.chargeFrom,
              status: 0,
              remark: request.remark ? request.remark : "",
              attachment: attachment ? attachment : "",
            },
            {
              where: {
                orderId: request.orderId,
              },
            }
          );
        } else {
          return response(res, 422, "You can't update after approval");
        }
      } else {
        await OrderSpecialCharge.create({
          orderId: request.orderId,
          amount: request.amount,
          type: request.type,
          chargeFrom: request.chargeFrom,
          status: 0,
          remark: request.remark ? request.remark : "",
          attachment: attachment ? attachment : "",
        });
      }
      return success(res, "Charge request sent");
    } catch (error) {
      console.error(SYSTEM_FAILURE, error);
      return failed(res, SYSTEM_FAILURE);
    }
  },
  approveSpecialCharge: async (req, res) => {
    try {
      let request = req.body;
      const validate = new Validator(request, {
        orderId: "required|array",
        status: "required|in:1,2",
        chargeFrom: "required|in:1,2",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      let orderIds = request.orderId;
      if (orderIds.length) {
        for (let i = 0; i < orderIds.length; i++) {
          let order = await Order.findOne({
            where: {
              id: orderIds[i],
            },
          });
          if (!order) return response(res, 422, "Order not found");
          let OrderSpecialChargeExist = await OrderSpecialCharge.findOne({
            where: {
              orderId: orderIds[i],
              chargeFrom: request.chargeFrom,
            },
          });
          if (!OrderSpecialChargeExist)
            return response(res, 422, "Charge not found");
          if (request.status == 2) {
            await OrderSpecialCharge.update(
              { status: 2 },
              {
                where: { orderId: orderIds[i] },
              }
            );
          } else {
            if (OrderSpecialChargeExist.chargeFrom == 1) {
              //if charge added from sales update for both user and vendor
              let totalAmount =
                Number(order.totalAmount) +
                Number(OrderSpecialChargeExist.amount);
              let V_totalAmount =
                Number(order.V_totalAmount) +
                Number(OrderSpecialChargeExist.amount);
              let specialCharge = Number(OrderSpecialChargeExist.amount);
              let masterDocketURL = "";
              let docketURL = "";
              await Order.update(
                {
                  totalAmount: totalAmount,
                  // V_totalAmount: V_totalAmount,
                  specialCharge: specialCharge,
                  VspecialCharge: specialCharge,
                  masterDocketURL: masterDocketURL,
                  docketURL: docketURL,
                },
                {
                  where: {
                    id: orderIds[i],
                  },
                }
              );
            } else {
              //if charge added from sales update for  vendor
              // let totalAmount = Number(order.totalAmount) + Number(OrderSpecialChargeExist.amount)
              let V_totalAmount =
                Number(order.V_totalAmount) +
                Number(OrderSpecialChargeExist.amount);
              let specialCharge = order.VspecialCharge
                ? Number(order.VspecialCharge) +
                  Number(OrderSpecialChargeExist.amount)
                : Number(OrderSpecialChargeExist.amount);
              let masterDocketURL = "";
              let docketURL = "";
              await Order.update(
                {
                  // totalAmount: totalAmount,
                  V_totalAmount: V_totalAmount,
                  VspecialCharge: specialCharge,
                  masterDocketURL: masterDocketURL,
                  docketURL: docketURL,
                },
                {
                  where: {
                    id: orderIds[i],
                  },
                }
              );
            }
            await OrderSpecialCharge.update(
              { status: 1 },
              {
                where: { orderId: orderIds[i], chargeFrom: request.chargeFrom },
              }
            );
          }
        }
      }
      return success(res, "Charge updated ");
    } catch (error) {
      console.error(SYSTEM_FAILURE, error);
      return failed(res, SYSTEM_FAILURE);
    }
  },
};
async function calculateFinalPrice(order, items) {
  let finalServiceList = [];
  let data = order;
  data.items = items;
  data.shipmentAmount = order.Shipment_value;
  data.shipmentWeight = order.Shipment_weight;
  data.boxes = items.reduce((sum, item) => sum + item.boxes, 0);
  let user = await User.findOne({
    where: {
      id: order.userId,
    },
    include: [
      {
        model: UserAccountDetails,
        as: "account",
      },
    ],
  });
  let markup = 0;
  //   let serviceIds = await CargoRate.findAll({ where: { rateType: order.rateType } }) //comment on 27 Dec
  let serviceIds = await CargoRate.findAll({
    where: {
      rateType: {
        [Op.in]: [1],
      },
    },
  });

  let getServiceList = await Service.findAll({
    where: {
      id: {
        [Op.in]: serviceIds.map((cargo) => cargo.serviceId),
      },
      userId: {
        [Op.ne]: order.vendorId,
      },
      isActive: true,
    },
    include: [
      {
        model: User,
        // required:false,
        where: {
          isDummy: false,
        },
        as: "Vendor",
      },
    ],
  });
  console.log("+++++++++++++++++++", getServiceList);

  //get source pincode id
  let getSourcePincodeId = await Pincode.findOne({
    where: {
      pincode: data.Frompincode,
    },
  });

  //get destination pincode id
  let getDestinationPincodeId = await Pincode.findOne({
    where: {
      pincode: data.Topincode,
    },
  });

  for (let i = 0; i < getServiceList.length; i++) {
    if (user.account && user.account.markup) {
      markup = parseFloat(user.account.markup);
    } else {
      let vendorAccount = await UserAccountDetails.findOne({
        where: {
          userId: getServiceList[i].userId,
        },
      });
      markup =
        vendorAccount && vendorAccount.markup
          ? parseFloat(vendorAccount.markup)
          : 0;
    }
    if (!markup) {
      markup = 35;
    }
    if (getServiceList[i].Vendor?.isDummy) {
      markup = 0;
    }
    if (!getServiceList[i].Vendor?.isDummy) {
      markup = 0;
      let checkSourcePincodeMapWithZone = await ZonePinMap.findOne({
        where: {
          pincodeId: getSourcePincodeId.id,
          vendorId: getServiceList[i].userId,
          isActive: true,
        },
      });
      let checkDestinationPincodeMapWithZone = await ZonePinMap.findOne({
        where: {
          pincodeId: getDestinationPincodeId.id,
          vendorId: getServiceList[i].userId,
          isActive: true,
        },
      });
      if (checkSourcePincodeMapWithZone && checkDestinationPincodeMapWithZone) {
        let getSourceService = await ZoneServiceMap.findOne({
          where: {
            zoneId: checkSourcePincodeMapWithZone.zoneId,
            zonePinId: checkSourcePincodeMapWithZone.pincodeId,
            vendorId: checkSourcePincodeMapWithZone.vendorId,
            serviceId: getServiceList[i].id,
            isActive: true,
            isODA: {
              [Op.in]: ["serviceable", "ODA1", "ODA2", "ODA3"],
            },
          },
        });
        let getDestinationService = await ZoneServiceMap.findOne({
          where: {
            zoneId: checkDestinationPincodeMapWithZone.zoneId,
            zonePinId: checkDestinationPincodeMapWithZone.pincodeId,
            vendorId: checkDestinationPincodeMapWithZone.vendorId,
            serviceId: getServiceList[i].id,
            isActive: true,
            isODA: {
              [Op.in]: ["serviceable", "ODA1", "ODA2", "ODA3"],
            },
          },
        });

        if (getSourceService && getDestinationService) {
          let zoneInODA = false;
          let odaType = ["ODA1", "ODA2", "ODA3"];
          let ODA1 = false;
          let ODA2 = false;
          let ODA3 = false;
          let ODA11 = false;
          let ODA22 = false;
          let ODA33 = false;
          if (
            odaType.includes(getSourceService.isODA) ||
            odaType.includes(getDestinationService.isODA)
          )
            zoneInODA = true;
          if (getSourceService.isODA == "ODA1") ODA1 = true;
          if (getSourceService.isODA == "ODA2") ODA2 = true;
          if (getSourceService.isODA == "ODA3") ODA3 = true;
          if (getDestinationService.isODA == "ODA1") ODA11 = true;
          if (getDestinationService.isODA == "ODA2") ODA22 = true;
          if (getDestinationService.isODA == "ODA3") ODA33 = true;
          let tatParams = {
            zoneIdFrom: checkSourcePincodeMapWithZone.zoneId,
            zoneIdTo: checkDestinationPincodeMapWithZone.zoneId,
            vendorId: getServiceList[i].userId,
            serviceId: getServiceList[i].id,
          };
          if (zoneInODA) {
            tatParams = Object.assign(tatParams, {
              ODATAT: {
                [Op.ne]: null,
              },
            });
          } else {
            tatParams = Object.assign(tatParams, {
              STDTAT: {
                [Op.ne]: null,
              },
            });
          }
          //  console.log(tatParams);
          let tat = await OdaTat.findOne({
            where: tatParams,
          });
          if (tat) {
            let TAT =
              zoneInODA && tat.ODATAT
                ? parseInt(tat.ODATAT)
                : parseInt(tat.STDTAT);
            let cargoRate = await CargoRate.findOne({
              where: {
                serviceId: getServiceList[i].id,
                vendorId: getServiceList[i].userId,
              },
            });

            if (cargoRate) {
              if (
                await CalculativeHelper.checkCargoRateDateValidation(
                  cargoRate.dateFrom,
                  cargoRate.dateTo
                )
              ) {
                let vendorRate = await VendorRate.findOne({
                  where: {
                    cargoId: cargoRate.id,
                    zoneIdFrom: checkSourcePincodeMapWithZone.zoneId,
                    zoneIdTo: checkDestinationPincodeMapWithZone.zoneId,
                    rateType: 1,
                  },
                });

                if (vendorRate) {
                  if (cargoRate.rateType == 1) {
                    //rate type per kg
                    let vservice =
                      await RatePerKgPerBoxServiceList.getRatePerKgServiceList(
                        vendorRate,
                        cargoRate,
                        data.items,
                        data.shipmentWeight,
                        ODA1,
                        ODA2,
                        ODA3,
                        ODA11,
                        ODA22,
                        ODA33,
                        data.shipmentAmount,
                        getServiceList[i],
                        user,
                        markup,
                        getSourcePincodeId,
                        getDestinationPincodeId,
                        TAT,
                        order
                      );
                    if (vservice) finalServiceList.push(vservice);
                  } else {
                    console.log("rate per box");

                    //rate type per box
                    let vservice =
                      await RatePerKgPerBoxServiceList.getRatePerboxServiceList(
                        vendorRate,
                        cargoRate,
                        data.items,
                        data.shipmentWeight,
                        ODA1,
                        ODA2,
                        ODA3,
                        ODA11,
                        ODA22,
                        ODA33,
                        data.shipmentAmount,
                        getServiceList[i],
                        user,
                        markup,
                        getSourcePincodeId,
                        getDestinationPincodeId,
                        TAT,
                        order
                      );
                    if (vservice) finalServiceList.push(vservice);
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  return finalServiceList;
}
