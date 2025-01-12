const { Validator } = require("node-input-validator");
const {
  serverError,
  success,
  validateFail,
  failed,
} = require("../../../helper/response");
const db = require("../../../../models");
const User = db.crmuser;
const Estimate = db.CrmEstimate;
const Lead = db.CrmLead;
const OrderItem = db.CrmOrderItems;
const Product = db.crmProduct;
const CrmMake = db.CrmMake;
const OrderItemVendor = db.CrmOrderItemVendor;
const Vendor = db.CrmVendor;
const Document = db.CrmDocument;
const MrsLead = db.CrmMrsLead;
const Workspace = db.crmworkspace;
const AssignUser = db.CrmAssign;
const Customer = db.CrmAllCustomer;
// const numberToWords = require("number-to-words");
const numberToword = require("../../../helper/numberToWord");

const CrmAttribute = db.CrmAttribute;
const CrmAttributeValue = db.CrmAttributeValue;
const ProductAttrValue = db.crmProductAttributeValue;
const ProductCombination = db.productAttributeCombination;
const ProductCombinationValue = db.attributeValueCombination;
const ActivityLog = db.CrmActivityLogs;
const CrmUnitType = db.CrmUnitType;
const Unit = db.Unit;

// const mail = require("../../../helper/mail");
const { Op, Sequelize } = require("sequelize");
const { sendmail, mail } = require("../../../helper/mail");
const {
  USER_CONSTANTS,
  SYSTEM_FAILURE,
  ADMIN_CONSTANTS,
} = require("../../../helper/message");
const { aws } = require("../../../helper/aws");
const {
  sendWhatsAppMessage,
  sendNotificationEmail,
} = require("../../../helper/sendSms");
const {
  prepareOrderData,
  updatePrepareOrderData,
} = require("../../../helper/helpers");
let baseUrl = process.env.APP_URL;
const fs = require("fs");
const pdf = require("html-pdf-node");
const ejs = require("ejs");
const { uploadPdfToS3 } = require("../../../helper/aws");
module.exports = {
  addEstimate: async (req, res) => {
    try {
      const requests = req.body;

      // Validate the incoming request
      const v = new Validator(requests, {
        lead_id: "required",
        estimate_no: "required",
        kind_attention: "required",
        issued_for_address: "required",
        issued_by_mobile_no: "required",
        issued_by_email_id: "required",
        is_registered: "required",
        type: "required|in:Lead,Estimate",
        workspaceId: "required",
        // amount: "required|numeric",
        // gst_rate: "required|numeric",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }

      const userId = req.decodedData.id;
      const user = await User.findOne({ where: { id: userId } });

      if (!user) {
        return res.failed(res, "User not found.");
      }
      const estimatelastnumber = await Estimate.findOne({
        order: [["id", "desc"]],
      });
      //check credit limit status approved or not
      const lead = await Lead.findOne({ where: { id: req.body.lead_id } });

      if (!lead) {
        return failed(res, "lead not found.");
      }

      const customerCheck = await Customer.findOne({
        where: { id: lead.customer_id },
      });
      // if (
      //   customerCheck.creditLimitstatus == "pending" ||
      //   customerCheck.creditLimitstatus == "declined"
      // ) {
      //   return failed(res, "Customer credit limit is not approved");
      // }

      // return success(res, customerCheck.creditLimitstatus);
      const currentYear = new Date().getFullYear();
      let newEstimateNumber;

      // Check if there’s an existing estimate number
      if (estimatelastnumber && estimatelastnumber.estimate_no) {
        // Extract the numeric part of the last estimate number and increment it
        const lastNumber = parseInt(
          estimatelastnumber.estimate_no.split("-")[2],
          10
        );
        const incrementedNumber = lastNumber + 1;

        const formattedNumber = String(incrementedNumber).padStart(4, "0");

        // Combine to get the new estimate number
        newEstimateNumber = `EN-${currentYear}-${formattedNumber}`;
      } else {
        // If no previous estimate exists, start with the first one
        newEstimateNumber = `EN-${currentYear}-0001`;
      }

      // Calculate subtotal and handle possible undefined or null fields
      // const gstAmount = req.body.amount
      //   ? (req.body.amount * (req.body.gst_rate || 0)) / 100
      //   : 0;
      // return success(res,req.body.orderItem)
      let grandTotalAmount = 0;
      let subTotalAmount = 0;
      let gstRateCount = 0;

      // Calculate the grand total amount from order items
      req.body.orderItem.forEach((item) => {
        const price = parseFloat(item.orderDetails.salesPrice) || 0;
        const quantity = parseFloat(item.orderDetails.quantity) || 0;
        const gstRate = parseFloat(item.orderDetails.gst_rate) || 0;

        const taxableAmount = price * quantity;
        const gstAmount = taxableAmount * (gstRate / 100);
        const totalAmount = taxableAmount + gstAmount;
        subTotalAmount += taxableAmount;
        grandTotalAmount += totalAmount;
        gstRateCount += gstAmount;
      });

      // Convert grand total amount to words
      // const amountInWord = numberToWords.toWords(Math.round(grandTotalAmount));
      const amountInWord = await numberToword.numberToWords(
        parseFloat(grandTotalAmount)
      );
      //     console.log({ amountInWord });
      //     console.log({ gstRateCount });
      //     console.log( "grandTotalAmount",grandTotalAmount+subTotalAmount );
      //     console.log({ subTotalAmount });
      // return 1;
      const total = grandTotalAmount + subTotalAmount;
      // Prepare request data
      const reqData = {
        lead_id: requests.lead_id,
        created_by_id: userId,
        workspace_id: requests.workspaceId,
        estimate_no: newEstimateNumber,
        kind_attention: requests.kind_attention || null,
        issued_for_address: requests.issued_for_address || null,
        issued_by_mobile_no: requests.issued_by_mobile_no || null,
        issued_by_email_id: requests.issued_by_email_id || null,
        is_registered: requests.is_registered || null,
        estimate_created_at: requests.estimate_created_at || null,
        support_doc: requests.support_doc || null,
        support_doc_name: requests.support_doc_name || null,
        signature_stamp: requests.signature_stamp || null,
        signature_stamp_name: requests.signature_stamp_name || null,
        company_logo: requests.company_logo || null,
        company_logo_name: requests.company_logo_name || null,
        terms_and_conditions: requests.terms_and_conditions || null,
        amount: subTotalAmount + gstRateCount,
        gst_rate: gstRateCount,
        sub_total: subTotalAmount,
        amount_in_words: amountInWord,
      };

      const estimate = await Estimate.create(reqData);
      //Add order items
      await prepareOrderData(
        req.body.orderItem,
        estimate.id,
        user.workspaceId,
        requests.type,
        requests.item_attributes
      );
      const leadData = await Lead.findOne({ where: { id: requests.lead_id } });
      const mailData = {
        to: leadData.email,
        subject: " A New Estimate is Created in SalesGo",
        // text: "Please find your attatchments.",
      };
      const workspace = await Workspace.findOne({
        where: { id: user.workspaceId },
      });
      let htmlContent;
      try {
        htmlContent = fs.readFileSync("views/emails/estimated.ejs", "utf-8");
      } catch (err) {
        console.error("Error reading EJS template file:", err);
        return serverError(res, "Failed to read template file");
      }
      const pdfResponse = await module.exports.estimatePdf({
        body: { estimateId: estimate.id, refrence: "Controller", userId },
      });
      const dynamicData = {
        customer_name: leadData.name,
        lead_id: requests.lead_id,
        workspaceName: workspace.name,
        attachment: pdfResponse.url,
        address: workspace.address,
        imageUrl: workspace.logo_path,
        banner_path: workspace.banner_path,
      };
      const compiledHtml = ejs.render(htmlContent, dynamicData);
      console.log({ dynamicData });
      await sendmail({
        to: mailData.to,
        subject: mailData.subject,
        html: compiledHtml,
      });

      const customer = await Customer.findOne({
        where: { id: leadData.customer_id },
      });

      const assignedUserid = await AssignUser.findOne({
        where: { documentable_type: "Lead", assignable_id: leadData.id },
        attributes: ["assign_to_id"],
      });
      const assignUser = await User.findOne({
        where: { id: assignedUserid.assign_to_id },
      });
      let htmlContenthead;
      try {
        htmlContenthead = fs.readFileSync(
          "views/emails/salesgo_estimate_created.ejs",
          "utf-8"
        );
      } catch (err) {
        console.error("Error reading EJS template file:", err);
        return serverError(res, "Failed to read template file");
      }

      const dynamicDataHead = {
        estimateNo: estimate.id,
        customerName: customer.name,
        assignByUser: assignUser.name,
        remarks: req.body.comment,
        url: `https://crm.mvikas.in/lead-management/all-estimate/detail/${estimate.id}`,
        team: workspace.name,
        legal_name: workspace.legal_name,
        address: workspace.address,
        phone: workspace.phone,
        email: workspace.email,
        banner: workspace.banner_path,
        imageUrl: workspace.logo_path,
      };

      const compiledHtmlHead = ejs.render(htmlContenthead, dynamicDataHead);
      const users = await User.findAll({ attributes: ["id", "email"] });
      const emails = users.map((user) => user.email);
      const Ids = users.map((user) => user.id);

      let notificationEntities = [];

      // Add finance team email if there are emails available
      if (emails.length > 0) {
        notificationEntities.push({
          email: emails,
          ids: Ids,
          subject: `A New Estimate is Created in SalesGo`,
          html: compiledHtmlHead,
        });
      }

      if (notificationEntities.length > 0) {
        // console.log({ notificationEntities });
        await sendNotificationEmail(
          notificationEntities,
          "salesgo_estimate_created",
          "user",
          requests.workspaceId
        );
      }
      return success(res, "Data saved successfully.", reqData);
    } catch (error) {
      console.error(error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  updateEstimate: async (req, res) => {
    try {
      const requests = req.body;

      // Validate the incoming request
      const v = new Validator(requests, {
        estimate_id: "required",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }

      const userId = req.decodedData.id;
      const user = await User.findOne({ where: { id: userId } });

      // Find the existing estimate by ID
      const estimate = await Estimate.findOne({
        where: { id: req.body.estimate_id },
      });
      if (!estimate) {
        return notFound(res, "Estimate not found.");
      }
      const lead = await Lead.findOne({ where: { id: estimate.lead_id } });

      if (!lead) {
        return failed(res, "lead not found.");
      }

      const customerCheck = await Customer.findOne({
        where: { id: lead.customer_id },
      });
      // if (
      //   customerCheck.creditLimitstatus == "pending" ||
      //   customerCheck.creditLimitstatus == "declined"
      // ) {
      //   return failed(res, "Customer credit limit is not approved.");
      // }
      let grandTotalAmount = 0;
      let subTotalAmount = 0;
      let gstRateCount = 0;

      // Calculate the grand total amount from order items
      req.body.orderItem.forEach((item) => {
        const price = parseFloat(item.orderDetails.salesPrice) || 0;
        const quantity = parseFloat(item.orderDetails.quantity) || 0;
        const gstRate = parseFloat(item.orderDetails.gst_rate) || 0;

        const taxableAmount = price * quantity;
        const gstAmount = taxableAmount * (gstRate / 100);
        const totalAmount = taxableAmount + gstAmount;
        subTotalAmount += taxableAmount;
        grandTotalAmount += totalAmount;
        gstRateCount += gstAmount;
      });
      // const amountInWord = numberToWords.toWords(Math.round(grandTotalAmount));
      const amountInWord = await numberToword.numberToWords(
        parseFloat(grandTotalAmount)
      );

      // const amountInWord = numberToWords.toWords(requests.amount);

      // Prepare the data for updating the estimate
      const updateData = {
        lead_id: req.body.lead_id,
        created_by_id: req.decodedData.id,
        workspace_id: requests.workspace_id,
        estimate_no: req.body.estimate_no,
        kind_attention: req.body.kind_attention,
        issued_for_address: req.body.issued_for_address,
        issued_by_mobile_no: req.body.issued_by_mobile_no,
        issued_by_email_id: req.body.issued_by_email_id,
        is_registered: req.body.is_registered,
        estimate_created_at: req.body.estimate_created_at,
        support_doc: req.body.support_doc,
        support_doc_name: req.body.support_doc_name,
        signature_stamp: req.body.signature_stamp,
        signature_stamp_name: req.body.signature_stamp_name,
        company_logo: req.body.company_logo,
        company_logo_name: req.body.company_logo_name,
        terms_and_conditions: req.body.terms_and_conditions,
        company_logo: requests.company_logo || null,
        company_logo_name: requests.company_logo_name || null,
        terms_and_conditions: requests.terms_and_conditions || null,
        amount: gstRateCount + subTotalAmount,
        gst_rate: gstRateCount,
        sub_total: subTotalAmount,
        amount_in_words: amountInWord,
        itemable_type: requests.type,
      };

      // Update the existing estimate record
      await estimate.update(updateData);
      if (requests.orderItem) {
        // console.log("requests.orderItem",requests.orderItem)
        await OrderItem.destroy({
          where: { itemable_id: req.body.estimate_id },
        }); // Remove existing order items

        await updatePrepareOrderData(
          requests.orderItem,
          req.body.estimate_id,
          user.workspaceId,
          requests.type
        );

        // await OrderItem.bulkCreate(orderData); // Add updated order items
      }
      return success(res, "Data updated successfully.", updateData);
    } catch (error) {
      console.error(error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  getEstimate: async (req, res) => {
    try {
      // Validate request parameters
      const validate = new Validator(req.query, {
        estimateId: "required|integer",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      const estimateId = req.query.estimateId;

      // Fetch estimate data with nested relations
      const estimate = await Estimate.findOne({
        where: { id: estimateId },
        include: [
          {
            model: Lead,
            as: "leadData",
            include: [
              // {
              //   model: OrderItem,
              //   as: "orderItems",
              //   required: false,
              //   where: { itemable_type: "Estimate" },
              //   include: [
              //     {
              //       model: Product,
              //       as: "product",
              //       include: [
              //         {
              //           model: ProductCombination,
              //           as: "combinationData",
              //           attributes: ["id", "productId", "variantName"],
              //           include: [
              //             {
              //               model: ProductCombinationValue,
              //               as: "combinationValueData",
              //               attributes: ["attributeValueId", "attributeId"],
              //               include: [
              //                 {
              //                   model: CrmAttribute,
              //                   as: "productAttribute",
              //                   attributes: ["id", "name"],
              //                 },
              //                 {
              //                   model: CrmAttributeValue,
              //                   as: "productAttributeValue",
              //                   attributes: ["id", "value"],
              //                 },
              //               ],
              //             },
              //           ],
              //         },
              //       ],
              //     },
              //     {
              //       model: CrmMake,
              //       as: "makeData",
              //     },
              //     {
              //       model: CrmUnitType,
              //       as: "unitTypeData",
              //       attributes: ["name"],
              //     },
              //     {
              //       model: OrderItemVendor,
              //       as: "orderVendorItem",

              //       include: [
              //         {
              //           model: Vendor,
              //           as: "vendor",
              //           required: false,
              //           include: [
              //             {
              //               model: Unit,
              //               as: "unitData",
              //               attributes: ["name"],
              //             },
              //           ],
              //         },
              //       ],
              //     },
              //   ],
              // },
              {
                model: Customer,
                as: "customerData",
                attributes: ["name", "customerAddress"],
              },
              {
                model: Document,
                as: "documentData",
              },
              {
                model: MrsLead,
                as: "documentDetails",
              },
            ],
          },
          {
            model: Workspace,
            as: "workspaceData",
          },
          {
            model: OrderItem,
            as: "orderItems",
            required: false,
            where: { itemable_type: "Estimate" },
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
                model: CrmMake,
                as: "makeData",
              },
              {
                model: CrmUnitType,
                as: "unitTypeData",
                attributes: ["name"],
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
        ],
      });

      if (!estimate) {
        return failed(res, "Estimate not found.");
      }

      // Process ProductCombination data
      // const processedOrderItems = [];
      // for (const orderItem of estimate.leadData.orderItems) {
      //   const product = orderItem.product;

      //   if (product && Array.isArray(product.combinationData)) {
      //     const combinations = [];
      //     for (const combination of product.combinationData) {
      //       const attributeMap = {};

      //       for (const attrValue of combination.combinationValueData) {
      //         const attr = attrValue.productAttribute;
      //         const attrVal = attrValue.productAttributeValue;

      //         if (!attributeMap[attr.id]) {
      //           attributeMap[attr.id] = {
      //             id: attr.id,
      //             name: attr.name,
      //             values: [],
      //           };
      //         }

      //         attributeMap[attr.id].values.push({
      //           id: attrVal.id,
      //           value: attrVal.value,
      //         });
      //       }

      //       combinations.push({
      //         id: combination.id,
      //         productId: combination.productId,
      //         variantName: combination.variantName,
      //         combinationValueData: Object.values(attributeMap),
      //       });
      //     }

      //     // Remove productAttributeValues from the final response
      //     delete product.productAttributeValues;

      //     processedOrderItems.push({
      //       ...orderItem.toJSON(),
      //       product: {
      //         ...product.toJSON(),
      //         combinationData: combinations,
      //       }
      //     });
      //   } else {
      //     processedOrderItems.push(orderItem.toJSON());
      //   }
      // }

      // Group documents by department
      const scmDocuments = [];
      const salesDocuments = [];

      // Check if documentData exists before accessing it
      if (estimate.leadData && estimate.leadData.documentData) {
        estimate.leadData.documentData.forEach((doc) => {
          if (doc.department === "scm") {
            scmDocuments.push(doc);
          } else if (doc.department === "sales") {
            salesDocuments.push(doc);
          }
        });
      }

      // Structure the response
      const response = {
        ...estimate.toJSON(),
        leadData: estimate.leadData
          ? {
              ...estimate.leadData.toJSON(),
              // orderItems: processedOrderItems,
              documentData: {
                scm: scmDocuments,
                sales: salesDocuments,
              },
            }
          : null,
      };

      return success(res, "Data fetched successfully.", response);
    } catch (error) {
      console.error(error); // Log the error for debugging
      return serverError(res, "Internal server error.");
    }
  },
  //This is with lead list
  listEstimate: async (req, res, whereCondition = {}) => {
    try {
      const request = req.query;

      // Validate the incoming request
      const v = new Validator(request, {
        workspaceId: "required",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }
      const search = request.search ? request.search : "";
      const page = request.page ? parseInt(request.page) : 1;
      const pageSize = request.limit
        ? parseInt(request.limit)
        : parseInt(process.env.PAGE_LIMIT);
      const offset = (page - 1) * pageSize;
      const userId = req.decodedData.id;
      const user = await User.findOne({ where: { id: userId } });

      if (!user) {
        return res.failed(res, "User not found.");
      }
      const leadId = request.leadId || "";
      let params = {};
      if (user.userType === 0) {
        // params = {};
        if (request.workspaceId > 1) {
          // console.log({ user });
          params = {
            ...params,
            [Op.and]: [
              { id: { [Op.ne]: user.id } },
              {
                workspace_id: request.workspaceId,
                ...(leadId ? { lead_id: leadId } : {}),
                ...whereCondition,
              },
            ],
          };
        } else {
          params = {
            ...(leadId ? { lead_id: leadId } : {}),
          };
        }
      } else {
        params = {
          workspace_id: request.workspaceId,
          ...(leadId ? { lead_id: leadId } : {}),
          ...whereCondition,
        };
      }
      // console.log({ params });

      if (search) {
        params = {
          [Op.or]: [
            {
              kind_attention: {
                [Op.like]: `%${search}%`,
              },
            },
            {
              issued_by_mobile_no: {
                [Op.like]: `%${search}%`,
              },
            },
            {
              issued_by_email_id: {
                [Op.like]: `%${search}%`,
              },
            },
            {
              "$workspaceData.legal_name$": {
                [Op.like]: `%${search}%`,
              },
            },
          ],
        };
      }
      // Use findAndCountAll to get both the data and the count
      const { count, rows: list } = await Estimate.findAndCountAll({
        where: params,
        include: [
          {
            model: Workspace,
            as: "workspaceData",
            attributes: ["id", "legal_name"],
          },
          {
            model: User,
            as: "createdBy",
            attributes: ["name"],
          },
          {
            model: Lead,
            as: "leadData",
            attributes: ["id", "name", "status"],
            include: [
              {
                model: AssignUser,
                as: "assignUser",
                attributes: [
                  "id",
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
                model: Customer,
                as: "customerData",
                attributes: ["creditLimitstatus"],
              },
            ],
          },
        ],
        attributes: [
          "id",
          "lead_id",
          "created_by_id",
          "workspace_id",
          "estimate_no",
          "sub_total",
          "kind_attention",
          "issued_by_mobile_no",
          "issued_by_email_id",
          "createdAt",
          "status",
          "pdf_path",
          "amount",
        ],
        offset: offset,
        limit: pageSize,
        order: [["id", "DESC"]],
        distinct: true,
      });
      const seenIds = new Set();
      const uniqueLeads = [];

      // Loop through the leads and add only unique ones
      for (const lead of list) {
        if (!seenIds.has(lead.id)) {
          seenIds.add(lead.id);
          uniqueLeads.push(lead);
        }
      }
      // Iterate over the list to add isEstimate flag
      // const updatedList = list.map((estimate) => {
      //   return {
      //     ...estimate.toJSON(),
      //     isEstimate: estimate.leadData.estimateData ? 1 : 0,
      //   };
      // });
      return success(res, USER_CONSTANTS.DATA_FETCHED, {
        list: uniqueLeads,
        totalRecords: count,
      });
    } catch (error) {
      console.log({ error });
      return serverError(res, "Internal server error.");
    }
  },
  //this is only estimate list
  allEstimate: async (req, res) => {
    try {
      const request = req.query;

      // Validate the incoming request
      const v = new Validator(request, {
        workspaceId: "required",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }
      const search = request.search ? request.search : "";
      const page = request.page ? parseInt(request.page) : 1;
      const pageSize = request.limit
        ? parseInt(request.limit)
        : parseInt(process.env.PAGE_LIMIT);
      const offset = (page - 1) * pageSize;
      const user = await User.findOne({ where: { id: req.decodedData.id } });

      let params = { workspace_id: request.workspaceId };

      if (search) {
        params = {
          [Op.or]: [
            { company_name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { phone: { [Op.like]: `%${search}%` } },
            { name: { [Op.like]: `%${search}%` } },
          ],
        };
      }

      // Use findAndCountAll to get both the data and the count
      const { rows: list, count } = await Lead.findAndCountAll({
        where: params,
        limit: pageSize,
        offset,
        include: [
          {
            model: AssignUser,
            as: "assignUser",

            attributes: [
              "id",
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
            model: Estimate,
            as: "estimateData",
            attributes: ["id", "status", "createdAt"],
            required: false,
          },
          {
            model: Customer,
            as: "customerData",
            attributes: ["creditLimitstatus"],
          },
        ],
        attributes: {
          include: [
            [
              Sequelize.literal(
                `CASE WHEN estimateData.id IS NOT NULL THEN true ELSE false END`
              ),
              "isEstimate",
            ],
          ],
        },
        order: [["id", "DESC"]],
        distinct: true,
      });
      // Use a set to track the seen IDs and filter out duplicates
      const seenIds = new Set();
      const uniqueLeads = [];

      // Loop through the leads and add only unique ones
      for (const lead of list) {
        if (!seenIds.has(lead.id)) {
          seenIds.add(lead.id);
          uniqueLeads.push(lead);
        }
      }
      return success(res, USER_CONSTANTS.DATA_FETCHED, {
        list: uniqueLeads,
        totalRecords: count,
      });
    } catch (error) {
      console.log({ error });
      return serverError(res, "Internal server error.");
    }
  },
  sendEstimateEmail: async (req, res) => {
    try {
      const requests = req.body;
      // console.log({ requests });
      // return 1;
      // Validate the decrypted request
      const v = new Validator(requests, {
        estimateId: "required",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }
      const filePaths = [
        "/path/to/your/file1.pdf", // Example file paths on your server
        "/path/to/your/file2.jpg",
      ];
      const userId = req.decodedData.id;
      const user = await User.findOne({ where: { id: userId } });

      if (!user) {
        return res.failed(res, "User not found.");
      }
      const workspace = await Workspace.findOne({
        where: { id: user.workspaceId },
      });
      const estimateId = req.body.estimateId;
      const estimate = await Estimate.findOne({ where: { id: estimateId } });
      if (!estimate) {
        return failed(res, "Estimate not found.");
      }
      const leadData = await Lead.findOne({ where: { id: estimate.lead_id } });

      let htmlContent;
      try {
        htmlContent = fs.readFileSync("views/emails/sendEstimate.ejs", "utf-8");
      } catch (err) {
        console.error("Error reading EJS template file:", err);
        return serverError(res, "Failed to read template file");
      }

      const pdfResponse = await module.exports.estimatePdf({
        body: { estimateId, refrence: "Controller", userId },
      });
      const mailData = {
        to: req.body.email.split(","), // Assuming multiple emails are sent as a comma-separated string
        cc: req.body.ccEmails ? req.body.ccEmails.split(",") : [],
        subject: `Your Quotation ${estimate.estimate_no} from MVIKAS is ready!`,
        html: htmlContent,
        attachments: [
          {
            filename: req.body.image,
            path: req.body.image,
          },
        ],
      };

      const dynamicData = {
        customer_name: leadData.name,
        lead_id: requests.lead_id,
        team: workspace.legal_name,
        phone: workspace.phone,
        email: workspace.email,
        attachment: pdfResponse.url,
        workspaceName: workspace.name,
        address: workspace.address,
        imageUrl: workspace.logo_path,
        banner_path: workspace.banner_path,
        estimate_no: estimate.estimate_no,
      };
      const compiledHtml = ejs.render(htmlContent, dynamicData);
      console.log({ mailData });
      await sendmail({
        to: mailData.to,
        subject: mailData.subject,
        html: compiledHtml,
        attachments: [
          {
            filename: req.body.image,
            path: req.body.image,
          },
        ],
      });

      // const mailResponse = await mail(mailData);
      // console.log({ mailResponse });
      // if (mailResponse) {
      //   return success(res, "Email sent successfully with attachments!");
      // } else {
      //   return serverError(res, "Failed to send email with attachments.");
      // }
      return success(res, "Email sent successfully with attachments!");
    } catch (error) {
      console.log({ error });
      return serverError(res, "Internal server error.");
    }
  },
  sendEstimateWhatsapp: async (req, res) => {
    try {
      // Validate request body
      const v = new Validator(req.body, {
        estimateId: "required",
        phoneNumbers: "required|array",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }

      const { estimateId, phoneNumbers } = req.body;

      // Fetch estimate with associated workspace data
      const estimate = await Estimate.findOne({
        where: { id: estimateId },
        include: [
          {
            model: Workspace,
            as: "workspaceData",
            attributes: ["id", "legal_name"],
          },
        ],
      });

      // Check if estimate exists
      if (!estimate) {
        return failed(res, "Estimate not found.");
      }

      // Prepare data for WhatsApp message
      const authKey = "329821AzZHpXuT64f1d624P1";
      const fromNumber = "919818105319";
      const templateName = "salesgo_send_estimate";
      const languageCode = "en";
      const receiverNumbers = phoneNumbers;

      // Check if company_logo and support_doc are available
      const components = {
        header_1: {
          type: "document",
          value: estimate.company_logo || "",
          filename: estimate.support_doc || "estimate_document",
        },
        body_1: {
          type: "text",
          value: estimate.kind_attention || "N/A",
        },
        body_2: {
          type: "text",
          value: estimate.estimate_no || "N/A",
        },
        body_3: {
          type: "text",
          value: estimate.workspaceData?.legal_name || "N/A",
        },
      };

      // Send WhatsApp message
      const sendmsg = await sendWhatsAppMessage(
        authKey,
        fromNumber,
        templateName,
        languageCode,
        receiverNumbers,
        components
      );

      // console.log({ sendmsg });

      return success(res, "Notification sent successfully.", sendmsg);
    } catch (error) {
      console.error({ error });
      return serverError(res, "Internal server error.");
    }
  },

  uploadPo: async (req, res) => {
    try {
      const requests = req.body;

      // Validate the incoming request
      const v = new Validator(requests, {
        estimateId: "required",
        fileUrl: "required",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }
      await Estimate.update(
        { pdf_path: requests.fileUrl },
        { where: { id: requests.estimateId } }
      );

      return success(res, "PO uploaded sucessfully.");
    } catch (error) {
      console.log({ error });
      return serverError(res, "Internal server error.");
    }
  },
  deleteEstimate: async (req, res) => {
    try {
      const requests = req.body;

      // Validate the incoming request
      const v = new Validator(requests, {
        estimateId: "required",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }
      await Estimate.destroy({
        individualHooks: true, // Use individual hooks for the destroy operation
        hooks: true, // Enable global hooks
        returning: false, // Do not return the deleted retailer object
        where: { id: requests.estimateId }, // Additional where clause to ensure specific user deletion
      });
      return success(res, "Data deleted successfully.");
    } catch (error) {
      console.log({ error });
      return serverError(res, "Internal server error.");
    }
  },
  changeEstimateStatus: async (req, res) => {
    try {
      // Validate request body parameters
      const validate = new Validator(req.body, {
        estimateId: "required|integer",
        status: "required|in:open,closed",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      const userId = req.decodedData.id;
      const user = await User.findOne({ where: { id: userId } });

      // Fetch the existing estimate by ID
      const estimate = await Estimate.findOne({
        where: { id: req.body.estimateId },
      });
      if (!estimate) {
        return notFound(res, "Estimate not found.");
      }

      // Get the original data for logging changes
      const originalData = estimate.toJSON();

      // Update the estimate's status
      await estimate.update({
        status: req.body.status,
      });

      // Log the update activity, including both the original and updated data
      await ActivityLog.create({
        entity_id: req.body.estimateId,
        entity_type: "CrmEstimate",
        operation_type: "ESTIMATE STATUS UPDATED",
        performed_by_id: req.decodedData.id,
        changes: {
          before: originalData,
          after: { ...originalData, status: req.body.status },
        },
      });

      return success(res, "Estimate status updated successfully.");
    } catch (error) {
      console.error(error); // Log the error for debugging
      return serverError(res, "Internal server error.");
    }
  },
  estimatePdf: async (req, res) => {
    try {
      const requests = req.body;

      // Validate the decrypted request
      const v = new Validator(requests, {
        estimateId: "required",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }
      let user = {};
      if (req.body.refrence == "Controller") {
        user = await User.findOne({ where: { id: req.body.userId } });
      } else {
        user = await User.findOne({ where: { id: req.decodedData.id } });
      }
      const workspace = await Workspace.findOne({
        where: { id: user.workspaceId },
      });
      // console.log("req.decodedData.id ",user.workspaceId);
      // return 1;
      const estimateId = req.body.estimateId;

      // Fetch estimate data with nested relations
      const estimate = await Estimate.findOne({
        where: { id: estimateId },
        include: [
          {
            model: Lead,
            as: "leadData",
            include: [
              // {
              //   model: OrderItem,
              //   as: "orderItems",
              //   required: false,
              //   where: { itemable_type: "Estimate" },
              //   include: [
              //     {
              //       model: CrmUnitType,pdf
              //       as: "unitTypeData",
              //       attributes: ["name"],
              //     },
              //     {
              //       model: Product,
              //       as: "product",
              //       include: [
              //         {
              //           model: ProductCombination,
              //           as: "combinationData",
              //           attributes: ["id", "productId", "variantName"],
              //           include: [
              //             {
              //               model: ProductCombinationValue,
              //               as: "combinationValueData",
              //               attributes: ["attributeValueId", "attributeId"],
              //               include: [
              //                 {
              //                   model: CrmAttribute,
              //                   as: "productAttribute",
              //                   attributes: ["id", "name"],
              //                 },
              //                 {
              //                   model: CrmAttributeValue,
              //                   as: "productAttributeValue",
              //                   attributes: ["id", "value"],
              //                 },
              //               ],
              //             },
              //           ],
              //         },
              //       ],
              //     },
              //     {
              //       model: CrmMake,
              //       as: "makeData",
              //     },
              //     {
              //       model: OrderItemVendor,
              //       as: "orderVendorItem",
              //       include: [
              //         {
              //           model: Vendor,
              //           as: "vendor",
              //         },
              //       ],
              //     },
              //   ],
              // },
              {
                model: Customer,
                as: "customerData",
                attributes: [
                  "name",
                  "customerAddress",
                  "companyName",
                  "email",
                  "mobile",
                ],
              },
              {
                model: Document,
                as: "documentData",
              },
              {
                model: MrsLead,
                as: "documentDetails",
              },
              {
                model: Customer,
                as: "customerData",
              },
            ],
          },
          {
            model: OrderItem,
            as: "orderItems",
            required: false,
            where: { itemable_type: "Estimate" },
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
                model: CrmMake,
                as: "makeData",
              },
              {
                model: CrmUnitType,
                as: "unitTypeData",
                attributes: ["name"],
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
        ],
      });
      // return success(res,estimate)

      if (!estimate) {
        return failed(res, "Estimate not found.");
      }
      const estimateUser = await User.findOne({
        where: { id: estimate.created_by_id },
      });
      // return success(res, estimate);
      // Load the template file
      let htmlContent;
      try {
        htmlContent = fs.readFileSync(
          "views/pdf_invoices/estimate.ejs",
          "utf-8"
        );
      } catch (err) {
        console.error("Error reading EJS template file:", err);
        return serverError(res, "Failed to read template file");
      }

      // Prepare dynamic data for the EJS template
      const imageUrl =
        workspace && workspace.logo_path ? workspace.logo_path : "";
      let subtotal = 0;
      let gstTotal = 0;
      // return success(res,estimate)
      // Check if orderItems is valid and is an array
      if (estimate.orderItems && Array.isArray(estimate.orderItems)) {
        // Using a for loop to iterate through orderItems
        for (let i = 0; i < estimate.orderItems.length; i++) {
          const orderItem = estimate.orderItems[i];
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
      console.log({ subtotal });
      console.log({ gstTotal });

      // Calculate the grand total (subtotal + GST)
      let grandTotal = subtotal + gstTotal;

      // Round grand total to two decimal places for consistency
      grandTotal = grandTotal.toFixed(2);
      console.log({ grandTotal });
      // console.log({ grandTotal });

      // Convert grand total to words
      // const amountInWord = numberToWords.toWords(parseFloat(grandTotal));
      const amountInWord = await numberToword.numberToWords(
        parseFloat(grandTotal)
      );

      // return success(res, amountInWord);
      const dynamicData = {
        imageUrl,
        company_name: workspace.legal_name,
        compnay_address: workspace.address,
        company_phone: workspace.phone,
        company_email: workspace.email,
        company_gst: workspace.gst_tin,
        customer_company_name: estimate.leadData.customerData.companyName
          ? estimate.leadData.customerData.companyName
          : "",
        customer_address: estimate.leadData.customerData.customerAddress,
        customer_name: estimate.leadData.customerData.name,
        customer_email: estimate.leadData.customerData.email,
        customer_mobile: estimate.leadData.customerData.mobile,
        issued_for_address: estimate.issued_for_address,
        estimate_no: estimate.estimate_no,
        estimate_created_at: estimate.createdAt,
        orderItems: estimate.orderItems,
        subtotal: estimate.sub_total,
        gst_rate: estimate.gst_rate,
        totalAmount: estimate.amount,
        amount_in_words: amountInWord,
        terms_and_conditions: estimate.terms_and_conditions,
        bankName: workspace.bank_name,
        bankIfsc: workspace.bank_ifsc,
        bank_ac_number: workspace.bank_ac_number,
        logo_path: workspace.logo_path,
        signature: user.signature,
        estimateUser: estimateUser.name,
        workspace_name: workspace.name,

      };
      const compiledHtml = ejs.render(htmlContent, dynamicData);
      const options = { format: "A4", printBackground: true };

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
        return serverError(res, "PDF generation or S3 upload failed.");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      return serverError(res, "Network error");
    }
  },
};
