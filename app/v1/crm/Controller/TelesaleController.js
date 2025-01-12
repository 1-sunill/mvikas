const { Validator } = require("node-input-validator");
const {
  serverError,
  success,
  validateFail,
  failed,
} = require("../../../helper/response");
const db = require("../../../../models");
const Country = db.CrmCountry;
const State = db.CrmState;
const Cities = db.CrmCity;
const TeleSale = db.CrmTelesale;
const User = db.crmuser;
const Lead = db.CrmLead;
const Workspace = db.crmworkspace;
const Customer = db.CrmAllCustomer;
const ActivityLog = db.CrmActivityLogs;
const AssignUser = db.CrmAssign;
const Order = db.CrmOrder;
const CrmSubdispatch = db.CrmSubdispatch;
const { Op } = require("sequelize");
const {
  USER_CONSTANTS,
  SYSTEM_FAILURE,
  ADMIN_CONSTANTS,
} = require("../../../helper/message");
const fs = require("fs");
const pdf = require("html-pdf-node");
const ejs = require("ejs");
const { uploadPdfToS3 } = require("../../../helper/aws");
let baseUrl = process.env.APP_URL;
const CustomerProfiles = db.CrmAllCustomer;
const { sendmail } = require("../../../helper/mail");
const { sendNotificationEmail } = require("../../../helper/sendSms");
const LeadController = require("./LeadController");

