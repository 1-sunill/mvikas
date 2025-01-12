const { Validator } = require("node-input-validator");
const { SYSTEM_FAILURE } = require("../../../helper/message");
const {
  serverError,
  success,
  validateFail,
  failed,
} = require("../../../helper/response");
const db = require("../../../../models");
const {
  prepareOrderData,
  updatePrepareOrderData,
  handleDocuments,
} = require("../../../helper/helpers");
const Order = db.CrmOrder;
const User = db.crmuser;
const OrderItem = db.CrmOrderItems;
const Workspace = db.crmworkspace;
const Document = db.CrmDocument;
const CrmAllCustomer = db.CrmAllCustomer;
const CrmUnitType = db.CrmUnitType;
const CrmAttribute = db.CrmAttribute;
const CrmAttributeValue = db.CrmAttributeValue;
const Product = db.crmProduct;
const ProductCombination = db.productAttributeCombination;
const ProductCombinationValue = db.attributeValueCombination;
const OrderItemVendor = db.CrmOrderItemVendor;
const Vendor = db.CrmVendor;
const Unit = db.Unit;
const { Op, Sequelize } = require("sequelize");
const fs = require("fs");
const pdf = require("html-pdf-node");
const ejs = require("ejs");
const CustomerProfiles = db.CrmAllCustomer;
const { uploadPdfToS3 } = require("../../../helper/aws");
const moment = require("moment");
const { sendmail } = require("../../../helper/mail");
const ExcelJS = require("exceljs");
const { sendNotificationEmail } = require("../../../helper/sendSms");
const AssignUser = db.CrmAssign;
const CrmStatusLog = db.CrmStatusLog;
const Role = db.Role;
const numberToword = require('../../../helper/numberToWord')

