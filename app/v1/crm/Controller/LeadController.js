const { Validator } = require("node-input-validator");
const {
  serverError,
  success,
  validateFail,
  failed,
} = require("../../../helper/response");
const db = require("../../../../models");
const sequelize = db.sequelize;
const OrderItemVendor = db.CrmOrderItemVendor;
const Vendor = db.CrmVendor;
const CrmAllCustomer = db.CrmAllCustomer;
const OrderItem = db.CrmOrderItems;
const CrmDocumentType = db.CrmDocumentType;
const CrmUnitType = db.CrmUnitType;
const User = db.crmuser;
const Document = db.CrmDocument;
const Product = db.crmProduct;
const Lead = db.CrmLead;
const CrmMake = db.CrmMake;
const MrsLead = db.CrmMrsLead;
const AssignUser = db.CrmAssign;
const ActivityLog = db.CrmActivityLogs;
const Reasons = db.CrmAssignReason;
const State = db.CrmState;
const City = db.CrmCity;
const CrmAttribute = db.CrmAttribute;
const CrmAttributeValue = db.CrmAttributeValue;
const ProductAttrValue = db.crmProductAttributeValue;
const ProductCombination = db.productAttributeCombination;
const ProductCombinationValue = db.attributeValueCombination;
const TeleSale = db.CrmTelesale;
const Workspace = db.crmworkspace;
const fs = require("fs");
const pdf = require("html-pdf-node");
const ejs = require("ejs");
const { uploadPdfToS3 } = require("../../../helper/aws");
const Unit = db.Unit;
const {
  createLeadData,
  prepareOrderData,
  updatePrepareOrderData,
  handleDocuments,
  prepareMrsLeadData,
} = require("../../../helper/helpers");
const { sendmail } = require("../../../helper/mail");
const { Op } = require("sequelize");
const moment = require("moment");
const {
  USER_CONSTANTS,
  SYSTEM_FAILURE,
  ADMIN_CONSTANTS,
} = require("../../../helper/message");
const { aws } = require("../../../helper/aws");
const { sendNotificationEmail } = require("../../../helper/sendSms");

