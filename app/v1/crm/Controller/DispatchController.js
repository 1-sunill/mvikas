const { async } = require("@firebase/util");
const {
  serverError,
  success,
  failed,
  validateFail,
} = require("../../../helper/response");
const db = require("../../../../models");
const { request } = require("http");
const { Validator } = require("node-input-validator");
const { SYSTEM_FAILURE } = require("../../../helper/message");
const {
  prepareOrderData,
  handleDocuments,
} = require("../../../helper/helpers");
const { Model, or, where } = require("sequelize");
const { sendmail, mail } = require("../../../helper/mail");
const { waitForDebugger } = require("inspector");
// const numberToWords = require("number-to-words");
const numberToword = require("../../../helper/numberToWord");

const Order = db.CrmOrder;
const OrderItem = db.CrmOrderItems;
const Unit = db.Unit;
const Product = db.crmProduct;
const ProductCombination = db.productAttributeCombination;
const ProductCombinationValue = db.attributeValueCombination;
const CrmAttribute = db.CrmAttribute;
const CrmAttributeValue = db.CrmAttributeValue;
const Document = db.CrmDocument;
const CrmAllCustomer = db.CrmAllCustomer;
const CrmSubdispatch = db.CrmSubdispatch;
const User = db.crmuser;
const AssignUser = db.CrmAssign;
const ActivityLog = db.CrmActivityLogs;
const PaymentTerm = db.CrmPaymentTerm;
const CrmSubDispatchPayments = db.CrmSubDispatchPayments;
const Transport = db.CrmTransport;
const CrmTransportations = db.CrmTransportation;
const CrmStatusLog = db.CrmStatusLog;
const Role = db.Role;
const Workspace = db.crmworkspace;
const CrmUnitType = db.CrmUnitType;
const CrmDriver = db.CrmDriver;
const CrmVehicleType = db.CrmVehicleType;
const CrmDispatchEwayBill = db.CrmDispatchEwayBill;
const CrmInvoice = db.CrmInvoice;
const CrmDispatchEwayBills = db.CrmDispatchEwayBill;
// const numberToword = require('../../../helper/numberToWord')