module.exports = {
  //Create order from estimate
  createOrder: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        order_no: "required",
        sales_rep_name: "required",
        userId: "required",
        // estimate_id: "required",
        customerId: "required",
        email: "required",
        phone: "required",
        shipping_address: "required",
        billing_gst_tin: "required",
        // shipping_gst_tin: "required",
        customer_po_no: "required",
        po_date: "required",
        payment_term_id: "required",
        type: "required",
      });
      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }

      const {
        order_no,
        sales_rep_name,
        userId,
        estimate_id,
        customerId,
        email,
        phone,
        shipping_address,
        billing_gst_tin,
        customer_po_no,
        po_date,
        shipping_gst_tin,
        payment_term_id,
        orderItem,
        type,
        customerPO,
        correspondenceOffer,
        documents,
        billing_address,
        term_and_condition,
        customerPaymentMethod,
        workspaceId,
      } = req.body;
      const user = await User.findOne({ where: { id: req.decodedData.id } });
      let customer = null;
      if (customerId) {
        customer = await CrmAllCustomer.findOne({
          where: { id: customerId },
        });

        // If customer is not found, return an error
        if (!customer) {
          return failed(res, "Customer not found");
        }

        //check credit limit status approved or not

        // if (
        //   customer.creditLimitstatus == "pending" ||
        //   customer.creditLimitstatus == "declined"
        // ) {
        //   return failed(res, "Customer credit limit is not approved");
        // }
      }

      const reqData = {
        order_no,
        workspaceId,
        userId,
        estimate_id,
        sales_rep_name,
        customerId,
        payment_term_id,
        name: customer ? customer.name : null,
        email,
        phone,
        shipping_address,
        billing_gst_tin,
        shipping_gst_tin,
        customer_po_no,
        po_date,
        billing_address,
        customer_payment_method: customerPaymentMethod,
        term_and_condition,
      };
      const order = await Order.create(reqData);
      //Add order items
      await prepareOrderData(orderItem, order.id, user.workspaceId, type);

      const customerPODoc = await handleDocuments(
        customerPO,
        userId,
        order.id,
        "order",
        type
      );
      await Document.bulkCreate(customerPODoc);

      const correspondenceOfferDoc = await handleDocuments(
        correspondenceOffer,
        userId,
        order.id,
        "order",
        type
      );
      await Document.bulkCreate(correspondenceOfferDoc);

      const documentsData = await handleDocuments(
        documents,
        userId,
        order.id,
        "order",
        type
      );
      await Document.bulkCreate(documentsData);
      const customerData = await CustomerProfiles.findOne({
        where: { id: customerId },
      });

      const mailData = {
        to: customerData.email,
        subject: "Order Placed",
        // text: "Please find your attatchments.",
      };
      const workspace = await Workspace.findOne({
        where: { id: user.workspaceId },
      });
      let htmlContent;
      try {
        htmlContent = fs.readFileSync(
          "views/emails/orderApproval.ejs",
          "utf-8"
        );
      } catch (err) {
        console.error("Error reading EJS template file:", err);
        return res
          .status(500)
          .json({ message: "Failed to read template file" });
      }
      const pdfResponse = await module.exports.orderPdf({
        body: {
          orderId: order.id,
          refrence: "Controller",
          workspaceId: workspace.id,
        },
      });
      const dynamicData = {
        customer_name: req.body.name,
        workspaceName: workspace.name,
        userName: user.name,
        order_no: order_no,
        attachment: pdfResponse.url,
        address: workspace.address,
        imageUrl: workspace.logo_path,
        banner_path: workspace.banner_path,
        url: `https://crm.mvikas.in/order-management/all-order/order-details/${order.id}`,
        team: workspace.name,
        address: workspace.address,
        phone: workspace.phone,
        email: workspace.email,
        legal_name: workspace.legal_name,
      };
      console.log({ dynamicData });
      const compiledHtml = ejs.render(htmlContent, dynamicData);
      const users = await User.findAll({
        where: { workspaceId: workspace.id },
        attributes: ["email", "id"],
      });
      const emails = users.map((user) => user.email);
      const Ids = users.map((user) => user.id);

      let notificationEntities = [];
      notificationEntities.push({
        email: emails,
        ids: Ids,
        subject: `SalesGo Order No. ${order_no} Approval`,
        html: compiledHtml,
        attachments: [
          {
            filename: pdfResponse.url,
            path: pdfResponse.url,
          },
        ],
      });
      await sendNotificationEmail(
        notificationEntities,
        "salesgo_approved_order",
        "user",
        workspace.id
      );

      return success(res, "Order created successfully.", order);
    } catch (error) {
      console.log({ error });
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  updateOrder: async (req, res) => {
    try {
      // Validate the request body
      const v = new Validator(req.body, {
        order_id: "required",
      });
      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }

      const {
        order_no,
        sales_rep_name,
        userId,
        estimate_id,
        customerId,
        email,
        phone,
        shipping_address,
        billing_gst_tin,
        customer_po_no,
        po_date,
        shipping_gst_tin,
        payment_term_id,
        order_id,
        orderItem, // Assuming order items are part of the request
        type, // Assuming type is part of the request
        billing_address,
        term_and_condition,
        customerPO,
        correspondenceOffer,
        documents,
        customerPaymentMethod,
        workspaceId,
      } = req.body;

      // Check if the order exists
      const order = await Order.findOne({ where: { id: order_id } });
      if (!order) {
        return failed(res, "Order not found.");
      }
      let customer = await CrmAllCustomer.findOne({
        where: { id: customerId },
      });

      // If customer is not found, return an error
      if (!customer) {
        return failed(res, "Customer not found");
      }
      // if (
      //   customer.creditLimitstatus == "pending" ||
      //   customer.creditLimitstatus == "declined"
      // ) {
      //   return failed(res, "Customer credit limit is not approved");
      // }
      // Fetch the user for workspaceId
      const user = await User.findOne({ where: { id: req.decodedData.id } });
      if (!user) {
        return failed(res, "User not found.");
      }

      // Prepare order data to update
      const reqData = {
        order_no,
        workspaceId,
        userId,
        estimate_id,
        sales_rep_name,
        customerId,
        payment_term_id,
        email,
        phone,
        shipping_address,
        billing_gst_tin,
        shipping_gst_tin,
        customer_po_no,
        po_date,
        billing_address,
        term_and_condition,
        customer_payment_method: customerPaymentMethod,
      };

      // Update the order
      await order.update(reqData);

      if (orderItem) {
        await OrderItem.destroy({
          where: { itemable_id: order_id },
        }); // Remove existing order items

        await updatePrepareOrderData(
          orderItem,
          order_id,
          user.workspaceId,
          type
        );
      }
      await Document.destroy({
        where: { documentable_id: order.id, department: "order" },
      });
      if (customerPO) {
        const customerPODoc = await handleDocuments(
          customerPO,
          userId,
          order.id,
          "order",
          type
        );
        await Document.bulkCreate(customerPODoc);
      }
      if (correspondenceOffer) {
        const correspondenceOfferDoc = await handleDocuments(
          correspondenceOffer,
          userId,
          order.id,
          "order",
          type
        );
        await Document.bulkCreate(correspondenceOfferDoc);
      }
      if (documents) {
        const documentsData = await handleDocuments(
          documents,
          userId,
          order.id,
          "order",
          type
        );
        await Document.bulkCreate(documentsData);
      }

      return success(res, "Order updated successfully.", order);
    } catch (error) {
      console.error("Error updating order:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  getOrder: async (req, res) => {
    try {
      const v = new Validator(req.query, {
        id: "required",
      });
      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }

      const order = await Order.findOne({
        where: { id: req.query.id },
        include: [
          {
            model: Document,
            as: "documentData",
            where: { documentable_type: "order" },
            attributes: [
              "documentTypeId",
              "documentable_type",
              "path",
              "department",
            ],
          },
          {
            model: CrmAllCustomer,
            as: "customerData",
          },
          {
            model: OrderItem,
            as: "orderItems",
            where: { itemable_type: "order" },
            include: [
              {
                model: CrmUnitType,
                as: "unitTypeData",
                attributes: ["name"],
              },
              {
                model: Product,
                as: "product",
                include: [
                  {
                    model: ProductCombination,
                    as: "combinationData",
                    attributes: ["productId"],
                    include: [
                      {
                        model: ProductCombinationValue,
                        as: "combinationValueData",
                        attributes: ["attributeValueId"],
                        include: [
                          {
                            model: CrmAttribute,
                            as: "productAttribute",
                            attributes: ["id", "name"],
                          },
                          {
                            model: CrmAttributeValue,
                            as: "productAttributeValue",
                            attributes: ["id", "value"],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                model: OrderItemVendor,
                as: "orderVendorItem",

                include: [
                  {
                    model: Vendor,
                    as: "vendor",
                    required: false,
                    include: [
                      {
                        model: Unit,
                        as: "unitData",
                        attributes: ["name"],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            model: CrmStatusLog,
            as: "activityLog",
            required: false,
            where: {
              status_loggable_type: "CrmDispatchDept",
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
        ],
      });

      if (!order) {
        return failed(res, "Order not found.");
      }

      // Process ProductCombination data
      const processedOrderItems = [];
      for (const orderItem of order.orderItems) {
        const product = orderItem.product;

        if (product && Array.isArray(product.combinationData)) {
          const combinations = [];
          for (const combination of product.combinationData) {
            const attributeMap = {};

            for (const attrValue of combination.combinationValueData) {
              const attr = attrValue.productAttribute;
              const attrVal = attrValue.productAttributeValue;

              if (!attributeMap[attr.id]) {
                attributeMap[attr.id] = {
                  id: attr.id,
                  name: attr.name,
                  values: [],
                };
              }

              attributeMap[attr.id].values.push({
                id: attrVal.id,
                value: attrVal.value,
              });
            }

            combinations.push({
              id: combination.id,
              productId: combination.productId,
              variantName: combination.variantName,
              combinationValueData: Object.values(attributeMap),
            });
          }

          // Remove productAttributeValues from the final response
          delete product.productAttributeValues;

          processedOrderItems.push({
            ...orderItem.toJSON(),
            product: {
              ...product.toJSON(),
              combinationData: combinations,
            },
          });
        } else {
          processedOrderItems.push(orderItem.toJSON());
        }
      }

      // Attach processed order items back to the order object
      const fullOrderData = {
        ...order.toJSON(),
        orderItems: processedOrderItems,
      };

      return success(res, "Data fetched successfully.", fullOrderData);
    } catch (error) {
      console.error("Error updating order:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  listOrder: async (req, res, whereCondition = {}) => {
    try {
      const request = req.query;

      // Validate the required `workspaceId`
      const validate = new Validator(request, {
        workspaceId: "required",
      });

      const isValid = await validate.check();
      if (!isValid) {
        return validateFail(res, validate);
      }

      // Extract and parse query parameters
      const search = request.search || "";
      const status = request.status || "";
      const page = parseInt(request.page) || 1;
      const pageSize =
        parseInt(request.limit) || parseInt(process.env.PAGE_LIMIT);
      const offset = (page - 1) * pageSize;

      const userId = req.decodedData.id;
      const checkUser = await User.findOne({ where: { id: userId } });

      if (!checkUser) {
        return failed(res, "User not found.", SYSTEM_FAILURE);
      }

      // Initialize `params` with workspaceId and additional conditions
      let params = {
        workspaceId: request.workspaceId,
        ...whereCondition,
      };

      // Additional filtering for SCM department users
      if (checkUser.department === "scm") {
        params = {
          ...params,
          status_by_sales: "approved",
          status_by_finance: "approved",
        };
      }

      // Handle userType-specific filtering
      if (checkUser.userType === 0 && request.workspaceId > 1) {
        params = {
          [Op.and]: [
            { id: { [Op.ne]: checkUser.id } }, // Exclude the current user
            { workspaceId: request.workspaceId, ...whereCondition },
          ],
        };
      }

      // Add search filters if provided
      if (search) {
        params[Op.or] = [
          { sales_rep_name: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
          { order_no: { [Op.like]: `%${search}%` } },
        ];
      }

      // Apply status filters
      if (status) {
        const statusFilters = {
          pending: { status: "pending" },
          approved: { status: "approved" },
          revised: { status: "revised" },
          declined: { status: "declined" },
          cancelSubdispatch: { status_by_scm: "declined" },
          completedispatch: { status_by_scm: "approved" },
        };

        if (statusFilters[status]) {
          params = { ...params, ...statusFilters[status] };
        } else {
          return error(res, "Invalid status filter provided.", SYSTEM_FAILURE);
        }
      }

      console.log("Query Parameters:", params);

      // Fetch the total count separately to avoid issues with associated model conditions
      const totalCount = await Order.count({
        where: params,
      });

      // Fetch paginated orders with associated data
      const list = await Order.findAll({
        where: params,
        include: [
          {
            model: CrmAllCustomer,
            as: "customerData",
            attributes: ["name", "mobile", "companyName", "contactName"],
          },
          {
            model: AssignUser,
            as: "assignUser",
            required: false,
            where: { documentable_type: "CrmDispatch" },
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
        limit: pageSize,
        offset,
      });

      // Prepare the response
      const responseData = {
        list,
        count: totalCount, // Use the separately calculated count
      };
      return success(res, "Data fetched successfully.", responseData);
    } catch (err) {
      console.error("Error fetching orders:", err);
      return serverError(res, SYSTEM_FAILURE);
    }
  },

  orderPdf: async (req, res) => {
    try {
      const requests = req.body;

      // Validate the decrypted request
      const v = new Validator(requests, {
        orderId: "required",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }
      let workspace = {};
      if (req.body.refrence == "Controller") {
        //  let userId =  req.body.userId || 1;
        workspace = await Workspace.findOne({
          where: { id: req.body.workspaceId },
        });
      } else {
        let orderFind = await Order.findOne({
          where: { id: req.body.orderId },
        });
        workspace = await Workspace.findOne({
          where: { id: orderFind.workspaceId },
        });
      }
      console.log("req.body", req.body.userId);

      // console.log("req.decodedData.id",req.decodedData.id)
      const estimateId = req.body.estimateId;
      const orderId = req.body.orderId;
      console.log({ orderId });
      // Fetch estimate data with nested relations
      const order = await Order.findOne({
        where: { id: orderId },
        include: [
          {
            model: Document,
            as: "documentData",
            where: { documentable_type: "order" },
            attributes: [
              "documentTypeId",
              "documentable_type",
              "path",
              "department",
            ],
          },
          {
            model: CrmAllCustomer,
            as: "customerData",
          },
          {
            model: OrderItem,
            as: "orderItems",
            where: { itemable_type: "order" },
            include: [
              {
                model: Product,
                as: "product",
                include: [
                  {
                    model: ProductCombination,
                    as: "combinationData",
                    attributes: ["id", "productId", "variantName"],
                    include: [
                      {
                        model: ProductCombinationValue,
                        as: "combinationValueData",
                        attributes: ["attributeValueId", "attributeId"],
                        include: [
                          {
                            model: CrmAttribute,
                            as: "productAttribute",
                            attributes: ["id", "name"],
                          },
                          {
                            model: CrmAttributeValue,
                            as: "productAttributeValue",
                            attributes: ["id", "value"],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                model: CrmUnitType,
                as: "unitTypeData",
                attributes: ["name"],
              },
            ],
          },
          {
            model: CrmStatusLog,
            as: "activityLog",
            required: false,
            where: {
              status_loggable_type: "CrmDispatchDept",
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
        ],
      });
      if (!order) {
        return failed(res, "Order not found.");
      }
       let subtotal = 0;
      let gstTotal = 0;
         // Check if orderItems is valid and is an array
      if (order.orderItems && Array.isArray(order.orderItems)) {
        // Using a for loop to iterate through orderItems
        for (let i = 0; i < order.orderItems.length; i++) {
          const orderItem = order.orderItems[i];
          console.log("Order item price", orderItem.price);
          // Parse price and quantity as numbers and calculate price per item
          let price =
            (parseFloat(orderItem.price) || 0) *
            (parseFloat(orderItem.quantity) || 1);
          let gstRate = parseFloat(orderItem.gst_rate) || 0;

          // Calculate GST amount
          let gstAmount = (price * gstRate) / 100;

          // Add price and GST to their respective totals
          subtotal += price;
          gstTotal += gstAmount;
        }
      }
    

      // Calculate the grand total (subtotal + GST)
      let grandTotal = subtotal + gstTotal;

      // Round grand total to two decimal places for consistency
      grandTotal = grandTotal.toFixed(2);
            const amountInWord =  await numberToword.numberToWords(parseFloat(grandTotal));

      // return success(res, order);
      // Load the template file
      let htmlContent;
      try {
        htmlContent = fs.readFileSync("views/pdf_invoices/order.ejs", "utf-8");
      } catch (err) {
        console.error("Error reading EJS template file:", err);
        return res
          .status(500)
          .json({ message: "Failed to read template file" });
      }
      // return success(res, order);
      // Prepare dynamic data for the EJS template
      const imageUrl =
        workspace && workspace.logo_path ? workspace.logo_path : "";
      const craetedUser = await User.findOne({
        where: { id: order.userId },
      });
       let finaceuser;
      if (order.finance_user_id) {
        finaceuser = await User.findOne({
          where: { id: order.finance_user_id },
        });
      }
      const formattedDate = moment(order.createdAt).format(
        "dddd, MMMM DD, YYYY"
      );
      // const amountInWord = numberToWords.toWords(requests.amount);
      // return success(res,workspace)
      const dynamicData = {
        imageUrl: imageUrl ?? null,
        company_name: workspace.legal_name ?? null,
        company_address: workspace.address ?? null,
        company_phone: workspace.phone ?? null,
        company_email: workspace.email ?? null,
        company_gst: workspace.gst_tin ?? null,
        bankName: workspace.bank_name ?? null,
        bankIfsc: workspace.bank_ifsc ?? null,
        bank_ac_number: workspace.bank_ac_number ?? null,
        logo_path: workspace.logo_path ?? null,
        cin: workspace.cin ?? null,
        customer_name: order.customerData?.name ?? null,
        customer_mobile: order.customerData?.mobile ?? null,
        customerAddress: order.customerData.customerAddress ?? null,
        orderCreatedAt: formattedDate ?? null,
        order_no: order.id ?? null,
        customer_po_no: order.customer_po_no ?? null,
        po_date: order.po_date
          ? moment(order.po_date).format("YYYY-MM-DD")
          : null,
        orderItems: order.orderItems ?? null,
        signature: craetedUser.signature,
        craeteUser: craetedUser.name,
        finaceSignature: finaceuser?.signature ?? null,
        workspaceName: workspace.name,
        workspaceEmail: workspace.email,
        workspacePhone: workspace.phone,
        amountInWord:amountInWord
      };

      // console.log(order.orderItems[0].product.name);
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

        // Respond with the S3 URL of the uploaded PDF
        // return success(res, "Success", { url: pdfFile.url });
        if (req.body.refrence == "Controller") {
          return { success: true, url: pdfFile.url };
        } else {
          // Respond with the S3 URL of the uploaded PDF
          return success(res, "Success", { url: pdfFile.url });
        }
      } catch (error) {
        console.error("PDF generation or S3 upload failed:", error);
        return serverError(res, "PDF generation or S3 upload failed");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      return serverError(res, "Network error");
    }
  },
  exportOrderList: async (req, res) => {
    try {
      const request = req.query;
      let params = {};
      if (request.workspaceId > 1) {
        params = { workspaceId: request.workspaceId };
      }
      if (request.status) {
        switch (request.status) {
          case "pending":
            params = {
              ...params,
              status: "pending",
            };
            break;
          case "approved":
            params = {
              ...params,
              status: "approved",
            };
            break;
          case "revised":
            params = {
              ...params,
              status: "revised",
            };
            break;
          case "declined":
            params = {
              ...params,
              status: "declined",
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
              status_by_scm: "approved",
            };
            break;

          default:
            // Handle unknown status
            return failed(
              res,
              "Invalid status filter provided.",
              SYSTEM_FAILURE
            );
        }
      }
      const data = await Order.findAll({
        where: params,
        include: [
          {
            model: CrmAllCustomer,
            as: "customerData",
            attributes: ["name", "mobile", "companyName", "contactName"],
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
          {
            model: OrderItem,
            as: "orderItems",
            attributes: ["quantity"],
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
};