let baseUrl = process.env.APP_URL;
module.exports = {
  imageUpload: async (req, res) => {
    try {
      // Validate request body
      const validate = new Validator(req.body, {
        docType: "required",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      const docType = req.body.docType;

      // Check if the file is provided in the request
      if (req.files && req.files.doc) {
        // Upload the file to AWS and get the file location
        const docFileName = await aws(req.files.doc, `crm/${docType}`);

        // Ensure reqData is initialized before use
        const reqData = {
          doc: docFileName.Location,
        };

        return success(res, reqData);
      } else {
        return failed(res, "File is required");
      }
    } catch (error) {
      console.error(error); // Log the error for debugging
      return serverError(res, "Internal server error.");
    }
  },
  getDocumentType: async (req, res) => {
    try {
      const list = await CrmDocumentType.findAll();
      return success(res, "Data listed success", list);
    } catch (error) {
      console.error(error);
      return serverError(res, "Internal server error.");
    }
  },
  getUnitype: async (req, res) => {
    try {
      const list = await CrmUnitType.findAll();
      return success(res, "Data listed success", list);
    } catch (error) {
      console.error(error);
      return serverError(res, "Internal server error.");
    }
  },
  createLead: async (req, res) => {
    try {
      // Validate request body
      const validate = new Validator(req.body, {
        customerId: "required|integer",
        name: "required",
        email: "required|email",
        contactno: "required",
        companyName: "required",
        // purchaseOfficerName: "required",
        // purchaseOfficerNo: "required",
        leadSource: "required",
        // gstIn: "required",
        registeredAddress: "required",
        customerState: "required|integer",
        // customerCity: "required|integer",
        shipAddress: "required",
        shipState: "required|integer",
        // shipCity: "required|integer",
        estimateLeadOrderValue: "required",
        leadPriority: "required",
        // salesRemarkForLead: "required",
        // freightCostTillDestination: "required",
        // vehicleCapcity: "required",
        // scmRemarkForLead: "required",
        type: "required|in:Lead,Estimate",
        workspaceId: "required",
        // orderItem: "JSON",
        // salesDocument: "JSON",
        // scmDocument: "JSON",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      // console.log("lead data ++++++++", req.body);

      const userId = req.decodedData.id;

      const user = await User.findOne({ where: { id: userId } });

      const leadData = await createLeadData(
        req.body,
        userId,
        req.body.workspaceId
      );
      const lead = await Lead.create(leadData);

      const workspace = await Workspace.findOne({
        where: { id: req.body.workspaceId },
      });
      if (!workspace) {
        return failed(res, "Workspace not found.");
      }
      let htmlContent;
      let htmlContentHead;
      try {
        htmlContent = fs.readFileSync(
          "views/emails/lead_acknowledge.ejs",
          "utf-8"
        );
        htmlContentHead = fs.readFileSync(
          "views/emails/leadCreated.ejs",
          "utf-8"
        );
      } catch (err) {
        console.error("Error reading EJS template file:", err);
        return res
          .status(500)
          .json({ message: "Failed to read template file" });
      }

      const orderData = await prepareOrderData(
        req.body.orderItem,
        lead.id,
        req.body.workspaceId,
        req.body.type
      );
      // await OrderItem.bulkCreate(orderData);

      const salesDocumentData = await handleDocuments(
        req.body.salesDocument,
        userId,
        lead.id,
        "sales",
        "Lead",
        req.body.type
      );
      await Document.bulkCreate(salesDocumentData);

      const scmDocumentData = await handleDocuments(
        req.body.scmDocument,
        userId,
        lead.id,
        "scm",
        "Lead",
        req.body.type
      );
      await Document.bulkCreate(scmDocumentData);

      const mrsLeadData = await prepareMrsLeadData(req.body, lead.id, userId);
      await MrsLead.create(mrsLeadData);
      // Log the creation activity
      await ActivityLog.create({
        entity_id: lead.id,
        entity_type: "CrmLeads",
        operation_type: "CREATE",
        performed_by_id: req.decodedData.id,
      });
      if (req.body.telesale_id) {
        const telesaleAssignUser = await AssignUser.findOne({
          where: {
            assignable_id: req.body.telesale_id,
            documentable_type: "Telesales",
          },
        });

        if (telesaleAssignUser) {
          // Update the assignable_id and documentable_type to point to the new lead
          await telesaleAssignUser.update({
            assignable_id: lead.id,
            documentable_type: "Lead",
          });

          // Destroy the telesale record only after updating
          await TeleSale.destroy({ where: { id: req.body.telesale_id } });
        }
      }
      if (req.body.workspaceId) {
        const assigniId = workspace.userId;
        const reqData = {
          assign_by_id: req.decodedData.id,
          assignable_id: lead.id,
          documentable_type: "Lead",
          assign_to_id: parseInt(assigniId),
        };
        // Check for an existing assignment
        const existingAssignedUser = await AssignUser.findOne({
          where: { assignable_id: lead.id, documentable_type: "Lead" },
        });

        // If an existing assignment is found, delete it
        if (existingAssignedUser) {
          await existingAssignedUser.destroy();
        }
        await AssignUser.create(reqData);
      }

      const pdfResponse = await module.exports.leadPdf({
        body: { leadId: lead.id, refrence: "Controller", userId },
      });
      // console.log("+++++++++++++++", workspace);
      const dynamicData = {
        customer_name: req.body.name,
        userName: user.name,
        attachment: pdfResponse.url,
        imageUrl: workspace.logo_path,
        banner_path: workspace.banner_path,
        url: `https://crm.mvikas.in/lead-management/allLead/lead-details/${lead.id}`,
        team: workspace.name,
        legal_name: workspace.legal_name,
        workspaceName: workspace.name,
        address: workspace.address,
        phone: workspace.phone,
        email: workspace.email,
      };
      const compiledHtml = ejs.render(htmlContent, dynamicData);
      const compiledHtmlHead = ejs.render(htmlContentHead, dynamicData);

      // Format the date
      const formattedDate = new Date()
        .toLocaleDateString("en-GB")
        .replace(/\//g, "-");

      /****************** Customer send notitfication ***********************/
      const mailData = [
        {
          email: req.body.email,
          ids: req.body.customerId,
          subject: `Confirmation of your Requirement dated ${formattedDate}`,
          html: compiledHtml,
          attachments: [
            {
              filename: pdfResponse.url,
              path: pdfResponse.url,
            },
          ],
        },
      ];

      await sendNotificationEmail(
        mailData,
        "salesgo_lead_acknowledgement",
        "customer",
        req.body.workspaceId
      );
      console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$", workspace.id);
      /*************** Internal Users send notification ***************/
      const users = await User.findAll({
        where: { workspaceId: req.body.workspaceId },
        attributes: ["email", "id"],
      });
      const emails = users.map((user) => user.email);
      const Ids = users.map((user) => user.id);
      let notificationEntities = [];
      notificationEntities.push({
        email: emails,
        ids: Ids,
        subject: `New Lead ${lead.id} Created in SalesGo`,
        html: compiledHtmlHead,
        attachments: [
          {
            filename: pdfResponse.url,
            path: pdfResponse.url,
          },
        ],
      });
      // await sendNotificationEmail(
      //   notificationEntities,
      //   "salesgo_lead_created",
      //   "user",
      //   workspace.id
      // );
      // if (req.body.telesale_id > 0) {
      //   await sendmail({
      //     to: mailData.to,
      //     subject: mailData.subject,
      //     html: compiledHtml,
      //     attachments: [
      //       {
      //         filename: pdfResponse.url,
      //         path: pdfResponse.url,
      //       },
      //     ],
      //   });
      // } else {
      //   notificationEntities.push({
      //     email: mailData.to,
      //     ids: mailData.userId,
      //     subject: `Confirmation of your Requirement dated ${formattedDate}`,
      //     html: compiledHtmlHead,
      //     attachments: [
      //       {
      //         filename: pdfResponse.url,
      //         path: pdfResponse.url,
      //       },
      //     ],
      //   });
      //   console.log({ notificationEntities });
      //   await sendNotificationEmail(
      //     notificationEntities,
      //     "salesgo_lead_acknowledgement",
      //     "customer",
      //     workspace.id
      //   );
      // }

      return success(res, "Lead created successfully.", req.body);
    } catch (error) {
      console.error(error); // Log the error for debugging
      return serverError(res, "Internal server error.");
    }
  },
  getLead: async (req, res) => {
    try {
      // Validate request parameters
      const validate = new Validator(req.query, {
        leadId: "required|integer",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      const leadId = req.query.leadId;

      // Fetch lead data with nested relations
      const lead = await Lead.findOne({
        where: { id: leadId },
        include: [
          {
            model: OrderItem,
            as: "orderItems",
            where: { itemable_type: "Lead" },
            required: false,
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
                model: CrmUnitType,
                as: "unitTypeData",
                attributes: ["name"],
              },
              {
                model: CrmMake,
                as: "makeData",
              },
              {
                model: OrderItemVendor,
                as: "orderVendorItem",
                include: [
                  {
                    model: Vendor,
                    as: "vendor",
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
            model: Document,
            as: "documentData",
          },
          {
            model: MrsLead,
            as: "documentDetails",
          },
          {
            model: State,
            as: "stateData",
            attributes: ["name"],
          },
          {
            model: City,
            as: "cityData",
            attributes: ["name"],
          },
          {
            model: State,
            as: "shippingStateData",
            attributes: ["name"],
          },
          {
            model: City,
            as: "shippingCityData",
            attributes: ["name"],
          },
        ],
      });

      if (!lead) {
        return failed(res, "Lead not found.");
      }

      // Process ProductCombination data
      const processedOrderItems = [];
      for (const orderItem of lead.orderItems) {
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

      // Group documents by department
      const scmDocuments = [];
      const salesDocuments = [];

      lead.documentData.forEach((doc) => {
        if (doc.department === "scm") {
          scmDocuments.push(doc);
        } else if (doc.department === "sales") {
          salesDocuments.push(doc);
        }
      });

      // Structure the final response
      const response = {
        ...lead.toJSON(),
        orderItems: processedOrderItems,
        documentData: {
          scm: scmDocuments,
          sales: salesDocuments,
        },
      };

      return success(res, "Data fetched successfully.", response);
    } catch (error) {
      console.error(error); // Log the error for debugging
      return serverError(res, "Internal server error.");
    }
  },
  leadList: async (req, res, whereCondition = {}) => {
    try {
      const request = req.query;

      const { search = "", type = "myLead", limit, status = "" } = request;
      const page = request.page ? parseInt(request.page) : 1;
      const pageSize = limit
        ? parseInt(limit)
        : parseInt(process.env.PAGE_LIMIT || 10);
      const offset = (page - 1) * pageSize;

      // Fetch the logged-in user
      const user = await User.findOne({ where: { id: req.decodedData.id } });

      let params = { status };

      // Handling different user types and workspaceId
      if (user.userType === 0) {
        params = {};
        if (request.workspaceId && parseInt(request.workspaceId) > 1) {
          params = {
            ...params,
            [Op.and]: [
              { id: { [Op.ne]: user.id } }, // Exclude the current user
              { workspace_id: request.workspaceId, ...whereCondition },
            ],
          };
        }
      } else {

        if (!request.workspaceId) {
          return validationFail(res, "Workspace ID is required.");
        }
        params = { workspace_id: request.workspaceId, ...whereCondition };
      }
      console.log({ params });
      // Add search filter if search query is present
      if (search) {
        params = {
          ...params,
          [Op.or]: [
            { company_name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { phone: { [Op.like]: `%${search}%` } },
            { name: { [Op.like]: `%${search}%` } },
          ],
        };
      }

      let assignUserParams = {};
      if (type === "myLead") {
        assignUserParams = { assign_to_id: req.decodedData.id };
      }

      // Query leads and associated assigned users
      const { rows: list, count } = await Lead.findAndCountAll({
        where: {
          ...params,
          ...(status ? { status } : {}),
        },
        limit: pageSize,
        offset,
        include: [
          {
            model: AssignUser,
            as: "assignUser",
            required: type === "myLead", // Only include if type is "myLead"
            where: {
              documentable_type: "Lead",
              ...(user.userType > 0 ? { assign_to_id: user.id } : {}),

              // ...(type === "myLead" ? assignUserParams : {}),
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
      const seenIds = new Set();
      const uniqueLeads = [];

      // Loop through the leads and add only unique ones
      for (const lead of list) {
        if (!seenIds.has(lead.id)) {
          seenIds.add(lead.id);
          uniqueLeads.push(lead);
        }
      }
      const newData = {
        data: uniqueLeads,
        count,
      };

      return success(res, USER_CONSTANTS.DATA_FETCHED, newData);
    } catch (error) {
      console.error("Error in leadList:", error); // Improved error logging
      return serverError(res, "Internal server error.");
    }
  },
  updateLead: async (req, res) => {
    try {
      // Validate request body
      const validate = new Validator(req.body, {
        leadId: "required|integer",
        type: "required|in:Lead,Estimate",
        workspaceId: "required",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      const userId = req.decodedData.id;
      const user = await User.findOne({ where: { id: userId } });

      // Fetch the existing lead by ID
      const lead = await Lead.findOne({ where: { id: req.body.leadId } });
      if (!lead) {
        return notFound(res, "Lead not found.");
      }
      // Get the original data for logging changes
      const originalData = lead.toJSON();
      let orderItem = req.body.orderItem;
      // return success(res,  orderItem[0].orderDetails.item_attributes);
      // Prepare the updated lead data
      const updatedLeadData = await createLeadData(
        req.body,
        userId,
        req.body.workspaceId
      );
      // console.log({ updatedLeadData });

      // Update the lead
      // await Lead.update(updatedLeadData, { where: { id: req.body.leadId } });
      await lead.update(updatedLeadData);
      // Log the update activity, including both the original and updated data
      await ActivityLog.create({
        entity_id: req.body.leadId,
        entity_type: "CrmLeads",
        operation_type: "LEAD UPDATE",
        performed_by_id: req.decodedData.id,
        changes: {
          before: originalData,
          after: updatedLeadData,
        },
      });
      // Prepare and update order items
      if (req.body.orderItem) {
        await OrderItem.destroy({ where: { itemable_id: lead.id } }); // Remove existing order items

        const orderData = await updatePrepareOrderData(
          req.body.orderItem,
          lead.id,
          req.body.workspaceId,
          req.body.type
        );

        await OrderItem.bulkCreate(orderData); // Add updated order items
      }
      if (req.body.salesDocument) {
        await Document.destroy({
          where: { documentable_id: lead.id, department: "sales" },
        }); // Remove existing sales documents
        // Update sales documents
        const salesDocumentData = await handleDocuments(
          req.body.salesDocument,
          userId,
          lead.id,
          "sales",
          "Lead",
          req.body.type
        );

        await Document.bulkCreate(salesDocumentData); // Add updated sales documents
      }
      if (req.body.scmDocument) {
        await Document.destroy({
          where: { documentable_id: lead.id, department: "scm" },
        }); // Remove existing SCM documents
        // Update SCM documents
        const scmDocumentData = await handleDocuments(
          req.body.scmDocument,
          userId,
          lead.id,
          "scm",
          "Lead",
          req.body.type
        );

        await Document.bulkCreate(scmDocumentData); // Add updated SCM documents
      }

      // Update MRS Lead data
      const mrsLeadData = await prepareMrsLeadData(req.body, lead.id, userId);
      await MrsLead.update(mrsLeadData, { where: { lead_id: lead.id } });

      return success(res, "Lead updated successfully.", req.body);
    } catch (error) {
      console.error(error); // Log the error for debugging
      return serverError(res, "Internal server error.");
    }
  },
  changeLeadStatus: async (req, res) => {
    try {
      // Validate request body parameters
      const validate = new Validator(req.body, {
        leadId: "required|integer",
        status:
          "required|in:new,open,in-process,unqualified,converted,order-lost,order-received",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      const userId = req.decodedData.id;
      const user = await User.findOne({ where: { id: userId } });

      // Fetch the existing lead by ID
      const lead = await Lead.findOne({ where: { id: req.body.leadId } });
      if (!lead) {
        return failed(res, "Lead not found.");
      }

      // Get the original data for logging changes
      const originalData = lead.toJSON();

      // Update the lead's status
      await lead.update({
        status: req.body.status,
        comment: req.body.comment,
      });

      // Log the update activity, including both the original and updated data
      await ActivityLog.create({
        entity_id: lead.id,
        entity_type: "CrmLeads",
        operation_type: "LEAD STATUS UPDATED",
        performed_by_id: req.decodedData.id,
        comment: req.body.comment,
        changes: {
          before: originalData,
          after: { ...originalData, status: req.body.status },
        },
      });
      const customer = await CrmAllCustomer.findOne({
        where: { id: lead.customer_id },
      });
      const workspace = await Workspace.findOne({
        where: { id: lead.workspace_id },
      });
      const assignedUserid = await AssignUser.findOne({
        where: { documentable_type: "Lead", assignable_id: lead.id },
        attributes: ["assign_to_id"],
      });
      const assignUser = await User.findOne({
        where: { id: assignedUserid.assign_to_id },
      });
      let htmlContent;
      try {
        htmlContent = fs.readFileSync(
          "views/emails/leadStatusChange.ejs",
          "utf-8"
        );
      } catch (err) {
        console.error("Error reading EJS template file:", err);
        return serverError(res, "Failed to read template file");
      }

      const dynamicData = {
        leadNo: lead.id,
        status: req.body.status,
        customerName: customer.name,
        assignByUser: assignUser.name,
        remarks: req.body.comment,
        url: `https://crm.mvikas.in/lead-management/allLead/lead-details/${lead.id}`,
        team: workspace.name,
        legal_name: workspace.legal_name,
        address: workspace.address,
        phone: workspace.phone,
        email: workspace.email,
        banner: workspace.banner_path,
        imageUrl: workspace.logo_path,
      };

      const compiledHtml = ejs.render(htmlContent, dynamicData);

      // Prepare the email entities
      let entities = [];
      entities.push({
        email: assignUser.email,
        ids: assignUser.id,
        subject: "Lead Status Changed in SalesGo",
        html: compiledHtml,
      });
      // console.log({ entities });
      if (entities.length > 0) {
        await sendNotificationEmail(
          entities,
          "salesgo_lead_status_change",
          "user",
          workspace.id
        );
      }
      return success(res, "Lead status updated successfully.");
    } catch (error) {
      console.error(error); // Log the error for debugging
      return serverError(res, "Internal server error.");
    }
  },
  reasonList: async (req, res) => {
    try {
      const reasonList = await Reasons.findAll();
      return success(res, USER_CONSTANTS.DATA_FETCHED, reasonList);
    } catch (error) {
      console.error(error); // Log the error for debugging
      return serverError(res, "Internal server error.");
    }
  },
  leadPdf: async (req, res) => {
    try {
      const requests = req.body;
      console.log({requests})
      // Validate the decrypted request
      const v = new Validator(requests, {
        leadId: "required",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }
      console.log("req.decodedData.id", req.decodedData);
      let workspace = {};
      let user = {};
      if (requests.refrence == "Controller") {
        workspace = await Workspace.findOne({
          where: { userId: requests.userId },
        });
      } else {
        user = await User.findOne({ where: { id: req.decodedData.id } });
        workspace = await Workspace.findOne({
          where: { id: user.workspaceId },
        });
      }

      const lead = await Lead.findOne({
        where: { id: req.body.leadId },
        include: [
          {
            model: OrderItem,
            as: "orderItems",
            where: { itemable_type: "Lead" },
            required: false,
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
                model: CrmMake,
                as: "makeData",
              },
              {
                model: OrderItemVendor,
                as: "orderVendorItem",
                include: [
                  {
                    model: Vendor,
                    as: "vendor",
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
            model: Document,
            as: "documentData",
          },
          {
            model: MrsLead,
            as: "documentDetails",
          },
          {
            model: State,
            as: "stateData",
            attributes: ["name"],
          },
          {
            model: City,
            as: "cityData",
            attributes: ["name"],
          },
          {
            model: State,
            as: "shippingStateData",
            attributes: ["name"],
          },
          {
            model: City,
            as: "shippingCityData",
            attributes: ["name"],
          },
        ],
      });
      // return success(res, lead);
      // Load the template file
      let htmlContent;
      try {
        htmlContent = fs.readFileSync("views/pdf_invoices/lead.ejs", "utf-8");
      } catch (err) {
        console.error("Error reading EJS template file:", err);
        return res
          .status(500)
          .json({ message: "Failed to read template file" });
      }

      // Prepare dynamic data for the EJS template
      const imageUrl =
        workspace && workspace.logo_path ? workspace.logo_path : "";
      const legal_name =
        workspace && workspace.legal_name ? workspace.legal_name : "";
      const email = workspace && workspace.email ? workspace.email : "";
      const phone = workspace && workspace.phone ? workspace.phone : "";
      const craetedUser = await User.findOne({
        where: { id: lead.created_by_id },
      });
      // console.log({ workspace });
      // return 1;
      const city = await City.findOne({ id: lead.city_id });
      const state = await State.findOne({ id: lead.state_id });

      const shippingCity = await City.findOne({ id: lead.shipping_city_id });
      const shippingState = await State.findOne({ id: lead.shipping_state_id });
      let totalOrderValue = 0;
      for (const item of lead.orderItems) {
        const itemTotal =
          item.quantity * item.price * (1 + item.gst_rate / 100);
        totalOrderValue += itemTotal;
      }
      const dynamicData = {
        imageUrl: imageUrl ?? null,
        customer_name: lead.name,
        email: lead.email,
        phone: lead.phone,
        gst_tin: lead.gst_tin,
        company_name: lead.company_name,
        purchase_officer_name: lead.purchase_officer_name,
        purchase_officer_phone: lead.purchase_officer_phone,
        address: lead.address,
        stateName: state.name,
        cityName: city.name,
        pincode: lead.pincode,
        shipping_address: lead.shipping_address,
        shippingCity: shippingCity.name,
        shippingState: shippingState.name,
        shipping_pincode: lead.shipping_pincode,
        lead_source: lead.lead_source,
        orderItems: lead.orderItems,
        totalOrderValue: totalOrderValue,
        workspaceName: legal_name,
        workspaceEmail: email,
        workspacePhone: phone,
        destination_frieght_cost: lead.destination_frieght_cost,
        vehicle_capacity: lead.vehicle_capacity,
        lead_priority: lead.lead_priority,
        sales_remarks: lead.sales_remarks,
        scm_remarks: lead.scm_remarks,
        signature: craetedUser.signature,
        craeteUser: craetedUser.name,
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
        if (requests.refrence == "Controller") {
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
      return serverError(res, "Netwrok error");
    }
  },
};