module.exports = {
  //get country
  countryList: async (req, res) => {
    try {
      const list = await Country.findAll({ order: [["name", "ASC"]] });
      return success(res, USER_CONSTANTS.DATA_FETCHED, list);
    } catch (error) {
      console.log({ error });
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  //get state
  stateList: async (req, res) => {
    try {
      const validate = new Validator(req.query, {
        countryId: "required",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const list = await State.findAll({
        where: { country_id: req.query.countryId },
        order: [["name", "ASC"]],
      });
      return success(res, USER_CONSTANTS.DATA_FETCHED, list);
    } catch (error) {
      console.log({ error });
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  //get city
  cityList: async (req, res) => {
    try {
      const validate = new Validator(req.query, {
        countryId: "required",
        stateId: "required",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const list = await Cities.findAll({
        where: {
          state_id: req.query.stateId,
          country_id: req.query.countryId,
        },
        order: [["name", "ASC"]],
      });
      return success(res, USER_CONSTANTS.DATA_FETCHED, list);
    } catch (error) {
      console.log({ error });
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  //add pre lead
  addPreLead: async (req, res) => {
    try {
      // Validate request body
      const validate = new Validator(req.body, {
        customer_id: "required",
        companyName: "required",
        phoneNumber: "required",
        email: "required|email",
        potentialVolume: "required",
        feedback: "required",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      // Destructure the required fields from the request body
      const {
        customer_id,
        companyName,
        phoneNumber,
        email,
        potentialVolume,
        feedback,
        rxil,
        status,
        address,
        countryId,
        stateId,
        cityId,
        pincode,
        type,
        offlineState,
        siteStage,
        workspaceId,
      } = req.body;

      // Get the user who is creating the lead
      const createdBy = await Customer.findOne({
        where: { id: customer_id },
      });
      const user = await User.findOne({ where: { id: req.decodedData.id } });

      // Prepare data to be saved
      const reqData = {
        customer_id,
        created_by_id: req.decodedData.id,
        workspace_id: workspaceId,
        customer_name: createdBy.name,
        phone: phoneNumber,
        company_name: companyName, // Corrected variable name
        potential_volume: potentialVolume,
        feedback: feedback,
        rxil: rxil,
        country_id: countryId,
        state_id: stateId,
        city_id: cityId,
        address: address,
        pincode: pincode,
        status: status,
        offline_sites: offlineState,
        site_stage: siteStage,
        type: type,
        email: email,
      };

      // Create the lead
      const newLead = await TeleSale.create(reqData);
      // Log the creation activity
      await ActivityLog.create({
        entity_id: newLead.id,
        entity_type: "CrmTelesales",
        operation_type: "CREATE",
        performed_by_id: req.decodedData.id,
      });
      const customerData = await CustomerProfiles.findOne({
        where: { id: customer_id },
      });
      let newType = {};
      if (type == 0) {
        newType = "Telesales";
      } else {
        newType = "Field Visit";
      }
      /************* mail send to specific customer  ***************/
      const mailData = {
        to: customerData.email,
        subject: `Confirmation of your ${newType} Acknowledgement`,
      };
      const workspace = await Workspace.findOne({
        where: { id: user.workspaceId },
      });
      // console.log({ workspace });
      let htmlContent;
      try {
        htmlContent = fs.readFileSync(
          "views/emails/preLeadAcknowledge.ejs",
          "utf-8"
        );
      } catch (err) {
        console.error("Error reading EJS template file:", err);
        return res
          .status(500)
          .json({ message: "Failed to read template file" });
      }
      const pdfResponse = await module.exports.preLeadPdf({
        body: {
          preleadId: newLead.id,
          refrence: "Controller",
          userId: user.id,
        },
      });
      const dynamicData = {
        customer_name: customerData.name,
        workspaceLegelName: workspace.legal_name,
        workspaceName: workspace.name,
        attachment: pdfResponse.url,
        address: workspace.address,
        imageUrl: workspace.logo_path,
        banner_path: workspace.banner_path,
        phone: workspace.phone,
        email: workspace.email,
        type: type,
        createdBy: user.name,
        url: `https://crm.mvikas.in/lead-management/pre-lead/details/${newLead.id}`,
      };
      const compiledHtml = ejs.render(htmlContent, dynamicData);
      await sendmail({
        to: mailData.to,
        subject: mailData.subject,
        html: compiledHtml,
        attachments: [
          {
            filename: pdfResponse.url,
            path: pdfResponse.url,
          },
        ],
      });

      /************************* Internal Users Of specific workspace **************************/
      let headhtmlContent;
      try {
        headhtmlContent = fs.readFileSync(
          "views/emails/preleademail.ejs",
          "utf-8"
        );
      } catch (err) {
        console.error("Error reading EJS template file:", err);
        return serverError(res, "Failed to read template file");
      }

      // Dynamic data for EJS template
      const dynamicDataHead = {
        preleadId: newLead.id,
        customer_name: customerData.name,
        workspaceLegelName: workspace.legal_name,
        workspaceName: workspace.name,
        createdBy: user.name,
        team: workspace.name,
        legal_name: workspace.legal_name,
        url: `https://crm.mvikas.in/lead-management/pre-lead/details/${newLead.id}`,
        address: workspace.address,
        imageUrl: workspace.logo_path,
        banner_path: workspace.banner_path,
        phone: workspace.phone,
        email: workspace.email,
        type: type,
      };

      const compiledHtmlHead = ejs.render(headhtmlContent, dynamicDataHead);
      const users = await User.findAll({
        where: { workspaceId: workspace.id },
        attributes: ["email", "id"],
      });
      const emails = users.map((user) => user.email);
      const Ids = users.map((user) => user.id);
      console.log({ Ids });
      let notificationEntities = [];
      // Add finance team email if there are emails available
      if (emails.length > 0) {
        notificationEntities.push({
          email: emails,
          ids: Ids,
          subject: `New ${newType} Created in SalesGo`,
          html: compiledHtmlHead,
          attachments: [
            {
              filename: pdfResponse.url,
              path: pdfResponse.url,
            },
          ],
        });
      }

      if (notificationEntities.length > 0) {
        // console.log({ notificationEntities });
        await sendNotificationEmail(
          notificationEntities,
          "salesgo_telesales_created",
          "user",
          workspace.id
        );
      }

      // Return success response
      return success(res, ADMIN_CONSTANTS.DATA_ADDED, reqData);
    } catch (error) {
      console.log({ error });
      // Return server error response
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  //update pre lead
  updatePreLead: async (req, res) => {
    try {
      // Validate request body
      const validate = new Validator(req.body, {
        id: "required",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      // Destructure the required fields from the request body
      const {
        id,
        customer_id,
        companyName,
        phoneNumber,
        email,
        potentialVolume,
        feedback,
        rxil,
        status,
        address,
        countryId,
        stateId,
        cityId,
        pincode,
        type,
        offlineState,
        siteStage,
        workspaceId,
      } = req.body;

      // Get the user who is updating the lead
      const updatedBy = await Customer.findOne({
        where: { id: customer_id },
      });

      const user = await User.findOne({ where: { id: req.decodedData.id } });

      // Prepare data to be updated
      const updateData = {
        customer_id,
        created_by_id: req.decodedData.id,
        workspace_id: workspaceId,
        customer_name: updatedBy.name,
        phone: phoneNumber,
        company_name: companyName,
        potential_volume: potentialVolume,
        feedback: feedback,
        rxil: rxil,
        country_id: countryId,
        state_id: stateId,
        city_id: cityId,
        address: address,
        pincode: pincode,
        status: status,
        offline_sites: offlineState,
        site_stage: siteStage,
        type: type,
        email: email,
      };

      // Find the existing lead by customer_id
      const existingLead = await TeleSale.findOne({
        where: { id: id },
      });

      if (!existingLead) {
        return failed(res, "Lead not found");
      }
      // Get the original data for logging changes
      const originalData = existingLead.toJSON();
      // Update the existing lead with new data
      await existingLead.update(updateData);
      // Log the update activity, including both the original and updated data
      await ActivityLog.create({
        entity_id: existingLead.id,
        entity_type: "CrmTelesales",
        operation_type: "UPDATE PRE LEAD",
        performed_by_id: req.decodedData.id,
        changes: {
          before: originalData,
          after: updateData,
        },
      });
      // Return success response with the updated data
      return success(res, ADMIN_CONSTANTS.DATA_UPDATED, updateData);
    } catch (error) {
      console.log({ error });
      // Return server error response
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  // List pre lead
  listPreLead: async (req, res, whereCondition = {}) => {
    try {
      const request = req.query;

      // Extract query parameters with defaults
      const search = request.search || "";
      let status = request.status || "";
      const page = parseInt(request.page) || 1;
      const pageSize =
        parseInt(request.limit) || parseInt(process.env.PAGE_LIMIT || 10);
      const offset = (page - 1) * pageSize;

      // Map status to numeric values
      const statusMapping = {
        new: 1,
        pending: 2,
        closed: 3,
      };
      if (statusMapping[status]) {
        status = statusMapping[status];
      }

      // Get the user details
      const user = await User.findOne({ where: { id: req.decodedData.id } });
      if (!user) {
        return failure(res, "User not found", 404);
      }

      // Initialize params for filtering
      let params = { ...whereCondition };

      // Add status condition if provided
      if (status) {
        params = { ...params, status };
      }

      // Apply workspace-specific conditions based on user type
      if (user.userType === 0) {
        if (request.workspaceId > 1) {
          params = {
            ...params,
            [Op.and]: [
              { id: { [Op.ne]: user.id } },
              { workspace_id: request.workspaceId },
            ],
          };
        }
      } else {
        params = { workspace_id: request.workspaceId, ...whereCondition };
      }

      // Add search filters if provided
      if (search) {
        params = {
          [Op.and]: [
            { workspace_id: user.workspaceId },
            {
              [Op.or]: [
                { company_name: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { phone: { [Op.like]: `%${search}%` } },
                { customer_name: { [Op.like]: `%${search}%` } },
              ],
            },
          ],
        };
      }

      console.log({ params });

      // Fetch data with filtering, pagination, and associations
      const { rows: list, count } = await TeleSale.findAndCountAll({
        where: params,
        include: [
          {
            model: AssignUser,
            as: "assignData",
            where: { documentable_type: "Telesales" },
            required: false,
          },
        ],
        order: [["id", "desc"]],
        limit: pageSize,
        offset,
      });

      // Prepare the response
      const newData = {
        data: list,
        count,
        currentPage: page,
        totalPages: Math.ceil(count / pageSize),
      };

      return success(res, USER_CONSTANTS.DATA_FETCHED, newData);
    } catch (error) {
      console.error("Error in listPreLead:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },

  //get leads
  getPreLeads: async (req, res) => {
    try {
      // Validate request body
      const validate = new Validator(req.query, {
        id: "required",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const data = await TeleSale.findOne({
        include: [
          {
            model: Country,
            as: "country",
            attributes: ["name"],
          },
          {
            model: Cities,
            as: "city",
            attributes: ["name"],
          },
          {
            model: State,
            as: "state",
            attributes: ["name"],
          },
        ],
        where: { id: req.query.id },
      });
      return success(res, USER_CONSTANTS.DATA_FETCHED, data);
    } catch (error) {
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  //history
  getHistory: async (req, res) => {
    try {
      // Validate request body
      const validate = new Validator(req.query, {
        entityId: "required",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      const data = await ActivityLog.findAll({
        where: {
          performed_by_id: req.decodedData.id,
          entity_id: req.query.entityId,
        },
        include: [
          {
            model: User,
            as: "userDetails",
            attributes: ["name"],
          },
          // {
          //   model: AssignUser,
          //   as: "assignTo",
          //   required: false,
          //   where: { documentable_type: "Lead" },
          //   include: [
          //     {
          //       model: User,
          //       as: "user",
          //       attributes: ["name"],
          //     },
          //   ],
          // },
        ],
        attributes: [
          "id",
          "entity_id",
          "entity_type",
          "operation_type",
          "performed_by_id",
          "createdAt",
          // "changes",
          "comment",
        ],
        order: [["id", "desc"]],
      });

      return success(res, USER_CONSTANTS.DATA_FETCHED, data);
    } catch (error) {
      console.log({ error });
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  //assign user
  assignUser: async (req, res) => {
    try {
      // Validate request body
      const validate = new Validator(req.body, {
        assigniId: "required|integer",
        assignableId: "required|integer",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      const { assigniId, assign_reason_id, comment, assignableId, type } =
        req.body;
      // console.log("req.body",req.body);
      // return 1
      // Prepare the data for creating or updating the assignment
      const reqData = {
        assign_by_id: req.decodedData.id,
        assign_to_id: parseInt(assigniId),
        comment,
        assign_reason_id,
        assignable_id: assignableId,
        documentable_type: type,
      };

      // Check if an assignment already exists
      const existingAssignment = await AssignUser.findOne({
        where: { assignable_id: assignableId },
      });

      if (existingAssignment) {
        // Get the original data for logging changes
        const originalData = existingAssignment.toJSON();
        //Telesales
        // Adjust the type if necessary
        const entityType = type === "Telesales" ? "CrmTelesales" : type;

        // Log the update activity, including both the original and updated data
        await ActivityLog.create({
          entity_id: assignableId,
          entity_type: entityType, // Use the adjusted type here
          operation_type: "ASSIGNED",
          performed_by_id: req.decodedData.id,
          comment: comment,
          changes: {
            before: originalData,
            after: reqData,
          },
        });

        // If an assignment exists, delete it before creating a new one
        await AssignUser.destroy({ where: { id: existingAssignment.id } });
      } else {
        console.log("No existing assignment found, creating a new one.");
      }

      // Create a new assignment
      const createdAssignment = await AssignUser.create(reqData);

      console.log("Assignment created:", createdAssignment);
      const assigntoUser = await User.findOne({ where: { id: assigniId } });
      const assignByUser = await User.findOne({
        where: { id: req.decodedData.id },
      });
      let data = {};
      let customer = {};
      let workspace = {};
      let pdfResponse = {};
      let subject = {};
      let htmlContent;
      switch (type) {
        case "Telesales":
          subject =
            data.type === 0 ? "Telesale Assigned" : "Field Visit Assigned";
          data = await TeleSale.findOne({ where: { id: assignableId } });
          pdfResponse = await module.exports.preLeadPdf({
            body: {
              preleadId: data.id,
              refrence: "Controller",
              userId: assignableId,
            },
          });

          try {
            htmlContent = fs.readFileSync(
              "views/emails/telesalesAssign.ejs",
              "utf-8"
            );
          } catch (err) {
            console.error("Error reading EJS template file:", err);
            return serverError(res, "Failed to read template file");
          }
          break;
        case "Lead":
          data = await Lead.findOne({ where: { id: assignableId } });
          subject = `Lead ${data.id} Assigned in SalesGo`;
          pdfResponse = await LeadController.leadPdf({
            body: {
              leadId: data.id,
              refrence: "Controller",
              userId: assignableId,
            },
          });
          try {
            htmlContent = fs.readFileSync(
              "views/emails/leadAssign.ejs",
              "utf-8"
            );
          } catch (err) {
            console.error("Error reading EJS template file:", err);
            return serverError(res, "Failed to read template file");
          }
          break;
        case "CrmDispatch":
          htmlContent = ""
          const subdispatch = await CrmSubdispatch.findOne({
            where: { id: assignableId },
          });
          data = await Order.findOne({ where: { id: subdispatch.orderId } });
          break;
      }

      if (data) {
        customer = await Customer.findOne({
          where: { id: data.customer_id || data.customerId },
        });
        workspace = await Workspace.findOne({
          where: { id: data.workspace_id || data.workspaceId },
        });
      }

      // console.log({ comment });
      // return 1;

      const dynamicData = {
        assignUserName: assigntoUser.name,
        leadNo: assignableId,
        customerName: customer.name,
        assignByUser: assignByUser.name,
        url: `https://crm.mvikas.in/lead-management/pre-lead/details/${assignableId}`,
        team: workspace.name,
        legal_name: workspace.legal_name,
        phone: workspace.phone,
        email: workspace.email,
        banner: workspace.banner_path,
        imageUrl: workspace.logo_path,
        remarks: comment || "",        
        workspaceName: workspace.name,
        address: workspace.address,
        phone: workspace.phone,
        email: workspace.email,
      };
      const compiledHtml = ejs.render(htmlContent, dynamicData);

      // Prepare the email entities
      let entities = [];
      entities.push({
        email: assigntoUser.email,
        ids: assigntoUser.id,
        subject: subject,
        html: compiledHtml,
        attachments: [
          {
            filename: pdfResponse.url || "",
            path: pdfResponse.url || "",
          },
        ],
      });
      if (entities.length > 0) {
        if (type == "Telesales") {
          await sendNotificationEmail(
            entities,
            "salesgo_telesales_asssigned",
            "user",
            workspace.id
          );
        } else if (type == "Lead") {
          await sendNotificationEmail(
            entities,
            "salesgo_lead_assigned",
            "user",
            workspace.id
          );
        }
      }
      return success(res, "Data saved successfully.", reqData);
    } catch (error) {
      console.error("Error in assignUser:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  preLeadPdf: async (req, res) => {
    try {
      const requests = req.body;

      // Validate the decrypted request
      const v = new Validator(requests, {
        preleadId: "required",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }
      let workspace = {};
      let user = {};
      if (req.body.refrence == "Controller") {
        console.log("++++++++++++++++++++++++++");
        workspace = await Workspace.findOne({
          where: { userId: req.body.userId },
        });
      } else {
        console.log("===========================", req.decodedData.id);
        user = await User.findOne({ where: { id: req.decodedData.id } });
        workspace = await Workspace.findOne({
          where: { id: user.workspaceId },
        });
      }

      const prelead = await TeleSale.findOne({
        where: { id: requests.preleadId },
      });
      // return success(res, workspace);
      if (!prelead) {
        return failed(res, "Pre lead not found.");
      }

      // Load the template file
      let htmlContent;
      try {
        htmlContent = fs.readFileSync(
          "views/pdf_invoices/preLead.ejs",
          "utf-8"
        );
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
        where: { id: prelead.created_by_id },
      });
      const city = await Cities.findOne({ where: { id: prelead.city_id } });
      const state = await State.findOne({ where: { id: prelead.state_id } });

      const country = await Country.findOne({
        where: { id: prelead.country_id },
      });

      const dynamicData = {
        imageUrl: imageUrl ?? null,
        customer_name: prelead.customer_name,
        email: prelead.email,
        phone: prelead.phone,
        company_name: prelead.company_name,
        potential_volume: prelead.potential_volume,
        office_address: prelead.address,
        rxil: prelead.rxil,
        status: prelead.status,
        feedback: prelead.feedback,
        countryName: country.name,
        stateName: state.name,
        cityName: city.name,
        officeSiteName: prelead.offline_sites,
        site_stage: prelead.site_stage,
        createdAt: prelead.createdAt,
        workspaceName: legal_name,
        workspaceEmail: email,
        workspacePhone: phone,
        signature: craetedUser.signature,
        craeteUser: craetedUser.name,
      };
      // console.log({ dynamicData });
      // return 1;
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
        if (req.body.refrence == "Controller") 
        {
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
      return serverError(res, "Newtwork error");
    }
  },
};