const fs = require("fs");
const pdf = require("html-pdf-node");
const ejs = require("ejs");
const { Op, Sequelize } = require("sequelize");
const ExcelJS = require("exceljs");
const Vendor = db.CrmVendor;
const { uploadPdfToS3 } = require("../../../helper/aws");
const { fail } = require("assert");
const {
  sendWhatsAppMessage,
  sendNotificationEmail,
  sendNotificationWhatsApp,
} = require("../../../helper/sendSms");
module.exports = {
  //Get All dispatches with all order items
  getDispatchOrder: async (req, res) => {
    try {
      const request = req.query;
      const v = new Validator(request, {
        orderId: "required",
      });
      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }
      let orderParams = {};
      if (request.workspaceId > 1) {
        orderParams = { id: request.orderId, workspaceId: request.workspaceId };
      } else {
        orderParams = { id: request.orderId };
      }
      // Fetch the order details along with order items (where itemable_type is 'order')
      const order = await Order.findOne({
        where: orderParams,
        include: [
          {
            model: OrderItem,
            as: "orderItems",
            where: { itemable_type: "order" },
            include: [
              {
                model: Unit,
                as: "unitData",
                attributes: ["name"],
              },
              {
                model: Product,
                as: "product",
                attributes: ["id", "name"],
              },
            ],
            // attributes: ["id", "product_id", "quantity", "vendorId", "make"],
          },
        ],
        attributes: ["id", "order_no", "status"],
      });
      if (!order) {
        return failed(res, "Order not found.");
      }
      let params = {};
      if (request.workspaceId > 1) {
        params = { orderId: request.orderId, workspaceId: request.workspaceId };
      } else {
        params = { orderId: request.orderId };
      }
      // Fetch the dispatched data
      const dispatchedData = await CrmSubdispatch.findAll({
        where: { orderId: request.orderId, workspaceId: request.workspaceId },
        include: [
          {
            model: OrderItem,
            as: "orderItems",
            where: { itemable_type: "dispatch" },
            include: [
              {
                model: Document,
                as: "documentSingleData",
                required: false,
                where: { documentable_type: "CrmDispatchInvoice" },
                attributes: ["path"],
              },
              {
                model: Product,
                as: "product",
                attributes: ["id", "name"],
              },
              {
                model: CrmAllCustomer,
                as: "vendorData",
                attributes: ["name"],
              },
              {
                model: Unit,
                as: "unitData",
                attributes: ["name"],
              },
              {
                model: CrmStatusLog,
                as: "statusLogDispatchInvoice",
                required: false,
                where: { status_loggable_type: "CrmDispatchInvoice" },
                include: [
                  { model: Role, as: "role", attributes: ["name"] },
                  { model: User, as: "userDetail", attributes: ["name"] },
                ],
              },
              {
                model: CrmStatusLog,
                as: "statusLog",
                required: false,
                where: { status_loggable_type: "CrmDispatchShortage" },
                include: [
                  { model: Role, as: "role", attributes: ["name"] },
                  { model: User, as: "userDetail", attributes: ["name"] },
                ],
              },
            ],
          },
          {
            model: Document,
            as: "freezDocument",
            where: { documentable_type: "CrmDispatchFreez" },
            required: false,
            attributes: ["id", "path", "fileName"],
          },
          {
            model: CrmTransportations,
            as: "transportationDetail",
            include: [
              {
                model: Document,
                as: "transporterDocumentData",
                where: { documentable_type: "CrmDispatchTransporter" },
                attributes: ["id", "documentTypeId", "path", "fileName"],
              },
            ],
          },
          {
            model: CrmDispatchEwayBill,
            as: "ewaybilldetail",
            include: [
              {
                model: CrmStatusLog,
                as: "ewaybillstatusLog",
                required: false,
                where: { status_loggable_type: "CrmDispatchEwayBill" },
                include: [
                  { model: Role, as: "role", attributes: ["name"] },
                  { model: User, as: "userDetail", attributes: ["name"] },
                ],
              },
            ],
          },
          { model: CrmStatusLog, as: "statusLog" },
          {
            model: Order,
            as: "singleOrder",
            attributes: [
              "status_by_scm",
              "status_by_sales",
              "status_by_finance",
            ],
          },
          {
            model: ActivityLog,
            as: "transitStatusLog",
            required: false,
            where: { entity_type: "CrmDispatchTransit" },
          },
        ],
      });

      // Initialize remainingQuantities to track order and dispatch quantities by product
      const remainingQuantities = {};
      order.orderItems.forEach((item) => {
        // console.log(item.varientId)
        const key = `${item.product.id}_${item.varientId}`;
        remainingQuantities[key] = {
          productId: item.product.id,
          productName: item.product.name,
          orderQuantity: item.quantity,
          dispatchQuantity: 0,
          varientId : item.varientId,
        };
      });
      // return success(res,"sss",remainingQuantities)
      // Subtract dispatched quantities from order quantities
      dispatchedData.forEach((dispatchRecord) => {
        if (dispatchRecord.isPlanning === 2) {
          dispatchRecord.orderItems.forEach((dispatchItem) => {
            if (dispatchItem.product) {
              const key = `${dispatchItem.product.id}_${dispatchItem.varientId}`; // Construct unique key
              console.log({ key });
      
              // Check and update the corresponding entry in remainingQuantities
              if (remainingQuantities[key]) {
                remainingQuantities[key].dispatchQuantity +=
                  parseFloat(dispatchItem.quantity) || 0;
              }
            }
          });
        }
      });
      

      dispatchedData.forEach((dispatchRecord) => {
        let totalProfit = 0;

        // Calculate total profit for each order item
        dispatchRecord.orderItems.forEach((item) => {
          const price = parseFloat(item.price);
          const salesPriceRange = parseFloat(item.sales_price_range);
          const quantity = parseFloat(item.quantity);

          // Ensure price, salesPriceRange, and quantity are valid numbers before performing the calculation
          if (!isNaN(price) && !isNaN(salesPriceRange) && !isNaN(quantity)) {
            totalProfit += (price - salesPriceRange) * quantity;
          } else {
            console.error("Invalid data in order item:", item);
          }
        });

        // Calculate profit and profitability
        const frightCharges = parseFloat(dispatchRecord.frightCharges);
        if (!isNaN(frightCharges)) {
          const finalProfit = totalProfit - frightCharges;
          // console.log("totalProfit", finalProfit);
          dispatchRecord.profit = finalProfit;
          dispatchRecord.profitability = frightCharges
            ? (finalProfit / frightCharges) * 100
            : 0;
        } else {
          console.error(
            "Invalid freightCharges value:",
            dispatchRecord.frightCharges
          );
          dispatchRecord.profit = 0;
          dispatchRecord.profitability = 0;
        }
      });

      // Calculate remaining quantity for each product
      Object.keys(remainingQuantities).forEach((productId) => {
        const item = remainingQuantities[productId];
        console.log("item.orderQuantity",item.orderQuantity)
        console.log("item.dispatchQuantity",item.dispatchQuantity)
// return success(res,item)
        item.remainingQuantity = item.orderQuantity - item.dispatchQuantity;
      });
      const remainingQuantitiesArray = Object.values(remainingQuantities);

      // Grouping and separating data into Planning and Execution
      const planningData = [];
      const executionData = [];
      // console.log({ dispatchedData });
      dispatchedData.forEach((record) => {
        const modifiedRecord = {
          ...record.toJSON(),
          orderItems: record.orderItems.map((item) => ({
            id: item.id,
            product_id: item.productId,
            itemable_id: item.itemable_id,
            quantity: item.quantity,
            vendorId: item.vendorId,
            make: item.make,
            shortage_excess_type: item.shortage_excess_type,
            shortage_excess_unit_type_id: item.shortage_excess_unit_type_id,
            shortage_excess_action_by: item.shortage_excess_action_by,
            shortage_excess_comment: item.shortage_excess_comment,
            shortage_excess_doc: item.shortage_excess_doc,
            shortage_excess_value: item.shortage_excess_value,
            shortage_excess_status: item.shortage_excess_status,
            sales_status: item.sales_status,
            scm_status: item.scm_status,
            finance_status: item.finance_status,
            product: {
              id: item.product?.id ?? null, 
              name: item.product?.name ?? null,
            },
            vendor: {
              name: item.vendorData?.name ?? null,
            },
            unit: {
              name: item.unitData?.name ?? null,
            },
            statusLog: item.statusLog ?? null,
            statusLogDispatchInvoice: item.statusLogDispatchInvoice ?? null,
            documentData: item.documentSingleData ?? null, 
            price: item.price ?? null, 
            sales_price_range: item.sales_price_range ?? null,
          })),
          profitability:
            !isNaN(record.profitability) && record.profitability !== null
              ? record.profitability.toFixed(2)
              : "0.00",
        };

        if (record.isPlanning === 1) {
          planningData.push(modifiedRecord);
        } else if (record.isPlanning === 2) {
          executionData.push(modifiedRecord);
        }
      });

      const responseData = {
        order,
        remainingQuantities: remainingQuantitiesArray,
        dispatchData: { planning: planningData, execution: executionData },
      };

      return success(res, "Data fetched successfully.", responseData);
    } catch (error) {
      console.error("Error fetching order:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  //add subdispatch with order items
  addSubdispatch: async (req, res) => {
    try {
      const requests = req.body;

      // Validate the incoming request
      const v = new Validator(requests, {
        orderId: "required",
        workspaceId: "required",
        priceBasis: "required",
        frightCharges: "required",
        // remark: "required",
        type: "required",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }

      let userId = req.decodedData.id;
      const user = await User.findOne({ where: { id: userId } });

      if (!user) {
        return res.failed(res, "User not found.");
      }

      //check credit limit status approved or not
      const orderCheck = await Order.findOne({
        where: { id: req.body.orderId },
      });

      if (!orderCheck) {
        return failed(res, "order not found.");
      }

      const customerCheck = await CrmAllCustomer.findOne({
        where: { id: orderCheck.customerId },
      });
      // if (
      //   customerCheck.creditLimitstatus == "pending" ||
      //   customerCheck.creditLimitstatus == "declined"
      // ) {
      //   return failed(res, "Customer credit limit is not approved");
      // }
      console.log({ userId });
      const orderItem = req.body.orderItem;
      const reqData = {
        userId: userId,
        orderId: req.body.orderId,
        workspaceId: req.body.workspaceId,
        priceBasis: req.body.priceBasis,
        frightCharges: req.body.frightCharges,
        tat: req.body.tat,
        tat_approved_by: req.body.tat_approved_by || null,
        actionBy: req.body.actionBy || null,
        isPlanning: req.body.isPlanning,
        status: req.body.status,
        remark: req.body.remark,
      };

      const orderQtyCheck = await OrderItem.findOne({
        where: { itemable_id: req.body.orderId, itemable_type: "order" },
      });

      const requestData = Array.isArray(orderItem)
        ? orderItem
        : JSON.parse(orderItem);
      const normalizedOrderItems = Array.isArray(requestData)
        ? requestData
        : [requestData];
      let totalExistingDispatchQuantity = 0;

      for (let i = 0; i < normalizedOrderItems.length; i++) {
        const element = normalizedOrderItems[i];

        const uniqueTotalQuantity = normalizedOrderItems.reduce((sum, item) => {
          if (
              Number(item.orderDetails.productId) === Number(element.orderDetails.productId) &&
              Number(item.orderDetails.varientId) === Number(element.orderDetails.varientId)
          ) {
              return sum + Number(item.orderDetails.quantity);
          }
          return sum;
      }, 0);
      // console.log({uniqueTotalQuantity})
        const subdispatchRecords = await CrmSubdispatch.findAll({
          where: { orderId: req.body.orderId },
        });
        // Loop through each subdispatch entry
        for (let subdispatch of subdispatchRecords) {
          // Sum the dispatch quantities for each subdispatch entry and add to the total
          const quantitySum = await OrderItem.sum("quantity", {
            where: {
              itemable_id: subdispatch.id,
              itemable_type: "dispatch",
              dispatchIsPlanning: parseInt(req.body.isPlanning),
              // product_id: element.orderDetails.productId, // Ensure this matches the product
            },
          });

          // Accumulate the total quantity
          totalExistingDispatchQuantity += quantitySum || 0;
        }

        // Find the original order quantity for the product
        const orderQty = await OrderItem.findOne({
          where: {
            itemable_id: req.body.orderId,
            product_id: element.orderDetails.productId,
            itemable_type: "order",
            varientId:element.orderDetails.varientId
          },
        });
        if (!orderQty) {
          if (orderQty) {
            console.log({ orderQty });
            return failed(res, `Order for product ${orderQty.name} not found.`);
          } else {
            return failed(res, `Order for this product not found.`);
          }
        }

        // Calculate the total dispatched quantity including the new quantity

        const totalDispatchedQuantity =
          (parseFloat(totalExistingDispatchQuantity) || 0) +
          parseFloat(element.orderDetails.quantity);

        console.log({ uniqueTotalQuantity });
        console.log("orderQty.quantity",orderQty.quantity)

        // Check if the total dispatched quantity exceeds the original order quantity
        if (uniqueTotalQuantity > orderQty.quantity) {
          return failed(
            res,
            `The quantity for product ${orderQty.name} exceeds the allowed order quantity. Maximum allowed: ${orderQty.quantity}.`
          );
        }
      }
      // return 1;
      const data = await CrmSubdispatch.create(reqData); //Add CrmSubdispatch items
      const order = await Order.findOne({ where: { id: req.body.orderId } });
      // Prepare the order data if order items exist
      if (orderItem && orderItem.length > 0) {
        // console.log("++++++++++++++++++")
        await prepareOrderData(
          orderItem,
          data.id,
          req.body.workspaceId,
          req.body.type,
          req.body.isPlanning
        );
      }

      // return 1;
      //Send email
      let htmlContent;
      let htmlContentPlanning;
      try {
        htmlContent = fs.readFileSync(
          "views/emails/salesgo_subdispatch_approval.ejs",
          "utf-8"
        );
        htmlContentPlanning = fs.readFileSync(
          "views/emails/generatePo.ejs",
          "utf-8"
        );
      } catch (err) {
        console.error("Error reading EJS template file:", err);
        return res
          .status(500)
          .json({ message: "Failed to read template file" });
      }

      const customer = await CrmAllCustomer.findOne({
        where: { id: order.customerId },
      });
      const workspace = await Workspace.findOne({
        where: { id: order.workspaceId },
      });
      const formattedDate = new Date(order.createdAt)
        .toLocaleDateString("en-GB")
        .replace(/\//g, "-");

      const dynamicData = {
        dispatchId: data.id,
        order_no: order.order_no,
        // amount: requests.amount,
        customerName: customer.name,
        date: formattedDate,
        url: "https://crm.mvikas.in/",
        team: workspace.name,
        legal_name: workspace.legal_name,
        address: workspace.address,
        phone: workspace.phone,
        email: workspace.email,
        banner: workspace.banner_path,
        imageUrl: workspace.logo_path,
        customer_po_no: order.customer_po_no,
      };
      const compiledHtml = ejs.render(htmlContent, dynamicData);
      const compiledHtmlPlanning = ejs.render(htmlContentPlanning, dynamicData);

      const financeScmusers = await User.findAll({
        where: {
          workspaceId: req.body.workspaceId,
          department: {
            [Op.in]: ["scm", "finance"],
          },
        },
      });
      const emails = financeScmusers.map((user) => user.email);
      const Ids = financeScmusers.map((user) => user.id);
      let notificationEntities = [];
      notificationEntities.push({
        email: emails,
        ids: Ids,
        subject: `SalesGo Subdispatch Approval for Order No. ${order.order_no}`,
        html: compiledHtml,
      });
      //On dispatch creation
      await sendNotificationEmail(
        notificationEntities,
        "salesgo_subdispatch_approval",
        "user",
        workspace.id
      );
      //Only when create planning dispatch
      let notificationEntitiesPlanning = [];
      notificationEntitiesPlanning.push({
        email: emails,
        ids: Ids,
        subject: `SalesGo MVIKAS PO No. ${order.customer_po_no} Approval`,
        html: compiledHtmlPlanning,
      });
      if (req.body.isPlanning == 1) {
        await sendNotificationEmail(
          notificationEntitiesPlanning,
          "salesgo_po_approval",
          "user",
          workspace.id
        );
      }
      return success(res, "Data inserted successfully.", req.body);
    } catch (error) {
      console.error("Error updating order:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  //dispatch list
  listSubdispatch: async (req, res) => {
    try {
      const request = req.query;
      const search = request.search ? request.search : "";
      const page = request.page ? parseInt(request.page) : 1;
      const pageSize = request.limit
        ? parseInt(request.limit)
        : parseInt(process.env.PAGE_LIMIT);
      const offset = (page - 1) * pageSize;
      const userId = req.decodedData.id;
      const checkUser = await User.findOne({ where: { id: userId } });
      // let params = {};

      let params = {
        workspaceId: request.workspaceId,
      };

      if (checkUser.department === "scm") {
        params = {
          ...params,
          status_by_sales: "approved",
          status_by_finance: "approved",
        };
      }

      // If the userType is 0, apply additional filtering for non-current users
      if (checkUser.userType === 0 && request.workspaceId > 1) {
        params = {
          [Op.and]: [
            { id: { [Op.ne]: checkUser.id } }, // Exclude the current user
            {
              workspaceId: request.workspaceId,
            },
          ],
        };
      }

      if (search) {
        params = {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { order_no: { [Op.like]: `%${search}%` } },
          ],
        };
      }
      // Set additional filter for CrmSubdispatch
      // let subdispatchFilter = {}; // Initialize subdispatch filter

      // // Apply status filter based on the dashboard data
      // if (request.status) {
      //   switch (request.status) {
      //     case "totalSubDispatch":
      //       params = {
      //         ...params,
      //         status_by_scm: "approved",
      //       };
      //       break;
      //     case "pendingDispatch":
      //       params = {
      //         ...params,
      //         status_by_scm: "pending",
      //       };
      //       break;
      //     case "completeSubdispatch":
      //       params = {
      //         ...params,
      //         status_by_scm: "approved",
      //       };
      //       // Add filter for CrmSubdispatch
      //       subdispatchFilter = {
      //         status: "approved", // Status for CrmSubdispatch
      //       };
      //       break;
      //     case "cancelSubdispatch":
      //       params = {
      //         ...params,
      //         status_by_scm: "declined",
      //       };
      //       break;
      //     case "completedispatch":
      //       params = {
      //         ...params,
      //         status_by_scm: "complete",
      //       };
      //       break;
      //     case "pendingSubDispatch":
      //       params = {
      //         ...params,
      //         status_by_scm: "pending",
      //       };
      //       // Add filter for CrmSubdispatch
      //       subdispatchFilter = {
      //         status: "pending", // Status for CrmSubdispatch
      //       };
      //       break;
      //     default:
      //       // Handle unknown status
      //       return error(
      //         res,
      //         "Invalid status filter provided.",
      //         SYSTEM_FAILURE
      //       );
      //   }
      // }
      console.log({ params });
      const list = await Order.findAll({
        where: params,
        include: [
          {
            model: CrmAllCustomer,
            as: "customerData",
            attributes: [
              "name",
              "mobile",
              "companyName",
              "contactName",
              "creditLimitstatus",
            ],
          },
          // {
          //   model: CrmSubdispatch,
          //   as: "dispatchData",
          //   where: subdispatchFilter, // Apply the subdispatch filter
          //   return: false,
          // },
          {
            model: AssignUser,
            as: "assignUser",
            required: false,
            where: {
              documentable_type: "CrmDispatch",
            },
            attributes: [
              "id",
              "assignable_id",
              "assign_by_id",
              "assign_to_id",
              "assign_reason_id",
              "comment",
            ],
            include: [
              {
                model: User,
                as: "user",
                attributes: ["name"],
              },
            ],
          },
          {
            model: OrderItem,
            as: "orderItems",
            where: { itemable_type: "order" },
            attributes: ["quantity"],
          },
        ],
        order: [["id", "DESC"]],
        limit: parseInt(pageSize),
        offset: offset,
      });
      const listCount = await Order.findAll({
        where: params,
        include: [
          {
            model: CrmAllCustomer,
            as: "customerData",
            attributes: ["name", "mobile", "companyName", "contactName"],
          },
          // {
          //   model: CrmSubdispatch,
          //   as: "dispatchData",
          //   where: subdispatchFilter, // Apply the subdispatch filter
          //   return: false,
          // },
          {
            model: AssignUser,
            as: "assignUser",
            required: false,
            where: {
              documentable_type: "CrmDispatch",
            },
            attributes: [
              "id",
              "assignable_id",
              "assign_by_id",
              "assign_to_id",
              "assign_reason_id",
              "comment",
            ],
            include: [
              {
                model: User,
                as: "user",
                attributes: ["name"],
              },
            ],
          },
          {
            model: OrderItem,
            as: "orderItems",
            attributes: ["quantity"],
          },
        ],
      });
      const newData = {
        list,
        count: listCount.length,
      };
      return success(res, "Data fetched successfully.", newData);
    } catch (error) {
      console.error("Error updating order:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  //Get single dispatch with order items
  getSingleDispatchOrder: async (req, res) => {
    try {
      const request = req.query;
      const v = new Validator(request, {
        dispatchId: "required",
      });
      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }
      const dispatch = await CrmSubdispatch.findOne({
        where: { id: request.dispatchId },
        include: [
          {
            model: OrderItem,
            as: "orderItems",
            where: { itemable_type: "dispatch" },
            include: [
              // {
              //   model: ActivityLog,
              //   as: "activityLog",
              //   where: { entity_type: "CrmDispatch" },
              //   required: false,
              //   attributes: [
              //     "id",
              //     "entity_type",
              //     "operation_type",
              //     "performed_by_id",
              //     "changes",
              //   ],
              //   include: [
              //     {
              //       model: User,
              //       as: "userDetails",
              //       required: false,

              //       attributes: ["name", "roleName"],
              //     },
              //   ],
              // },
              {
                model: Unit,
                as: "unitData",
                required: false,

                attributes: ["name"],
              },
              {
                model: Product,
                as: "product",
                required: false,

                attributes: ["id", "name"],
              },
              {
                model: CrmAllCustomer,
                as: "vendorData",
                required: false,

                include: [
                  {
                    model: PaymentTerm,
                    as: "paymentData",
                    required: false,

                    attributes: ["name"],
                  },
                ],
              },
              {
                model: CrmStatusLog,
                as: "statusLog",
                required: false,
                where: { status_loggable_type: "CrmDispatchShortage" },
                include: [
                  {
                    model: Role,
                    required: false,
                    as: "role",
                    attributes: ["name"],
                  },
                  { model: User, as: "userDetail", attributes: ["name"] },
                ],
              },
            ],
          },
          {
            model: Document,
            as: "freezDocument",
            where: { documentable_type: "CrmDispatchFreez" },
            required: false,
            // attributes: ["id", "path", "fileName"],
            include: [
              {
                model: CrmStatusLog,
                as: "dispatchFreezLog",
                required: false,
                where: { status_loggable_type: "CrmDispatchFreez" },
                attributes: [
                  "role_id",
                  "status_loggable_id",
                  "status",
                  "comment",
                  "updatedAt",
                ],
                include: [
                  {
                    model: Role,
                    as: "role",
                    attributes: ["name"],
                  },
                  { model: User, as: "userDetail", attributes: ["name"] },
                ],
              },
            ],
          },

          {
            model: Document,
            as: "documentData",
            required: false,
            where: { documentable_type: "CrmDispatchFinance" },
            attributes: ["id", "path", "fileName", "status"],
            include: [
              {
                model: CrmStatusLog,
                as: "dispatchFinancelog",
                required: false,
                where: { status_loggable_type: "CrmDispatchFinance" },
                attributes: [
                  "role_id",
                  "status_loggable_id",
                  "status",
                  "comment",
                  "updatedAt",
                ],
                include: [
                  {
                    model: Role,
                    as: "role",
                    attributes: ["name"],
                  },
                  { model: User, as: "userDetail", attributes: ["name"] },
                ],
              },
            ],
          },
          {
            model: CrmTransportations,
            as: "transportationDetail",
            required: false,
            include: [
              {
                model: Document,
                required: false,
                as: "transporterDocumentData",
                where: { documentable_type: "CrmDispatchTransporter" },
                // attributes: ["id", "documentTypeId", "path", "fileName"],
              },
            ],
          },
          {
            model: CrmDispatchEwayBill,
            as: "ewaybilldetail",
            required: false,
          },
          {
            model: Order,
            as: "singleOrder",
            attributes: [
              "status_by_scm",
              "status_by_sales",
              "status_by_finance",
            ],
          },
          {
            model: CrmStatusLog,
            as: "statusLog",
            required: false,
            where: { status_loggable_type: "CrmDispatchStatus" },
            include: [
              {
                model: Role,
                as: "role",
                attributes: ["name"],
              },
              { model: User, as: "userDetail", attributes: ["name"] },
            ],
          },
        ],
      });

      if (!dispatch) {
        return failed(res, "Dispatch not found.");
      }
      // return(res,dispatch)
      let totalProfit = 0;
      let grandTotalAmount = 0;
      // Calculate profit from order items
      dispatch.orderItems.forEach((item) => {
        const price = parseFloat(item.price);
        const salesPriceRange = parseFloat(item.sales_price_range);
        const quantity = parseFloat(item.quantity);

        if (!isNaN(price) && !isNaN(salesPriceRange) && !isNaN(quantity)) {
          totalProfit += (price - salesPriceRange) * quantity;
        }

        const taxableAmount = price * quantity;
        const totalAmount =
          taxableAmount * (item.gst_rate / 100) + taxableAmount;
        grandTotalAmount += totalAmount;
      });

      const frightCharges = parseFloat(dispatch.frightCharges);
      dispatch.dataValues.poAmount = grandTotalAmount;
      if (!isNaN(frightCharges)) {
        const finalProfit = totalProfit - frightCharges;
        dispatch.dataValues.profit = finalProfit;
        dispatch.dataValues.profitability = frightCharges
          ? parseFloat(((finalProfit / frightCharges) * 100).toFixed(2))
          : 0;
      } else {
        dispatch.dataValues.profit = 0;
        dispatch.dataValues.profitability = 0;
      }

      // console.log("Dispatch object before sending response:", { dispatch });

      // return success(res, dispatch);

      // console.log({ dispatch });

      let orderparams = {};
      if (dispatch.workspaceId > 1) {
        orderparams = {
          id: dispatch.orderId,
          workspaceId: dispatch.workspaceId,
        };
      } else {
        orderparams = { id: dispatch.orderId };
      }
      console.log({ orderparams });
      const order = await Order.findOne({
        where: orderparams,
        include: [
          {
            model: OrderItem,
            as: "orderItems",
            where: { itemable_type: "order" },
            include: [
              // {
              //   model: Document,
              //   as: "documentData",
              //   where: { documentable_type: "CrmDispatch" },
              //   required: false,
              // },
              {
                model: Unit,
                as: "unitData",
                attributes: ["name"],
              },
              {
                model: Product,
                as: "product",
                attributes: ["id", "name"],
              },
            ],
            attributes: ["id", "product_id", "quantity", "vendorId", "make"],
          },
        ],
        attributes: ["id", "order_no"],
      });

      if (!order) {
        return failed(res, "Order not found.");
      }
      const newData = {
        order,
        dispatch,
      };
      return success(res, "Data fetched successfully.", newData);
    } catch (error) {
      console.error("Error updating order:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  //update subdispatch with order items
  updateSubdispatch: async (req, res) => {
    try {
      const requests = req.body;

      // Validate the incoming request
      const v = new Validator(requests, {
        dispatchId: "required",
        workspaceId: "required",
        type: "required",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }

      let userId = req.decodedData.id;
      const user = await User.findOne({ where: { id: userId } });

      if (!user) {
        return res.failed("User not found.");
      }
      //check credit limit status approved or not
      const orderCheck = await Order.findOne({
        where: { id: req.body.orderId },
      });

      if (!orderCheck) {
        return failed(res, "order not found.");
      }

      const customerCheck = await CrmAllCustomer.findOne({
        where: { id: orderCheck.customerId },
      });
      // if (
      //   customerCheck.creditLimitstatus == "pending" ||
      //   customerCheck.creditLimitstatus == "declined"
      // ) {
      //   return failed(res, "Customer credit limit is not approved");
      // }
      const orderItem = req.body.orderItem;
      const reqData = {
        userId: userId,
        orderId: req.body.orderId,
        workspaceId: req.body.workspaceId,
        priceBasis: req.body.priceBasis,
        frightCharges: req.body.frightCharges,
        tat: req.body.tat,
        tat_approved_by: req.body.tat_approved_by || null,
        actionBy: req.body.actionBy || null,
        isPlanning: req.body.isPlanning,
        status: req.body.status,
        remark: req.body.remark,
      };

      // Find the existing subdispatch to update
      const subdispatch = await CrmSubdispatch.findOne({
        where: {
          id: req.body.dispatchId,
          workspaceId: req.body.workspaceId,
        },
      });

      if (!subdispatch) {
        return failed(res, "Subdispatch record not found.");
      }

      // Update the existing subdispatch record
      await subdispatch.update(reqData);

      // Check if order items exist and update them
      if (orderItem && orderItem.length > 0) {
        const requestData = Array.isArray(orderItem)
          ? orderItem
          : JSON.parse(orderItem);
        const normalizedOrderItems = Array.isArray(requestData)
          ? requestData
          : [requestData];

        let totalExistingDispatchQuantity = 0;

        for (let i = 0; i < normalizedOrderItems.length; i++) {
          const element = normalizedOrderItems[i];
          // const uniqueTotalQuantity = normalizedOrderItems
          //   .filter(
          //     (item) =>
          //       parseInt(item.orderDetails.productId) ===
          //       parseInt(element.orderDetails.productId)
          //   )
          //   .reduce(
          //     (sum, item) => sum + parseFloat(item.orderDetails.quantity),
          //     0
          //   );


        const uniqueTotalQuantity = normalizedOrderItems.reduce((sum, item) => {
          if (
              Number(item.orderDetails.productId) === Number(element.orderDetails.productId) &&
              Number(item.orderDetails.varientId) === Number(element.orderDetails.varientId)
          ) {
              return sum + Number(item.orderDetails.quantity);
          }
          return sum;
      }, 0);

          // Delete all existing dispatch data related to the same productId and orderId
          // const subdispatchRecords = await CrmSubdispatch.findAll({
          //   where: { orderId: subdispatch.orderId },
          // });
          // // Loop through each subdispatch entry
          // for (let subdispatch of subdispatchRecords) {
          //   // Sum the dispatch quantities for each subdispatch entry and add to the total
          //   const quantitySum = await OrderItem.sum("quantity", {
          //     where: {
          //       itemable_id: subdispatch.id,
          //       itemable_type: "dispatch",
          //       dispatchIsPlanning: parseInt(req.body.isPlanning),
          //       product_id: element.orderDetails.productId, // Ensure this matches the product
          //     },
          //   });
          //   // console.log("dispatch qty", quantitySum);
          //   // Accumulate the total quantity
          //   totalExistingDispatchQuantity += quantitySum || 0;
          // }

          // Find the original order quantity for the product
          const orderQty = await OrderItem.findOne({
            where: {
              itemable_id: req.body.orderId,
              product_id: element.orderDetails.productId,
              itemable_type: "order",
              varientId:element.orderDetails.varientId
            },
          });

          if (!orderQty) {
            return failed(res, `Order for this product not found.`);
          }
          // console.log({ uniqueTotalQuantity });

          // console.log("orderQty", orderQty.quantity);
          // Calculate the total dispatched quantity including the new quantity
          // const totalDispatchedQuantity =
          //   (totalExistingDispatchQuantity
          //     ? totalExistingDispatchQuantity
          //     : 0) + element.orderDetails.quantity;

          const totalDispatchedQuantity =
            parseFloat(totalExistingDispatchQuantity) || 0;

          // Check if the total dispatched quantity exceeds the original order quantity
          if (uniqueTotalQuantity > orderQty.quantity) {
            return failed(
              res,
              `The quantity for product ${orderQty.name} exceeds the allowed order quantity. Maximum allowed: ${orderQty.quantity}.`
            );
          }
        }
        await OrderItem.destroy({
          where: {
            itemable_id: req.body.dispatchId,
            // product_id: element.orderDetails.productId,
            itemable_type: "dispatch",
          },
        });
        // After deleting the old dispatch data, prepare the new order data if order items exist
        await prepareOrderData(
          orderItem,
          subdispatch.id,
          req.body.workspaceId,
          req.body.type,
          req.body.isPlanning
        );
      }

      return success(res, "Subdispatch updated successfully.", req.body);
    } catch (error) {
      console.error("Error updating subdispatch:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  // Update status for Sales, Finance, and SCM departments
  updateDeptStatus: async (req, res) => {
    try {
      const {
        department,
        status,
        orderId,
        comment,
        type,
        role_id,
        workspaceId,
      } = req.body;

      // Validate the incoming request
      const v = new Validator(req.body, {
        department: "required",
        status: "required",
        orderId: "required",
        workspaceId: "required",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }
      // Custom check if `department` is not one of the allowed values
      const allowedDepartments = ["sales", "scm", "finance"];
      if (!allowedDepartments.includes(req.body.department)) {
        return failed(res, "You cannot change the status.");
      }
      // Dynamically set the status and comment fields based on the department
      const updateFields = {};
      switch (department) {
        case "sales":
          updateFields.status_by_sales = status;
          updateFields.comment_by_sales = comment;
          break;
        case "scm":
          updateFields.status_by_scm = status;
          updateFields.comment_by_scm = comment;
          break;
        case "finance":
          updateFields.status_by_finance = status;
          updateFields.comment_by_finance = comment;
          updateFields.finance_user_id = req.decodedData.id;
          break;
        default:
          return success(res, "Invalid department");
      }

      // Retrieve the original order data before updating (for logging purposes)
      const originalOrder = await Order.findOne({ where: { id: orderId } });

      if (!originalOrder) {
        return notFound(res, "Order not found");
      }

      // Update the order with the appropriate fields
      await Order.update(updateFields, {
        where: { id: orderId },
      });
      const user = await User.findOne({ where: { id: req.decodedData.id } });
      updateFields.username = user.name;
      updateFields.department = user.department;

      // Log the update activity, including both the original and updated data

      await CrmStatusLog.create({
        userId: req.decodedData.id,
        role_id: role_id,
        status_loggable_type: type || "CrmDispatchDept",
        status_loggable_id: orderId,
        status: status,
        comment: comment,
      });

      // Fetch updated order to check its status
      const order = await Order.findOne({
        where: { id: orderId },
      });

      if (
        order.status_by_sales === "approved" &&
        order.status_by_finance === "approved"
      ) {
        let htmlContent;
        try {
          htmlContent = fs.readFileSync(
            "views/emails/salesgo_customer_orderconfirmation.ejs",
            "utf-8"
          );
          headhtmlContent = fs.readFileSync(
            "views/emails/approveOrder.ejs",
            "utf-8"
          );
        } catch (err) {
          console.error("Error reading EJS template file:", err);
          return serverError(res, "Failed to read template file");
        }

        // Fetch customer and workspace details
        const customer = await CrmAllCustomer.findOne({
          where: { id: order.customerId },
        });
        if (!customer) {
          return failed(res, "Customer not found.");
        }

        const workspace = await Workspace.findOne({
          where: { id: order.workspaceId },
        });
        if (!workspace) {
          return failed(res, "Workspace not found.");
        }

        // Format the date
        const formattedDate = new Date(order.createdAt)
          .toLocaleDateString("en-GB")
          .replace(/\//g, "-");

        // Dynamic data for EJS template
        const dynamicData = {
          order_no: order.order_no,
          // amount: requests.amount,
          customerName: customer.name,
          date: formattedDate,
          url: "https://crm.mvikas.in/",
          team: workspace.name,
          legal_name: workspace.legal_name,
          address: workspace.address,
          phone: workspace.phone,
          email: workspace.email,
          banner: workspace.banner_path,
          imageUrl: workspace.logo_path,
                    workspaceName:workspace.name

        };

        const compiledHtml = ejs.render(htmlContent, dynamicData);
        // Notification email details
        let entities = [
          {
            email: customer.email,
            ids: customer.id,
            subject: `Confirmation of order no. ${order.order_no} dated ${formattedDate}`,
            html: compiledHtml,
          },
        ];

        // Fetch the latest finance and sales users
        const financeUser = await User.findAll({
          where: { department: "finance" },
          order: [["id", "DESC"]],
          // limit: 1,
        });
        const financeEmails = financeUser.map((user) => user.email);
        const financeIds = financeUser.map((user) => user.id);
        const salesUser = await User.findAll({
          where: { department: "sales" },
          order: [["id", "DESC"]],
          // limit: 1,
        });
        const salesEmails = salesUser.map((user) => user.email);
        const salesIds = salesUser.map((user) => user.id);
        // Separate dynamic data for sales and finance teams
        const dynamicDataSales = {
          order_no: order.order_no,
          name: salesUser ? salesUser.name : "Sales Team",
          customerName: customer.name,
          date: formattedDate,
          url: "https://crm.mvikas.in/",
          team: workspace.name,
          legal_name: workspace.legal_name,
          address: workspace.address,
          phone: workspace.phone,
          email: workspace.email,
          banner: workspace.banner_path,
          imageUrl: workspace.logo_path,
          workspaceName: workspace.name,
          workspaceEmail: workspace.email,
          workspacePhone: workspace.phone,
        };

        const dynamicDataFinance = {
          order_no: order.order_no,
          name: financeUser ? financeUser.name : "Finance Team",
          customerName: customer.name,
          date: formattedDate,
          url: "https://crm.mvikas.in/",
          team: workspace.name,
          legal_name: workspace.legal_name,
          address: workspace.address,
          phone: workspace.phone,
          email: workspace.email,
          banner: workspace.banner_path,
          imageUrl: workspace.logo_path,
          workspaceName:workspace.name,
          workspacePhone:workspace.phone,
          workspaceEmail:workspace.email

        };

        // Compile HTML content for each team
        const compiledSalesHtml = ejs.render(headhtmlContent, dynamicDataSales);
        const compiledFinanceHtml = ejs.render(
          headhtmlContent,
          dynamicDataFinance
        );

        // Prepare notification entities
        let notificationEntities = [];

        // Add finance team email if available
        // if (financeUser && financeEmails) {
        notificationEntities.push({
          email: financeEmails,
          ids: financeIds,
          // subject: `Order Confirmation for Finance - Order No. ${order.order_no} dated ${formattedDate}`,
          subject: `A order ${order.order_no} has been approved`,
          html: compiledFinanceHtml,
        });
        // }

        // Add sales team email if available
        // if (salesUser && salesEmails) {
        notificationEntities.push({
          email: salesEmails,
          ids: salesIds,
          // subject: `Order Confirmation for Sales - Order No. ${order.order_no} dated ${formattedDate}`,
          subject: `A order ${order.order_no} has been approved`,
          html: compiledSalesHtml,
        });
        // }
        // Send notifications to finance and sales teams if entities exist

        if (notificationEntities.length > 0) {
          await sendNotificationEmail(
            notificationEntities,
            "salesgo_approved_order",
            "user",
            workspaceId
          );
        }
        // Send the email if entities array is not empty
        if (entities.length > 0) {
          await sendNotificationEmail(
            entities,
            "salesgo_customer_orderconfirmation",
            "customer",
            workspaceId
          );
        }
      }
      return success(res, "Status updated successfully");
    } catch (error) {
      console.error("Error updating department status:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  //upload document
  //Freez doc , upload-customer-po,
  uploadPo: async (req, res) => {
    try {
      const { customerPO, type, orderItemId, documentType, workspaceId } =
        req.body;
      const userId = req.decodedData.id;

      // Get user details
      const user = await User.findOne({ where: { id: userId } });
      if (!user) {
        return failed(res, "User not found.");
      }

      // Handle documents and upload
      const customerPODoc = await handleDocuments(
        customerPO,
        userId,
        orderItemId,
        documentType,
        type
      );

      if (!customerPODoc || customerPODoc.length === 0) {
        return failed(res, "No documents to upload.");
      }
      if (customerPODoc.length === 4) {
        await CrmSubdispatch.update(
          { status: "freezed" },
          { where: { id: orderItemId } }
        );
        let htmlContent;
        try {
          htmlContent = fs.readFileSync(
            "views/emails/salesgo_subdispatch_approval.ejs",
            "utf-8"
          );
        } catch (err) {
          console.error("Error reading EJS template file:", err);
          return serverError(res, "Failed to read template file");
        }
        const subdispatchData = await CrmSubdispatch.findOne({
          where: { id: orderItemId },
        });
        const order = await Order.findOne({
          where: { id: subdispatchData.orderId },
        });
        const customer = await CrmAllCustomer.findOne({
          where: { id: order.customerId },
        });
        const workspace = await Workspace.findOne({
          where: { id: order.workspaceId },
        });
        const formattedDate = new Date(order.createdAt)
          .toLocaleDateString("en-GB")
          .replace(/\//g, "-");

        const dynamicData = {
          dispatchId: orderItemId,
          order_no: order.order_no,
          // amount: requests.amount,
          customerName: customer.name,
          date: formattedDate,
          url: "https://crm.mvikas.in/",
          team: workspace.name,
          legal_name: workspace.legal_name,
          address: workspace.address,
          phone: workspace.phone,
          email: workspace.email,
          banner: workspace.banner_path,
          imageUrl: workspace.logo_path,
        };
        const compiledHtml = ejs.render(htmlContent, dynamicData);
        const scmUser = await User.findAll({
          where: { department: "scm" },
          order: [["id", "DESC"]],
          // limit: 1,
        });
        const scmEmails = scmUser.map((user) => user.email);
        const scmIds = scmUser.map((user) => user.id);
        let entities = [];

        entities.push({
          email: scmEmails,
          ids: scmIds,
          subject: `SalesGo Subdispatch Approval for Order No. ${order.order_no}`,
          html: compiledHtml,
        });

        if (entities.length > 0) {
          // console.log({ entities });
          await sendNotificationEmail(
            entities,
            "salesgo_subdispatch_approval",
            "user",
            workspaceId
          );
        }
      }

      // Bulk create documents
      const createdDocuments = await Document.bulkCreate(customerPODoc);

      if (type === "CrmDispatch") {
        // Fetch the order item
        const orderItem = await OrderItem.findOne({
          where: { id: orderItemId },
        });
        if (!orderItem) {
          return failed(res, "Order item not found.");
        }

        // Store original order details for logging
        const originalOrder = orderItem.toJSON();

        // Add user details to each document for logging purposes
        const updatedFields = createdDocuments.map((doc) => ({
          ...doc.toJSON(),
          username: user.name,
          department: user.department,
        }));

        // Log the update activity, including both the original and updated data
        await ActivityLog.create({
          entity_id: orderItemId,
          entity_type: "CrmDispatch",
          operation_type: "UPDATE",
          performed_by_id: userId,
          changes: {
            before: originalOrder,
            after: updatedFields,
          },
        });
      }

      return success(res, "Document uploaded successfully.");
    } catch (error) {
      console.error("Error uploading document:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  generatePoStatus: async (req, res) => {
    try {
      const requests = req.body;
      const validate = new Validator(requests, {
        type: "required",
        dispatchId: "required",
        vendorId: "required",
        department: "required",
        workspaceId: "required",
        document_type_id: "required",
        status: "required",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      // Custom check if `department` is not one of the allowed values
      const allowedDepartments = ["sales", "scm", "finance"];
      if (!allowedDepartments.includes(req.body.department)) {
        return failed(res, "You cannot change the status.");
      }
      const {
        type,
        dispatchId,
        vendorId,
        department,
        workspaceId,
        document_type_id,
        status,
        comment,
      } = req.body;
      // Dynamically set the status and comment fields based on the department
      const updateFields = {};
      switch (department) {
        case "sales":
          updateFields.sales_status = status;
          updateFields.sales_comment = comment;
          updateFields.vendorId = vendorId;
          break;
        case "scm":
          updateFields.scm_status = status;
          updateFields.scm_comment = comment;
          updateFields.vendorId = vendorId;

          break;
        case "finance":
          updateFields.finance_status = status;
          updateFields.finance_comment = comment;
          updateFields.vendorId = vendorId;

          break;
        default:
          return failed(res, "Invalid department");
      }

      // Update the order with the appropriate fields
      await OrderItem.update(updateFields, {
        where: {
          itemable_id: dispatchId,
          itemable_type: "dispatch",
          vendorId: vendorId,
        },
      });
      if (type === "CrmDispatch") {
        const userId = req.decodedData.id;

        // Fetch User Details
        const user = await User.findOne({ where: { id: userId } });
        if (!user) {
          return failed(res, "User not found.");
        }

        // Prepare afterData for logging
        const afterData = [
          {
            id: dispatchId,
            status,
            userId,
            comment,
            username: user.name,
            createdAt: new Date(),
            department,
            documentTypeId: document_type_id,
            documentable_id: dispatchId,
            documentable_type: "CrmDispatch",
          },
        ];

        // Log the update activity
        await ActivityLog.create({
          entity_id: dispatchId,
          entity_type: "CrmDispatch",
          operation_type: "UPDATE",
          performed_by_id: userId,
          changes: {
            after: afterData, // Directly using the object
          },
        });
      }
      return success(res, "Data updated successfully,");
    } catch (error) {
      console.error("Error uploading document:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  generatePoHistory: async (req, res) => {
    try {
      const requests = req.query;
      const validate = new Validator(requests, {
        dispatchId: "required",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const history = await ActivityLog.findAll({
        where: { entity_id: requests.dispatchId, entity_type: "CrmDispatch" },
      });
      return success(res, "Data fetched successfully.", history);
    } catch (error) {
      console.error("Error uploading document:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  //add subdispatch
  addSubdispatchPaymentRequest: async (req, res) => {
    try {
      const requests = req.body;
      const validate = new Validator(requests, {
        workspaceId: "required",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const orderItemData = await OrderItem.findOne({
        where: {
          itemable_id: requests.sub_dispatch_id,
          itemable_type: "dispatch",
        },
        attributes: ["id", "vendorId"],
      });

      const vendorId = orderItemData.dataValues.vendorId;
      const subdispatch = await CrmSubdispatch.findOne({
        where: { id: requests.sub_dispatch_id },
        include: [
          {
            model: OrderItem,
            as: "orderItems",
            where: { itemable_type: "dispatch", vendorId: vendorId },
          },
        ],
      });
      if (!subdispatch) {
        return failed(res, "Subdispatch is not found.");
      }
      if (requests.vendorId) {
        const vendor = await CrmAllCustomer.findOne({
          where: { id: requests.vendorId },
        });
        if (!vendor) {
          return failed(res, "Vednor not found.");
        }
      }
      // const dispatchAmountSum = await CrmSubDispatchPayments.sum("amount", {
      //   where: { id: requests.sub_dispatch_id, type: requests.type },
      // });
      let grandTotalAmount = 0;

      // Calculate the grand total amount from order items
      subdispatch.orderItems.forEach((item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseFloat(item.quantity) || 0;

        const taxableAmount = price * quantity;
        const totalAmount =
          taxableAmount * (item.gst_rate / 100) + taxableAmount;

        grandTotalAmount += totalAmount;
      });

      // Fetch the most recent payment for the sub_dispatch_id
      const previousPayment = await CrmSubDispatchPayments.findOne({
        where: { sub_dispatch_id: requests.sub_dispatch_id },
        order: [["id", "DESC"]],
      });

      let balanceAmount;

      // Calculate the new balanceAmount based on the grandTotalAmount and previous payment
      if (previousPayment) {
        // If a previous payment exists, adjust balance based on it
        const previousBalance = parseFloat(previousPayment.balanceAmount) || 0;
        balanceAmount = previousBalance - parseFloat(requests.amount);
        console.log({ previousBalance });
        console.log({ balanceAmount });
        console.log("{ balanceAmount }", requests.amount);
        // Ensure balance does not go below zero
        if (balanceAmount < 0) {
          return failed(res, "Amount exceeds the available balance.");
        }
      } else {
        // If no previous payment, calculate balance directly from grandTotalAmount
        if (requests.vendorId) {
          balanceAmount = grandTotalAmount - parseFloat(requests.amount);
        } else {
          balanceAmount =
            parseFloat(subdispatch.frightCharges) - parseFloat(requests.amount);
        }

        // Ensure balance does not go below zero
        if (balanceAmount < 0) {
          return failed(
            res,
            "Amount exceeds the total payable amount for this dispatch."
          );
        }
      }

      // return success(res, balanceAmount);
      const userId = req.decodedData.id;
      const reqData = {
        userId: userId,
        sub_dispatch_id: requests.sub_dispatch_id,
        vendorId: requests.vendorId,
        transportationId: requests.transportationId,
        amount: requests.amount,
        type: requests.type,
        attachmentName: requests.attachmentName,
        supportingDocument: requests.supportingDocument,
        comment: requests.comment,
        balanceAmount: balanceAmount,
      };

      // Create a new payment record
      await CrmSubDispatchPayments.create(reqData);

      let htmlContent;
      try {
        htmlContent = fs.readFileSync(
          "views/emails/paymentRequest.ejs",
          "utf-8"
        );
      } catch (err) {
        console.error("Error reading EJS template file:", err);
        return serverError(res, "Failed to read template file");
      }
      const subdispatchData = await CrmSubdispatch.findOne({
        where: { id: requests.sub_dispatch_id },
      });
      const order = await Order.findOne({
        where: { id: subdispatchData.orderId },
      });
      const customer = await CrmAllCustomer.findOne({
        where: { id: order.customerId },
      });
      const workspace = await Workspace.findOne({
        where: { id: order.workspaceId },
      });
      const formattedDate = new Date(order.createdAt)
        .toLocaleDateString("en-GB")
        .replace(/\//g, "-");

      const dynamicData = {
        order_no: order.order_no,
        amount: requests.amount,
        customerName: customer.name,
        date: formattedDate,
        url: "https://crm.mvikas.in/",
        team: workspace.name,
        legal_name: workspace.legal_name,
        address: workspace.address,
        phone: workspace.phone,
        email: workspace.email,
        banner: workspace.banner_path,
        imageUrl: workspace.logo_path,
      };
      const compiledHtml = ejs.render(htmlContent, dynamicData);
      // Fetch the latest finance user
      const financeUser = await User.findAll({
        where: { department: "finance" },
        order: [["id", "DESC"]],
        // limit: 1,
      });
      const finaceIds = financeUser.map((user) => user.id);
      const finaceEmails = financeUser.map((user) => user.email);
      // Fetch the latest sales user
      const salesUser = await User.findAll({
        where: { department: "sales" },
        order: [["id", "DESC"]],
        // limit: 1,
      });
      const salesIds = salesUser.map((user) => user.id);
      const salesEmails = salesUser.map((user) => user.email);

      let entities = [];

      // Check if financeUser and salesUser exist before proceeding
      if (!financeUser || !salesUser) {
        return serverError(res, "Finance or Sales user not found.");
      }

      // Check request type and add to entities if conditions are met
      if (
        (requests.type === "transporter" && requests.transportationId) ||
        (requests.type === "vendor" && requests.vendorId)
      ) {
        entities.push(
          {
            email: finaceEmails,
            ids: finaceIds,
            subject: `Payment Request for ${workspace.name} PO No. ${order.customer_po_no}`,
            html: compiledHtml,
          },
          {
            email: salesEmails,
            ids: salesIds,
            subject: `Payment Request for ${workspace.name} PO No. ${order.customer_po_no}`,
            html: compiledHtml,
          }
        );
      }
      // console.log(entities); return 1;
      // Send notification email if entities array is not empty
      if (entities.length > 0) {
        await sendNotificationEmail(
          entities,
          "salesgo_payment_request",
          "user",
          requests.workspaceId
        );
      }

      return success(res, "Data added successfully.", reqData);
    } catch (error) {
      console.error("Error uploading document:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  //Report shortage excess
  reportShortageExcess: async (req, res) => {
    try {
      const requests = req.body;

      // Validate the incoming request
      const v = new Validator(requests, {
        orderItemId: "required",
        shortageExcessType: "required",
        shortageExcessUnitTypeId: "required",
        // shortageExcessComment: "required",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }

      const reqData = {
        id: requests.orderItemId,
        shortage_excess_type: requests.shortageExcessType,
        shortage_excess_unit_type_id: requests.shortageExcessUnitTypeId,
        shortage_excess_action_by: req.decodedData.id,
        shortage_excess_comment: requests.shortageExcessComment,
        shortage_excess_doc: requests.shortagExcessDoc,
        shortage_excess_value: requests.shortageExcessValue,
        shortage_excess_status: requests.shortage_excess_status,
      };
      await OrderItem.update(reqData, { where: { id: requests.orderItemId } });
      return success(res, "Data saved successfully.", reqData);
    } catch (error) {
      console.error("Error uploading document:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  updateReportShortageExcess: async (req, res) => {
    try {
      const requests = req.body;

      // Validate the incoming request
      const v = new Validator(requests, {
        shortage_excess_status: "required",
        orderItemId: "required",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }

      const reqData = {
        shortage_excess_status: requests.shortage_excess_status,
        shortage_excess_comment: requests.shortage_excess_comment,
      };

      await CrmStatusLog.create({
        userId: req.decodedData.id,
        role_id: requests.role_id,
        status_loggable_type: "CrmDispatchShortage",
        status_loggable_id: requests.orderItemId,
        status: requests.shortage_excess_status,
        comment: requests.shortage_excess_comment,
      });
      await OrderItem.update(reqData, { where: { id: requests.orderItemId } });
      return success(res, "Status updated successfully.", reqData);
    } catch (error) {
      console.error("Error uploading document:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  updatePaymentStatus: async (req, res) => {
    try {
      const {
        role_id,
        status_loggable_type,
        status_loggable_id,
        status,
        comment,
        workspaceId,
      } = req.body;

      // Validate the incoming request
      const v = new Validator(req.body, {
        status: "required",
        workspaceId: "required",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }

      // Log the update activity, including both the original and updated data
      const reqData = await CrmStatusLog.create({
        userId: req.decodedData.id,
        role_id: role_id,
        status_loggable_type: status_loggable_type,
        status_loggable_id: status_loggable_id,
        status: status,
        comment: comment,
      });

      if (status_loggable_type == "CrmDispatchPayment") {
        let htmlContent;
        try {
          htmlContent = fs.readFileSync(
            "views/emails/salesgo_vendor_payment.ejs",
            "utf-8"
          );
        } catch (err) {
          console.error("Error reading EJS template file:", err);
          return serverError(res, "Failed to read template file");
        }
        const subdispatchDataPayement = await CrmSubDispatchPayments.findOne({
          where: { id: status_loggable_id },
        });
        const subdispatchData = await CrmSubdispatch.findOne({
          where: { id: subdispatchDataPayement.sub_dispatch_id },
        });
        const order = await Order.findOne({
          where: { id: subdispatchData.orderId },
        });
        const vendor = await CrmAllCustomer.findAll({ where: { type: 2 } });
        const vendorIds = vendor.map((user) => user.id);
        const vendorEmails = vendor.map((user) => user.email);
        const workspace = await Workspace.findOne({
          where: { id: order.workspaceId },
        });
        const formattedDate = new Date(order.createdAt)
          .toLocaleDateString("en-GB")
          .replace(/\//g, "-");

        const dynamicData = {
          paymentReqId: subdispatchDataPayement.id,
          order_no: order.order_no,
          amount: subdispatchDataPayement.amount,
          vendorName: vendor.name,
          date: formattedDate,
          url: "https://crm.mvikas.in/",
          team: workspace.name,
          legal_name: workspace.legal_name,
          address: workspace.address,
          phone: workspace.phone,
          email: workspace.email,
          banner: workspace.banner_path,
          imageUrl: workspace.logo_path,
        };
        const compiledHtml = ejs.render(htmlContent, dynamicData);

        let entities = [];

        entities.push({
          email: vendorEmails,
          ids: vendorIds,
          subject: `SalesGo Subdispatch Approval for Order No. ${order.order_no}`,
          html: compiledHtml,
        });

        if (entities.length > 0) {
          // console.log({ entities });
          await sendNotificationEmail(
            entities,
            "salesgo_vendor_payment",
            "vendor",
            workspaceId
          );
        }
      }
      return success(res, "Status updated successfully", reqData);
    } catch (error) {
      console.error("Error updating department status:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  updatePaymentDoc: async (req, res) => {
    try {
      const requests = req.body;

      // Validate the incoming request
      const v = new Validator(requests, {
        paymentRequestId: "required",
        // workspaceId: "required",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }
      const checkPaymentReq = await CrmSubDispatchPayments.findOne({
        where: { id: requests.paymentRequestId },
      });

      if (!checkPaymentReq) {
        return failed(res, "Payment request not found.");
      }

      // Fetch the previous amount stored for the payment request
      const previousAmount = parseFloat(checkPaymentReq.amount) || 0;
      const newAmount = parseFloat(requests.amount) || 0;

      if (newAmount > checkPaymentReq.balanceAmount + previousAmount) {
        return failed(
          res,
          "Amount should be less or equal to the Balance Amount."
        );
      }

      // Calculate the new balance amount
      const updatedBalanceAmount =
        checkPaymentReq.balanceAmount + previousAmount - newAmount;

      const reqData = {
        attachmentName: requests.attachmentName,
        supportingDocument: requests.supportingDocument,
        amount: newAmount,
        balanceAmount: updatedBalanceAmount,
      };

      // Update the payment request with the new values
      await CrmSubDispatchPayments.update(reqData, {
        where: { id: requests.paymentRequestId },
      });

      return success(res, "Payment request updated successfully.");
    } catch (error) {
      console.error("Error uploading document:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  singleOrderItemDetail: async (req, res) => {
    try {
      const requests = req.query;

      // Validate the incoming request
      const v = new Validator(requests, {
        orderItemId: "required",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }
      const orderItemData = await OrderItem.findOne({
        where: { id: requests.orderItemId, itemable_type: "dispatch" },
        include: [
          {
            model: CrmSubdispatch,
            as: "SubdispacthData",
            attributes: ["id", "frightCharges"],
            include: [
              {
                model: Order,
                as: "order",
                required: false,
                attributes: ["id", "order_no"],
              },
              {
                model: CrmSubDispatchPayments,
                as: "paymentReqData",
                include: [
                  {
                    model: Document,
                    as: "documentData",
                    where: { documentable_type: "CrmDispatchPayment" },
                    attributes: ["id", "path", "status", "fileName"],
                    required: false,
                    include: {
                      model: CrmStatusLog,
                      as: "docLog",
                      required: false,
                      where: {
                        status_loggable_type: "CrmDispatchPaymentAttachment",
                      },
                      include: [
                        {
                          model: Role,
                          as: "role",
                          attributes: ["name"],
                        },
                        { model: User, as: "userDetail", attributes: ["name"] },
                      ],
                    },
                  },
                  {
                    model: CrmStatusLog,
                    as: "statusLog",
                    required: false,
                    where: { status_loggable_type: "CrmDispatchPayment" },
                    include: [
                      {
                        model: Role,
                        as: "role",
                        attributes: ["name"],
                      },
                      { model: User, as: "userDetail", attributes: ["name"] },
                    ],
                  },
                ],
              },
              {
                model: CrmTransportations,
                as: "crmTransportationsData",
              },
            ],
          },
          {
            model: CrmAllCustomer,
            as: "vendorData",
            attributes: ["name"],
          },
        ],
        attributes: ["id", "vendorId"],
      });

      const vendorId = orderItemData.dataValues.vendorId;
      // return success(
      //   res,
      //   vendorId
      // );
      const dispatch = await CrmSubdispatch.findOne({
        where: { id: orderItemData.dataValues.SubdispacthData.dataValues.id },
        include: [
          {
            model: OrderItem,
            as: "orderItems",
            where: { itemable_type: "dispatch", vendorId: vendorId },
          },
        ],
      });

      let grandTotalAmount = 0;
      // Calculate profit from order items
      dispatch.orderItems.forEach((item) => {
        const price = parseFloat(item.price);
        const quantity = parseFloat(item.quantity);
        console.log({ price });
        console.log({ quantity });

        const taxableAmount = price * quantity;
        const totalAmount =
          taxableAmount * (item.gst_rate / 100) + taxableAmount;

        grandTotalAmount += totalAmount;
      });
      orderItemData.dataValues.SubdispacthData.dataValues.poAmount =
        grandTotalAmount.toFixed(2);

      return success(res, "Data fetched successfully.", orderItemData);
    } catch (error) {
      console.error("Error uploading document:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  uploadDocuent: async (req, res) => {
    try {
      const requests = req.body;
      const reqData = {
        userId: req.decodedData.id,
        documentTypeId: requests.documentTypeId,
        documentable_type: requests.documentable_type,
        documentable_id: requests.documentable_id,
        path: requests.supportingDocument,
        fileName: requests.fileName,
      };
      await Document.create(reqData);
      return success(res, "Data uploaded successfully.", reqData);
    } catch (error) {
      console.error("Error uploading document:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  updateOrderStatus: async (req, res) => {
    try {
      const requests = req.body;

      // Validate the incoming request
      const v = new Validator(requests, {
        orderId: "required",
        status: "required",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }
      // Fetch the order
      const order = await Order.findOne({ where: { id: requests.orderId } });
      if (!order) {
        return failed(res, "Order not found.");
      }
      await Order.update(
        { status: requests.status },
        { where: { id: requests.orderId } }
      );

      return success(res, "Status updated successfully.");
    } catch (error) {
      console.error("Error uploading document:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  paymentReminder: async (req, res) => {
    try {
      const requests = req.body;

      // Validate the incoming request
      const v = new Validator(requests, {
        orderId: "required",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }
      const order = await Order.findOne({ where: { id: requests.orderId } });
      // const dynamicData = {
      //   customer_name: name,
      //   email: email,
      //   password: password,
      //   workspaceName: workspace.name ? workspace.name : "M-vikas",
      // };
      // const compiledHtml = ejs.render(htmlContent, dynamicData);
      const mailData = {
        to: order.email,
        subject: "Order Reminder",
        text: "This is you reminder.",
      };
      await sendmail({
        to: mailData.to,
        subject: mailData.subject,
        html: "This is gental reminder on your order.",
      });
      return success(res, "Reminder send successfully.");
    } catch (error) {
      console.error("Error uploading document:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  generatePo: async (req, res) => {
    try {
      const requests = req.body;

      // Validate the incoming request
      const v = new Validator(requests, {
        // orderItemId: "required",
        vendorId: "required",
        sub_dispatch_id: "required",
        orderId: "required",
        // email: "required",
        type: "required|in:send,preview",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }

      // Fetch orderItem details
      const orderItem = await OrderItem.findAll({
        where: {
          vendorId: requests.vendorId,
          itemable_id: requests.sub_dispatch_id,
          itemable_type: "dispatch",
        },
        include: [
          {
            model: Product,
            as: "product",
            required: false,
            include: [
              {
                model: ProductCombination,
                as: "combinationData",
                attributes: ["id", "productId", "variantName"],
                required: false,

                include: [
                  {
                    model: ProductCombinationValue,
                    as: "combinationValueData",
                    attributes: ["attributeValueId", "attributeId"],
                    required: false,

                    include: [
                      {
                        model: CrmAttribute,
                        as: "productAttribute",
                        required: false,

                        attributes: ["id", "name"],
                      },
                      {
                        model: CrmAttributeValue,
                        as: "productAttributeValue",
                        required: false,

                        attributes: ["id", "value"],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          // {
          //   model: CrmUnitType,
          //   as: "unitTypeData",
          //   required: false,

          //   attributes: ["name"],
          // },
          {
            model: Unit,
            as: "unitData",
            required: false,
            attributes: ["name"],
          },
        ],
      });
      // return success(res, orderItem);
      if (!orderItem) {
        return failed(res, "Order Item not found.");
      }
      // Fetch related order, vendor, workspace, and sub-dispatch details
      const order = await Order.findOne({ where: { id: requests.orderId } });
      // return success(res, order);
      const vendor = await CrmAllCustomer.findOne({
        where: { id: orderItem[0].vendorId },
      });
      const workspace = await Workspace.findOne({
        where: { id: order.workspaceId },
      });
      const CrmDispatch = await CrmSubdispatch.findOne({
        where: { id: orderItem[0].itemable_id },
      });

      if (!order || !vendor || !workspace || !CrmDispatch) {
        return failed(
          res,
          "Order, Vendor, Workspace, or Dispatch information not found."
        );
      }
      let mailData;
      // Prepare mail data
      if (requests.email) {
        mailData = {
          to: requests.email.split(","),
          cc: requests.ccEmails ? requests.ccEmails.split(",") : [],
          subject: "Purchase Order with Attachments",
          text: "Please find the attached purchase order details.",
        };
      }

      // Read and compile the EJS template
      let htmlContent;
      let emailHtmlContent;
      try {
        htmlContent = fs.readFileSync(
          "views/pdf_invoices/generate-po.ejs",
          "utf-8"
        );
        emailHtmlContent = fs.readFileSync(
          "views/emails/generate_po.ejs",
          "utf-8"
        );
      } catch (err) {
        console.error("Error reading EJS template file:", err);
        return serverError(res, "Failed to read template file.");
      }

      const payment = await PaymentTerm.findOne({
        where: { id: vendor.paymentTermId },
      });
      if (!payment) {
        return failed(res, "Payment terms not found.");
      }

      // Assuming orderItems is an array of multiple order items
      let grandTotalAmount = 0;

      // Calculate grand total from all order items
      orderItem.forEach((item) => {
        const taxableAmount = item.price * item.quantity;
        // If there are any discounts or additional calculations, you can modify it accordingly
        // const taxableAmount = (item.price * item.quantity) - item.discount;
        const totalAmount =
          taxableAmount * (item.gst_rate / 100) + taxableAmount;
        // console.log({ totalAmount });
        // Sum up the totalAmount for grand total
        grandTotalAmount += totalAmount;
      });

      // Convert grand total to words
      // const amountInWord = await numberToWords.toWords(grandTotalAmount);
      const amountInWord = await numberToword.numberToWords(
        parseFloat(grandTotalAmount)
      );

      const createdUser = await User.findOne({
        where: { id: CrmDispatch.userId },
      });
      // console.log({amountInWord});
      // return 1;
      // Dynamic data for the EJS template
      const dynamicData = {
        vendorName: vendor.name,
        vendorMobile: vendor.mobile,
        contactName: vendor.contactName,
        vendorGstIn: vendor.gstIn,
        vendorAddress: vendor.customerAddress,
        paymentTerm: payment.name,
        orderPo: order.customer_po_no,
        poDate: new Date(),
        workspaceGst: workspace.gst_tin,
        imageUrl: workspace.logo_path,
        banner: workspace.banner_path,

        modeOfDispatch: CrmDispatch.priceBasis,
        billTo: order.billing_address,
        billGst: order.billing_gst_tin,
        shipTo: order.shipping_address,
        shipGst: order.shipping_gst_tin,
        // taxableAmount: taxableAmount,
        amountInWord: amountInWord,
        // grandTotal: totalAmount,
        // gstAmount: taxableAmount,
        productName: orderItem.name,
        make: orderItem.make,
        quantity: orderItem.quantity,
        price: orderItem.price,
        gst_rate: orderItem.gst_rate,
        subtotal: orderItem.price,
        orderItems: orderItem,
        workspaceName: workspace.legal_name,
        workspaceEmail: workspace.email,
        workspacePhone: workspace.phone,
        workspaceAdminName: workspace.name,
        signature: createdUser.signature,
        createUser: createdUser.name,
        address: workspace.address,
      };
      let sendmsg;
      // return success(res, dynamicData);
      const compiledHtml = ejs.render(htmlContent, dynamicData);
      const emailCompilehtml = ejs.render(emailHtmlContent, dynamicData);
      if (requests.type == "send") {
        if (requests.medium == "mail") {
          // Generate the PDF
          const options = { format: "A4",  printBackground: true,
            mediaType: "screen", };
          const pdfBuffer = await pdf.generatePdf(
            { content: compiledHtml },
            options
          );

          // Save the PDF to S3
          const pdfFile = await uploadPdfToS3(pdfBuffer, "pdf", "Generate Po");

          if (!pdfFile) {
            return serverError(
              res,
              "Failed to upload PDF for email attachment."
            );
          }

          // return success(res,pdfFile.url)
          // Send the email
          const mailResponse = await sendmail({
            to: mailData.to,
            cc: mailData.cc,
            subject: mailData.subject,
            html: emailCompilehtml,
            attachments: [
              {
                filename: "Generate Po",
                path: pdfFile.url,
              },
            ],
          });
          if (mailResponse) {
            return success(res, "Email sent successfully!");
          } else {
            return serverError(res, "Failed to send email with attachments.");
          }
        } else {
          if (
            !Array.isArray(requests.phoneNumbers) ||
            requests.phoneNumbers.length === 0
          ) {
            return failed(res, "Phone numbers are required.");
          }
          // Prepare data for WhatsApp message
          const authKey = "329821AzZHpXuT64f1d624P1";
          const fromNumber = "919818105319";
          const templateName = "salesgo_po_approval";
          const languageCode = "en";
          const receiverNumbers = requests.phoneNumbers;

          // Check if company_logo and support_doc are available
          const components = {
            body_1: {
              type: "text",
              value: order.customer_po_no,
            },
            body_2: {
              type: "text",
              value: "value1",
            },
            body_3: {
              type: "text",
              value: order.order_no,
            },
            body_4: {
              type: "text",
              value: "https://crm.mvikas.in/",
            },
            body_5: {
              type: "text",
              value: workspace.legal_name,
            },
          };

          // Send WhatsApp message
          sendmsg = await sendWhatsAppMessage(
            authKey,
            fromNumber,
            templateName,
            languageCode,
            receiverNumbers,
            components
          );
        }
        return success(res, "Notification sent successfully.", sendmsg);
      } else {
        const options = { format: "A4" ,  printBackground: true,
            mediaType: "screen",};

        const pdfBuffer = await pdf.generatePdf(
          { content: compiledHtml },
          options
        );
        console.log("PDF Buffer:", { pdfBuffer });

        // Upload the PDF to S3 and get the file URL
        const pdfFile = await uploadPdfToS3(pdfBuffer, "pdf", "Customer PO");

        // Check if the PDF was successfully uploaded
        if (pdfFile) {
          return success(res, "Preview Po!", { url: pdfFile });
        } else {
          return serverError(res, "Failed to upload PDF.");
        }
      }
    } catch (error) {
      console.error("Error generating purchase order:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  dispatchOrderItemDelete: async (req, res) => {
    try {
      const requests = req.body;
      const v = new Validator(requests, {
        orderItemId: "required",
      });
      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }
      await OrderItem.destroy({
        where: { id: requests.orderItemId },
      });
      return success(res, "Item deleted successfully.");
    } catch (error) {
      console.error("Error generating purchase order:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  updateTransprter: async (req, res) => {
    try {
      const requests = req.body;

      // Validate the incoming request
      const v = new Validator(requests, {
        transporter_id: "required",
        payment_term_id: "required",
        driver_id: "required",
      });
      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }

      // Check if the transporter exists
      const transporter = await Transport.findOne({
        where: { id: requests.transporter_id },
      });
      if (!transporter) {
        return failed(res, "Transporter not found.");
      }

      // Check if the payment term exists
      const paymentTerm = await PaymentTerm.findOne({
        where: { id: requests.payment_term_id },
      });
      if (!paymentTerm) {
        return failed(res, "Payment term not found.");
      }

      // Check if the driver exists
      const driver = await CrmDriver.findOne({
        where: { id: requests.driver_id },
      });

      // Prepare the data to be updated or created
      const reqData = {
        sub_dispatch_id: requests.sub_dispatch_id,
        transporter_id: requests.transporter_id,
        driver_id: requests.driver_id,
        name: transporter.name,
        phone: transporter.mobile,
        address: transporter.address,
        email: transporter.email,
        payment_term_id: requests.payment_term_id,
        payment_terms: paymentTerm.name,
        freight: requests.freight,
        gstIn: transporter.gstIn,
        driver_name: driver.name,
        driver_phone: driver.contactNumber,
        vehicle_number: driver.vehicleNumber,
        vehicle_type_id: requests.vehicle_type_id,
        quantity: requests.quantity,
        builty_no_lr_no: requests.builty_no_lr_no,
        terms_of_delivery: requests.terms_of_delivery,
        test_certificate_no: requests.test_certificate_no,
        tracking_url: requests.tracking_url,
        capacity: requests.capacity,
        payment_term_method: requests.payment_term_method,
      };

      // Check if a transportation record already exists with the same sub_dispatch_id
      const existingTransport = await CrmTransportations.findOne({
        where: { sub_dispatch_id: requests.sub_dispatch_id },
      });

      let transportation;
      if (existingTransport) {
        // Delete previous documents if updating the same transportation
        await Document.destroy({
          where: {
            documentable_id: existingTransport.id,
            documentable_type: "CrmDispatchTransporter",
          },
        });
        // Update existing transportation record
        transportation = await existingTransport.update(reqData);
        await transportation.save();
      } else {
        // Create new transportation record
        transportation = await CrmTransportations.create(reqData);
      }

      // Get user details
      const userId = req.decodedData.id;
      const user = await User.findOne({ where: { id: userId } });
      let transporterDocument;
      if (requests.transporterDoc) {
        await Document.destroy({
          where: { documentable_id: transportation.id, department: "default" },
        });
        // Handle documents and upload
        transporterDocument = await handleDocuments(
          requests.transporterDoc,
          userId,
          transportation.id,
          "default",
          requests.type
        );
      }

      await Document.bulkCreate(transporterDocument);

      return success(res, "Transportation updated successfully.");
    } catch (error) {
      console.error("Error updating transportation:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  scmUsersList: async (req, res) => {
    try {
      const request = req.query;
      let params = { department: "scm" };

      // Fix: Added `where` for finding user by id
      const user = await User.findOne({ where: { id: req.decodedData.id } });
      if (!user) {
        return failed(res, "User not found.");
      }

      if (request.workspaceId > 1) {
        params = {
          [Op.and]: [
            { department: "scm" },
            { id: { [Op.ne]: user.id } },
            { workspaceId: request.workspaceId },
            { status: 1 },

          ],
        };
      } else {
        params = {
          [Op.and]: [{ department: "scm" }, { id: { [Op.ne]: user.id } },{status:1}],
        };
      }

      const usersList = await User.findAll({
        where: params,
        attributes: ["id", "name", "department", "workspaceId"],
      });

      return success(res, "SCM users list", usersList);
    } catch (error) {
      console.error("Error generating SCM users list:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  vehicleTypeList: async (req, res) => {
    const list = await CrmVehicleType.findAll();
    return success(res, "Data fetched successfully.", list);
  },
  addEwayBill: async (req, res) => {
    try {
      const requests = req.body;

      // Validate the incoming request
      const v = new Validator(requests, {
        ebillno: "required",
        sub_dispatch_id: "required",
      });
      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }
      const user = await User.findOne({ where: { id: req.decodedData.id } });
      const reqData = {
        sub_dispatch_id: requests.sub_dispatch_id,
        ebillno: requests.ebillno,
        from: requests.from,
        ewayDate: requests.ewayDate,
        ewayExpDate: requests.ewayExpDate,
        ewayFile: requests.ewayFile,
      };

      // Check if a record already exists for this sub_dispatch_id
      const existingEway = await CrmDispatchEwayBill.findOne({
        where: { sub_dispatch_id: requests.sub_dispatch_id },
      });

      let ewayBillRecord;
      if (existingEway) {
        // Delete previous documents if updating the same e-way bill
        await Document.destroy({
          where: {
            documentable_id: existingEway.id,
            documentable_type: "CrmDispatchEwayBill", // Make sure documentable_type is correct
          },
        });
        await CrmStatusLog.create({
          userId: req.decodedData.id,
          role_id: requests.role_id,
          status_loggable_type: "CrmDispatchEwayBill",
          status_loggable_id: existingEway.id,
          status: "Update",
          data: {
            ebillno: requests.ebillno,
            from: requests.from,
            ewayDate: requests.ewayDate,
            ewayExpDate: requests.ewayExpDate,
            ewayFile: requests.ewayFile,
          },
          // comment: requests.comment,
        });
        // Update existing e-way bill record
        ewayBillRecord = await existingEway.update(reqData);
      } else {
        // Create new e-way bill record
        ewayBillRecord = await CrmDispatchEwayBill.create(reqData);
        await CrmStatusLog.create({
          userId: req.decodedData.id,
          role_id: requests.role_id,
          status_loggable_type: "CrmDispatchEwayBill",
          status_loggable_id: ewayBillRecord.id,
          status: "Create",
          data: {
            ebillno: requests.ebillno,
            from: requests.from,
            ewayDate: requests.ewayDate,
            ewayExpDate: requests.ewayExpDate,
            ewayFile: requests.ewayFile,
          },
          // comment: requests.comment,
        });
      }

      return success(res, "E-way bill added or updated successfully", {
        ewayBill: ewayBillRecord,
      });
    } catch (error) {
      console.error("Error in adding/updating e-way bill:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  updateSubdispatchStatus: async (req, res) => {
    try {
      const {
        id,
        role_id,
        status_loggable_type,
        status_loggable_id,
        status,
        comment,
        isPlanning,
        workspaceId,
      } = req.body;

      // Validate the incoming request
      const v = new Validator(req.body, {
        // id: "required",
        status: "required",
        workspaceId: "required",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }
      const workspace = await Workspace.findOne({
        where: { id: workspaceId },
      });
      if (!workspace) {
        return failed(res, "Workspace not found.");
      }
      // Find the subdispatch record by ID
      const crmSubdispatch = await CrmSubdispatch.findByPk(status_loggable_id);

      if (!crmSubdispatch) {
        return failed(res, "Subdispatch record not found.");
      }
      const order = await Order.findOne({
        where: { id: crmSubdispatch.orderId },
      });
      // Toggle between 'approved' and 'rejected' status
      crmSubdispatch.status = status;
      // crmSubdispatch.status === status;

      // return success(res,crmSubdispatch)
      await crmSubdispatch.save(); // Save the updated status

      // Log the status update activity
      const reqData = await CrmStatusLog.create({
        userId: req.decodedData.id,
        role_id: role_id,
        status_loggable_type: status_loggable_type,
        status_loggable_id: status_loggable_id,
        status: crmSubdispatch.status,
        comment: comment,
      });
      //Send notification

      if (isPlanning == "execution" && status == "completed") {
        let htmlContent;
        try {
          htmlContent = fs.readFileSync("views/emails/unloading.ejs", "utf-8");
        } catch (err) {
          console.error("Error reading EJS template file:", err);
          return res
            .status(500)
            .json({ message: "Failed to read template file" });
        }
        // Fetching documents
        const customerPo = await Document.findOne({
          where: {
            documentTypeId: 1,
            documentable_type: "order",
            documentable_id: order.id,
          },
        });

        const eInvoice = await Document.findOne({
          where: {
            fileName: {
              [Op.like]: "%E-Invoice%",
            },
            documentable_type: {
              [Op.or]: ["CrmDispatchFinance", "CrmDispatchFreez"],
            },
            documentable_id: crmSubdispatch.id,
          },
          order: [["id", "desc"]],
        });

        // Fetch MTC document
        const mtc = await Document.findOne({
          where: {
            fileName: {
              [Op.like]: "%MTC%", // Case-insensitive matching in MySQL
            },
            documentable_id: crmSubdispatch.id,
            documentable_type: {
              [Op.or]: ["CrmDispatchFinance", "CrmDispatchFreez"],
            },
          },
          order: [["id", "desc"]],
        });

        // Fetch Eway Bill document
        const ewayBill = await Document.findOne({
          where: {
            fileName: {
              [Op.like]: "%Eway Bill%", // Case-insensitive matching in MySQL
            },
            documentable_id: crmSubdispatch.id,
            documentable_type: {
              [Op.or]: ["CrmDispatchFinance", "CrmDispatchFreez"],
            },
          },
          order: [["id", "desc"]],
        });

        // Fetch Customer Receiving documents (multiple records)
        const customerReceiving = await Document.findAll({
          where: {
            fileName: {
              [Op.like]: "%Customer Receiving Copy%", // Case-insensitive matching in MySQL
            },
            documentable_id: crmSubdispatch.id,
            documentable_type: {
              [Op.or]: ["CrmDispatchFinance", "CrmDispatchFreez"],
            },
          },
          order: [["id", "desc"]],
        });
        // console.log({ customerReceiving });
        // Ensure all document paths are checked for null safety
        const dynamicData = {
          customer_name: order.name,
          imageUrl: workspace.logo_path || null,
          banner_path: workspace.banner_path || null,
          url: "https://crm.mvikas.in/",
          team: workspace.name,
          legal_name: workspace.legal_name,
          workspaceName: workspace.name,
          address: workspace.address,
          phone: workspace.phone,
          email: workspace.email,
          customerPo: customerPo?.path || null,
          eInvoice: eInvoice?.path || null,
          mtc: mtc?.path || null,
          ewayBill: ewayBill?.path || null,
          customerReceiving: customerReceiving?.path || null,
        };
        // return success(res, dynamicData);
        const compiledHtml = ejs.render(htmlContent, dynamicData);
        const mailData = [
          {
            email: "sunil@yopmail.com",
            ids: order.customerId,
            subject: `Successful Delivery of Order No. ${order.customer_po_no}`,
            html: compiledHtml,
          },
        ];

        await sendNotificationEmail(
          mailData,
          "salesgo_successful_delivery",
          "customer",
          req.body.workspaceId
        );
      }
      return success(res, "Status updated successfully", reqData);
    } catch (error) {
      console.error("Error in updating subdispatch status:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  exportSubdispatchList: async (req, res) => {
    try {
      const request = req.query;
      let params = {};
      if (request.workspaceId > 1) {
        params = { workspaceId: request.workspaceId };
      }
      let subdispatchFilter = {}; // Initialize subdispatch filter

      // Apply status filter based on the dashboard data
      if (request.status) {
        switch (request.status) {
          case "totalSubDispatch":
            params = {
              ...params,
              status_by_scm: "approved",
            };
            break;
          case "pendingDispatch":
            params = {
              ...params,
              status_by_scm: "pending",
            };
            break;
          case "completeSubdispatch":
            params = {
              ...params,
              status_by_scm: "approved",
            };
            // Add filter for CrmSubdispatch
            subdispatchFilter = {
              status: "approved", // Status for CrmSubdispatch
            };
            break;
          case "cancelSubdispatch":
            params = {
              ...params,
              status_by_scm: "declined",
            };
            break;
          case "completedispatch":
            params = {
              ...params,
              status_by_scm: "complete",
            };
            break;
          case "pendingSubDispatch":
            params = {
              ...params,
              status_by_scm: "pending",
            };
            // Add filter for CrmSubdispatch
            subdispatchFilter = {
              status: "pending", // Status for CrmSubdispatch
            };
            break;
          default:
            // Handle unknown status
            return error(
              res,
              "Invalid status filter provided.",
              SYSTEM_FAILURE
            );
        }
      }
      console.log({ params });
      const data = await Order.findAll({
        where: params,
        include: [
          {
            model: CrmAllCustomer,
            as: "customerData",
            attributes: ["name", "mobile", "companyName", "contactName"],
          },
          {
            model: CrmSubdispatch,
            as: "dispatchData",
            where: subdispatchFilter, // Apply the subdispatch filter
            return: false,
          },
          {
            model: OrderItem,
            as: "orderItems",
            attributes: ["quantity"],
          },
          {
            model: AssignUser,
            as: "assignUser",
            required: false,
            where: {
              documentable_type: "CrmDispatch",
            },
            attributes: [
              "id",
              "assignable_id",
              "assign_by_id",
              "assign_to_id",
              "assign_reason_id",
              "comment",
            ],
            include: [
              {
                model: User,
                as: "user",
                attributes: ["name"],
              },
            ],
          },
        ],
        order: [["id", "DESC"]],
      });
      // return success(res, data);
      const formattedData = data.map((order) => ({
        // id: order.id,
        order_no: order.order_no,
        orderDate: order.createdAt.toISOString().split("T")[0],
        companyName: order.customerData?.companyName || "N/A",
        contactPerson: order.name || "N/A",
        contactNumber: order.customerData?.mobile || "N/A",
        assignedTo: order.assignUser?.user?.name || "Not Assigned",
        totalQuantity: (order.orderItems || []).reduce(
          (sum, item) => sum + item.quantity,
          0
        ),
        orderStatus: order.status || "N/A",
        scmStatus: order.status_by_scm || "N/A",
        status_by_sales: order.status_by_sales || "N/A",
        status_by_finance: order.status_by_finance || "N/A",
      }));

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Order List");

      worksheet.columns = [
        // { header: "ID", key: "id", width: 10 },
        { header: "Order Id", key: "order_no", width: 30 },
        { header: "Order Date", key: "orderDate", width: 30 },
        { header: "Company Name", key: "companyName", width: 15 },
        { header: "Contact Person", key: "contactPerson", width: 10 },
        { header: "Contact No.", key: "contactNumber", width: 10 },
        { header: "Assigned to", key: "assignedTo", width: 20 },
        { header: "Total Quantity", key: "totalQuantity", width: 20 },
        { header: "Order Status", key: "orderStatus", width: 20 },
        { header: "SCM Status", key: "scmStatus", width: 20 },
        { header: "Sales Status", key: "status_by_sales", width: 20 },
        { header: "Finance Status", key: "status_by_finance", width: 20 },
      ];

      worksheet.addRows(formattedData);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=order_list.xlsx"
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Error exporting order list:", error);
      return failed(res, SYSTEM_FAILURE);
    }
  },
  deleteDoc: async (req, res) => {
    try {
      const requests = req.body;

      // Validate the incoming request
      const v = new Validator(requests, {
        id: "required",
      });
      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }
      const document = await Document.findOne({ where: { id: requests.id } });
      if (!document) {
        return failed(res, "Document not found.");
      }
      await Document.destroy({ where: { id: requests.id } });
      return success(res, "Document deleted successfully.");
    } catch (error) {
      console.error("Error exporting order list:", error);
      return failed(res, SYSTEM_FAILURE);
    }
  },
  generateInvoice: async (req, res) => {
    try {
      const requests = req.body;
      const v = new Validator(requests, {
        dispatchId: "required",
        workspaceId: "required",
      });
      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }
      // Count all invoices of type "purchase-order"
      const invoiceCount = await CrmInvoice.count({
        where: { type: "purchase-order" },
      });

      // Define the current year
      const currentYear = new Date().getFullYear();

      // Calculate the randomNumber based on the count + 1
      const randomNumber = `INV/${currentYear}/${invoiceCount + 1}`;

      const dispatch = await CrmSubdispatch.findOne({
        where: { id: requests.dispatchId },
        include: [
          {
            model: Order,
            as: "singleOrder",
            attributes: [
              "order_no",
              "status",
              "shipping_address",
              "po_date",
              "billing_address",
              "customer_po_no",
            ],
          },
          {
            model: OrderItem,
            as: "orderItems",
            required: false,
            where: { itemable_type: "dispatch" },
            include: [
              {
                model: ActivityLog,
                as: "activityLog",
                where: { entity_type: "CrmDispatch" },
                required: false,
                attributes: [
                  "id",
                  "entity_type",
                  "operation_type",
                  "performed_by_id",
                  "changes",
                ],
                include: [
                  {
                    model: User,
                    as: "userDetails",
                    required: false,
                    attributes: ["name", "roleName"],
                  },
                ],
              },
              {
                model: Unit,
                as: "unitData",
                required: false,
                attributes: ["name"],
              },
              {
                model: Product,
                as: "product",
                required: false,
                attributes: ["id", "name"],
              },
              {
                model: CrmAllCustomer,
                as: "vendorData",
                required: false,
                include: [
                  {
                    model: PaymentTerm,
                    as: "paymentData",
                    required: false,
                    attributes: ["name"],
                  },
                ],
              },
              {
                model: CrmStatusLog,
                as: "statusLog",
                required: false,
                where: { status_loggable_type: "CrmDispatchShortage" },
                include: [
                  {
                    model: Role,
                    required: false,
                    as: "role",
                    attributes: ["name"],
                  },
                  { model: User, as: "userDetail", attributes: ["name"] },
                ],
              },
            ],
          },
          {
            model: Document,
            as: "freezDocument",
            where: { documentable_type: "CrmDispatchFreez" },
            required: false,
            // attributes: ["id", "path", "fileName"],
            include: [
              {
                model: CrmStatusLog,
                as: "dispatchFreezLog",
                required: false,
                where: { status_loggable_type: "CrmDispatchFreez" },
                attributes: [
                  "role_id",
                  "status_loggable_id",
                  "status",
                  "comment",
                  "updatedAt",
                ],
                include: [
                  {
                    model: Role,
                    as: "role",
                    required: false,
                    attributes: ["name"],
                  },
                  { model: User, as: "userDetail", attributes: ["name"] },
                ],
              },
            ],
          },
          {
            model: Document,
            as: "documentData",
            required: false,
            where: { documentable_type: "CrmDispatchFinance" },
            attributes: ["id", "path", "fileName", "status"],
            include: [
              {
                model: CrmStatusLog,
                as: "dispatchFinancelog",
                required: false,
                where: { status_loggable_type: "CrmDispatchFinance" },
                attributes: [
                  "role_id",
                  "status_loggable_id",
                  "status",
                  "comment",
                  "updatedAt",
                ],
                include: [
                  {
                    model: Role,
                    as: "role",
                    attributes: ["name"],
                  },
                  { model: User, as: "userDetail", attributes: ["name"] },
                ],
              },
            ],
          },
          {
            model: CrmTransportations,
            as: "transportationDetail",
            required: false,
            include: [
              {
                model: Document,
                required: false,
                as: "transporterDocumentData",
                where: { documentable_type: "CrmDispatchTransporter" },
                // attributes: ["id", "documentTypeId", "path", "fileName"],
              },
            ],
          },
          {
            model: CrmDispatchEwayBill,
            as: "ewaybilldetail",
            required: false,
          },
          {
            model: CrmStatusLog,
            as: "statusLog",
            required: false,
            where: { status_loggable_type: "CrmDispatchStatus" },
            include: [
              {
                model: Role,
                as: "role",
                attributes: ["name"],
              },
              { model: User, as: "userDetail", attributes: ["name"] },
            ],
          },
        ],
      });
      const workspace = await Workspace.findOne({
        where: { id: requests.workspaceId },
      });
      let grandTotalAmount = 0;

      // Calculate grand total from all order items
      dispatch.orderItems.forEach((item) => {
        const taxableAmount = item.price * item.quantity;
        // If there are any discounts or additional calculations, you can modify it accordingly
        // const taxableAmount = (item.price * item.quantity) - item.discount;
        const totalAmount =
          taxableAmount * (item.gst_rate / 100) + taxableAmount;
        // console.log({ totalAmount });
        // Sum up the totalAmount for grand total
        grandTotalAmount += totalAmount;
      });

      // Convert grand total to words
      // const amountInWord = await numberToWords.toWords(grandTotalAmount);
      const amountInWord = await numberToword.numberToWords(
        parseFloat(grandTotalAmount)
      );

      if (!dispatch.ewaybilldetail) {
        return failed(res, "Please create eway bill.");
      }
      if (!dispatch.transportationDetail) {
        return failed(res, "Please add transporter detail.");
      }
      const dynamicData = {
        invoiceNo: randomNumber,
        ewayBillNo: dispatch.ewaybilldetail.ebillno,
        modeOfPayment: dispatch.priceBasis,
        deliveryDate: dispatch.singleOrder.po_date ?? null,
        customerOrderNo: dispatch.singleOrder.order_no ?? null,
        customerName: dispatch.singleOrder.name,
        po_date: dispatch.singleOrder.po_date,
        buyerOrderNo: dispatch.singleOrder.customer_po_no ?? null,
        deliveryNote: dispatch.singleOrder.status,
        destination: dispatch.singleOrder.shipping_address,
        vehicleNumber: dispatch.transportationDetail.vehicle_number ?? null,
        dispatchDocNo: dispatch.id,
        dispatchThrough: dispatch.transportationDetail.name ?? null,
        terms_of_delivery: dispatch.transportationDetail.terms_of_delivery,
        builty_no_lr_no: dispatch.transportationDetail.builty_no_lr_no,
        mvikasOrderNo: dispatch.singleOrder.order_no,
        sales_rep_name: dispatch.singleOrder.sales_rep_name,
        billTo: dispatch.singleOrder.billing_address,
        shipping_address: dispatch.singleOrder.shipping_address,
        orderItems: dispatch.orderItems,
        workspaceName: workspace.name,
        address: workspace.address,
        workspaceGst: workspace.gst_tin,
        workspaceCin: workspace.cin,
        workspaceEmail: workspace.email,
        bankName: workspace.bank_name,
        bankAccountNo: workspace.bank_ac_number,
        bankIfsc: workspace.bank_ifsc,
        companyLogo: workspace.logo_path,
        amountInWord: amountInWord,
      };
      let htmlContent;
      try {
        htmlContent = fs.readFileSync(
          "views/pdf_invoices/generate-invoice.ejs",
          "utf-8"
        );
      } catch (err) {
        console.error("Error reading EJS template file:", err);
        return serverError(res, "Failed to read template file");
      }
      const compiledHtml = ejs.render(htmlContent, dynamicData);

      const options = { format: "A4" };

      const pdfBuffer = await pdf.generatePdf(
        { content: compiledHtml },
        options
      );

      // Upload the PDF to S3 and get the file URL
      const pdfFile = await uploadPdfToS3(pdfBuffer, "pdf", "generate invoice");
      // return success(res, pdfFile);
      // Prepare the data for the new invoice
      const reqData = {
        user_id: req.decodedData.id,
        invoiceable_type: "CrmSubDispatch",
        invoiceable_id: requests.invoiceable_id,
        path: requests.path,
        vendor_id: requests.vendor_id,
        type: requests.type,
        invoice_number: randomNumber,
      };

      // Create the new invoice in the database
      await CrmInvoice.create(reqData);

      return success(res, "Invoice generated successfully.", pdfFile);
    } catch (error) {
      console.error("Error generating invoice:", error);
      return failed(res, SYSTEM_FAILURE);
    }
  },
  sendEmailsOnButton: async (req, res) => {
    try {
      const requests = req.body;

      // Validate input
      const v = new Validator(requests, {
        dispatchId: "required",
        buttonName:
          "required|in:dispatch_planing,share_details,sharein_transit",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }

      // Fetch dispatch record
      const dispatch = await CrmSubdispatch.findOne({
        where: { id: requests.dispatchId },
        include: [
          {
            model: OrderItem,
            as: "orderItems",
            required: false,
            where: { itemable_type: "dispatch" },
            include: [
              {
                model: Product,
                as: "product",
                required: false,
                attributes: ["id", "name"],
              },
            ],
          },
          {
            model: CrmTransportations,
            as: "transportationDetail",
            required: false,
            include: [
              {
                model: Document,
                required: false,
                as: "transporterDocumentData",
                where: { documentable_type: "CrmDispatchTransporter" },
              },
            ],
          },
        ],
      });

      if (!dispatch) {
        return failed(res, "Dispatch not found.");
      }

      // Read EJS template
      let dispatch_planing_htmlContent;
      let sharein_transit_htmlContent;
      let share_details_htmlContent;
      try {
        dispatch_planing_htmlContent = fs.readFileSync(
          "views/emails/dispatchPlanning.ejs",
          "utf-8"
        );
        sharein_transit_htmlContent = fs.readFileSync(
          "views/emails/intransit.ejs",
          "utf-8"
        );
        share_details_htmlContent = fs.readFileSync(
          "views/emails/shareDetails.ejs",
          "utf-8"
        );
      } catch (err) {
        console.error("Error reading EJS template file:", err);
        return res
          .status(500)
          .json({ message: "Failed to read template file" });
      }

      // Fetch order details
      const order = await Order.findOne({ where: { id: dispatch.orderId } });
      if (!order) {
        return failed(res, "Order not found.");
      }

      // Fetch workspace details
      const workspace = await Workspace.findOne({
        where: { id: dispatch.workspaceId },
      });
      if (!workspace) {
        return failed(res, "Workspace not found.");
      }

      // Fetch customer details
      const customer = await CrmAllCustomer.findOne({
        where: { id: order.customerId },
      });

      // Generate comma-separated product names
      const productNames = dispatch.orderItems
        .map((item) => (item.product ? item.product.name : ""))
        .join(", ");
      const paymentTerm = await PaymentTerm.findOne({
        where: { id: order.payment_term_id },
      });
      // Prepare dynamic data for the email
      const dynamicData = {
        order_no: order.order_no,
        url: "https://crm.mvikas.in/",
        team: workspace.name,
        legal_name: workspace.legal_name,
        address: workspace.address,
        phone: workspace.phone,
        email: workspace.email,
        banner: workspace.banner_path,
        imageUrl: workspace.logo_path,
        po_no: order.customer_po_no,
        dispatchId: dispatch.id,
        customerName: customer.name,
        po_date: order.po_date,
        customer_po_no: order.customer_po_no,
        item: productNames,
        destination: order.shipping_address,
        dispatchDate: dispatch.tat,
        customer_payment_term: paymentTerm.name,
        driver_name: dispatch.transportationDetail
          ? dispatch.transportationDetail.driver_name
          : "N/A",
        vehicleNumber: dispatch.transportationDetail
          ? dispatch.transportationDetail.vehicle_number
          : "N/A",
        currentAddress: dispatch.transportationDetail
          ? dispatch.transportationDetail.address
          : "N/A",
        driverPhone: dispatch.transportationDetail
          ? dispatch.transportationDetail.driver_phone
          : "N/A",
        capacity: dispatch.transportationDetail
          ? dispatch.transportationDetail.capacity
          : "N/A",
        orderItems: dispatch.orderItems,
      };
      // return success(res,dynamicData)
      // Compile HTML content
      const compiledHtml = ejs.render(
        dispatch_planing_htmlContent,
        dynamicData
      );
      const intransit_compiledHtml = ejs.render(
        sharein_transit_htmlContent,
        dynamicData
      );

      const share_details_compiledHtml = ejs.render(
        share_details_htmlContent,
        dynamicData
      );

      // Fetch all user emails
      const users = await User.findAll({ attributes: ["id", "email"] });
      const emails = users.map((user) => user.email);
      const Ids = users.map((user) => user.id);
      // Prepare email entities
      let entities = [
        {
          email: emails,
          ids: Ids,
          subject: `Dispatch Planning for Order No. ${order.order_no}`,
          html: compiledHtml,
        },
      ];

      let intransit_entities = [
        {
          email: customer.email,
          ids: customer.id,
          subject: `Status of In-Transit Vehicles for your order no . ${order.customer_po_no}`,
          html: intransit_compiledHtml,
        },
      ];

      let share_details = [
        {
          email: customer.email,
          ids: customer.id,
          subject: `Details of Dispatch for order no.${order.customer_po_no}`,
          html: share_details_compiledHtml,
        },
      ];

      // Send email based on buttonName
      if (requests.buttonName === "dispatch_planing") {
        if (entities.length > 0) {
          await sendNotificationEmail(
            entities,
            "salesgo_dispatch_planning",
            "user",
            workspace.id
          );
        }
      } else if (requests.buttonName === "sharein_transit") {
        if (intransit_entities.length > 0) {
          await sendNotificationEmail(
            intransit_entities,
            "salesgo_intransit",
            "customer",
            workspace.id
          );
        }

        // Log the update activity, including both the original and updated data
        await ActivityLog.create({
          entity_id: requests.dispatchId,
          entity_type: "CrmDispatchTransit",
          operation_type: "SEND",
          performed_by_id: req.decodedData.id,
          comment: requests.location, //in the transit comment field are not available so here we consider comment as location
        });
      } else if (requests.buttonName === "share_details") {
        if (share_details.length > 0) {
          await sendNotificationEmail(
            share_details,
            "salesgo_successful_delivery",
            "customer",
            workspace.id
          );
        }
      }

      return success(res, "Mail sent successfully.");
    } catch (error) {
      console.error("Error:", error);
      return failed(res, SYSTEM_FAILURE);
    }
  },
  shareVendorPayment: async (req, res) => {
    try {
      const requests = req.body;

      // Validate input
      const v = new Validator(requests, {
        paymentReqId: "required",
        docid: "required",
        workspaceId: "required",
        sub_dispatch_id: "required",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }

      // Fetch required records
      const paymentReq = await CrmSubDispatchPayments.findOne({
        where: { id: requests.paymentReqId },
      });
      if (!paymentReq) {
        return failed(res, "Payment request not found.");
      }

      const document = await Document.findOne({
        where: { id: requests.docid, documentable_type: "CrmDispatchPayment" },
      });
      if (!document) {
        return failed(res, "Document not found.");
      }

      const subDispatch = await CrmSubdispatch.findOne({
        where: { id: requests.sub_dispatch_id },
      });
      if (!subDispatch) {
        return failed(res, "Sub-dispatch record not found.");
      }

      const order = await Order.findOne({ where: { id: subDispatch.orderId } });
      if (!order) {
        return failed(res, "Order not found.");
      }
      let vendor;
      if (paymentReq.vendorId) {
        vendor = await CrmAllCustomer.findOne({
          where: { id: paymentReq.vendorId },
        });
      } else {
        const vendorData = await CrmTransportations.findOne({
          where: { id: paymentReq.transportationId },
        });
        vendor = await Transport.findOne({
          where: {
            id: vendorData.transporter_id,
            // workspaceId: req.body.workspaceId,
          },
        });
        // console.log("vendorData.transporter_id", vendor, req.body.workspaceId);
        // return 1;
      }

      if (!vendor) {
        return failed(res, "Vendor not found.");
      }

      const workspace = await Workspace.findOne({
        where: { id: requests.workspaceId },
      });
      if (!workspace) {
        return failed(res, "Workspace not found.");
      }

      // Format date
      const formattedDate = document.createdAt
        ? new Date(document.createdAt)
            .toLocaleDateString("en-GB")
            .replace(/\//g, "-")
        : "N/A";

      // Load EJS template
      let htmlContent;
      try {
        htmlContent = fs.readFileSync(
          "views/emails/vendorPayment.ejs",
          "utf-8"
        );
      } catch (err) {
        console.error("Error reading EJS template file:", err);
        return serverError(res, "Failed to read email template file.");
      }

      // Compile template with dynamic data
      const dynamicData = {
        phone: workspace.phone,
        email: workspace.email,
        workspaceName: workspace.name,
        address: workspace.address,
        imageUrl: workspace.logo_path,
        banner_path: workspace.banner_path,
        customer_po_no: order.customer_po_no,
        vendorName: vendor.name,
        amount: paymentReq.amount,
        docDate: formattedDate,
      };
      const compiledHtml = ejs.render(htmlContent, dynamicData);

      // Prepare mail data
      const mailData = [
        {
          email: vendor.email,
          ids: vendor.id,
          subject: `Payment Confirmed for ${workspace.name} PO No. ${order.customer_po_no}`,
          html: compiledHtml,
          attachments: [
            {
              filename: "Payment_Details.pdf",
              path: paymentReq.supportingDocument, // Ensure `pdfResponse` is correctly defined
            },
          ],
        },
      ];
      if (paymentReq.vendorId) {
        // Send email
        await sendNotificationEmail(
          mailData,
          "salesgo_vendor_payment",
          "vendor",
          req.body.workspaceId
        );
      } else {
        // Send email
        await sendNotificationEmail(
          mailData,
          "salesgo_vendor_payment",
          "transporter",
          req.body.workspaceId
        );
      }

      return success(res, "Mail sent successfully.");
    } catch (error) {
      console.error("Error in shareVendorPayment:", error);
      return failed(res, SYSTEM_FAILURE);
    }
  },
};
