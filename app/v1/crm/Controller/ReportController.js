const { Validator } = require("node-input-validator");
const { SYSTEM_FAILURE } = require("../../../helper/message");
const {
  serverError,
  validateFail,
  success,
  failed,
} = require("../../../helper/response");
const db = require("../../../../models");

const LeadController = require("./LeadController");
const EstimateController = require("./EstimateController");
const OrderController = require("./OrderController");
const UserController = require("./UserController");
const MasterController = require("./MasterController");
const ItemSpecificationController = require("./ItemSpecificationController");
const ProductController = require("./ProductController");
const TelesaleController = require("./TelesaleController");
const NotificationController = require("./NotificationController");

const NotificationType = db.CrmNotificationType;
const Customer = db.CrmAllCustomer;
const CrmNotifiables = db.CrmNotifiables;
const User = db.crmuser;
const Transporter = db.CrmTransport;
const Notification = db.CrmNotification;
const Lead = db.CrmLead;
const Workspace = db.crmworkspace;
const Estimate = db.CrmEstimate;
const Order = db.CrmOrder;
const TeleSale = db.CrmTelesale;
const Vendor = db.CrmAllCustomer;
const moment = require("moment");
const { Op, fn, col } = require("sequelize");
const {
  mail,
  scheduleReportNotification,
  sendBulkEmailToEntities,
} = require("../../../helper/mail");

module.exports = {

  reportList: async (req, res) => {
    try {
      const validate = new Validator(req.query, {
        reportType: "required",
        workspaceId: "required",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate); // Send error response if validation fails
      }

      const request = req.query;
      const { startDate, endDate } = req.query;

      let whereCondition = {};

      // Apply date filtering if startDate or endDate is provided
      if (startDate || endDate) {
        whereCondition[Op.and] = [];

        // Handle startDate filter (convert to Date object)
        if (startDate && startDate !== "null") {
          const start = new Date(startDate); // Convert to Date object
          if (!isNaN(start.getTime())) {
            // Check if it's a valid date
            // Compare only the date part
            whereCondition[Op.and].push({
              createdAt: {
                [Op.gte]: fn("DATE", col("createdAt")), // Compare by date
                [Op.gte]: start,
              },
            });
          } else {
            return failed(res, "Invalid startDate format.");
          }
        }

        // Handle endDate filter (convert to Date object)
        if (endDate && endDate !== "null") {
          const end = new Date(endDate);
          if (!isNaN(end.getTime())) {
            // Set time to 23:59:59 to include the entire endDate
            end.setHours(23, 59, 59, 999); // Set the end time to the end of the day
            whereCondition[Op.and].push({
              createdAt: {
                [Op.lte]: fn("DATE", col("createdAt")), // Compare by date
                [Op.lte]: end,
              },
            });
          } else {
            return failed(res, "Invalid endDate format.");
          }
        }
      }
      console.log("+++++++++", whereCondition.createdAt);
      let list = null;

      // Depending on the reportType, get the list from the appropriate controller
      switch (request.reportType) {
        case "lead":
          list = await LeadController.leadList(req, res, whereCondition);
          break;
        case "estimates":
          list = await EstimateController.listEstimate(
            req,
            res,
            whereCondition
          );
          break;
        case "orders":
          list = await OrderController.listOrder(req, res, whereCondition);
          break;
        case "users":
          list = await UserController.listUsers(req, res, whereCondition);
          break;
        case "customers":
          if (!request.type) {
            return failed(res, "Type is required.");
          }
          list = await MasterController.listCustomer(req, res, whereCondition);
          break;
        case "vendor":
          if (!request.type) {
            return failed(res, "Type is required.");
          }
          list = await MasterController.listCustomer(req, res, whereCondition);
          break;
        case "transporters":
          list = await MasterController.listTransport(req, res, whereCondition);
          break;
        case "categories":
          list = await ItemSpecificationController.categoryList(
            req,
            res,
            whereCondition
          );
          break;
        case "unitType":
          list = await ItemSpecificationController.unitList(
            req,
            res,
            whereCondition
          );
          break;
        case "attributes":
          list = await ItemSpecificationController.attributeList(
            req,
            res,
            whereCondition
          );
          break;
        case "make":
          list = await ItemSpecificationController.brandList(
            req,
            res,
            whereCondition
          );
          break;
        case "products":
          list = await ProductController.productList(req, res, whereCondition);
          break;
        case "telesales":
          list = await TelesaleController.listPreLead(req, res, whereCondition);
          break;
        case "paymentTerm":
          list = await MasterController.listPaymentTerm(
            req,
            res,
            whereCondition
          );
          break;
        case "notification_types":
          list = await NotificationType.findAll();
          break;
        default:
          return failed(res, "Invalid report type.");
      }
      // return list;
      // Send the successful response only once after the data is retrieved
        return success(res, "Data fetched successfully.", list);
    } catch (error) {
      console.error(error);
      return serverError(res, SYSTEM_FAILURE); // Handle server error
    }
  },
  sendScheduleReportEmail: async (req, res) => {
    try {
      // Validate the required query parameters
      const validate = new Validator(req.body, {
        notifiable_type: "required",
        workspaceId: "required",
        notification_type: "required|in:schedule,normal",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate); // Send error response if validation fails
      }

      // Destructure validated query parameters
      const {
        userType,
        workspaceId,
        notification_type,
        notifiable_type,
        scheduleDateTime,
        email,
      } = req.body;

      // Determine the model and type condition based on notifiable_type
      let Model;
      let whereCondition = {};

      switch (notifiable_type) {
        case "customers":
          Model = Customer;
          whereCondition = { type: 1, workspaceId: workspaceId }; // type=1 for customer
          break;
        case "vendor":
          Model = Vendor;
          whereCondition = { type: 2, workspaceId: workspaceId }; // type=2 for vendor
          break;
        case "users":
          Model = User;
          whereCondition = { workspaceId: workspaceId };
          break;
        case "transporters":
          Model = Transporter;
          whereCondition = { workspaceId: workspaceId };
          break;
        case "lead":
          Model = Lead;
          whereCondition = { workspace_id: workspaceId };
          break;
        case "orders":
          Model = Order;
          whereCondition = { workspaceId: workspaceId };
          break;
        case "telesales":
          Model = TeleSale;
          whereCondition = { workspace_id: workspaceId };
          break;
        default:
          return failed(res, "This is not eligible for the email.");
      }

      // Fetch entities based on the determined model and conditions
      const entities = await Model.findAll({
        where: {
          ...whereCondition,
        },
      });

      if (!entities || entities.length === 0) {
        return failed(res, `No entities found for ${notifiable_type}.`);
      }

      // Prepare email data
      let mailData = {};
      if (email) {
        mailData.to = email.split(",").map((e) => e.trim()); // Trim spaces in email addresses
      }

      // Prepare the notification data
      const newData = {
        workspace_id: workspaceId,
        type: "report",
        title: "Report email",
        description: "Test report data",
        scheduleDate: scheduleDateTime || null,
        usersCount: mailData.to ? mailData.to.length : entities.length,
        notifiable_type: notifiable_type,
      };

      await Notification.create(newData);

      // Calculate the send datetime if scheduleDateTime is provided
      let sendDatetime = null;
      if (notification_type === "schedule") {
        if (!scheduleDateTime) {
          return failed(
            res,
            "scheduleDateTime is required for scheduled notifications."
          );
        }
        sendDatetime = moment(scheduleDateTime)
          .add(5, "hours")
          .add(30, "minutes");
      }

      // Filter entities where isStatus is 1
      const entitiesWithStatusTrue = entities;

      // If no entities with status true, return failure
      if (entitiesWithStatusTrue.length === 0) {
        return failed(
          res,
          `No valid recipients with status true for ${notifiable_type}.`
        );
      }

      // console.log("Valid recipients:", entitiesWithStatusTrue);

      // Chunk the array if more than 50 entities
      const chunkSize = 50;
      const chunkedEntities = [];
      for (let i = 0; i < entitiesWithStatusTrue.length; i += chunkSize) {
        chunkedEntities.push(entitiesWithStatusTrue.slice(i, i + chunkSize));
      }
      // return success(res,chunkedEntities);
      let mailResponse;

      if (notification_type === "normal") {
        // Send emails immediately in chunks
        for (const chunk of chunkedEntities) {
          mailResponse = await sendBulkEmailToEntities(chunk, newData);
        }
      } else if (notification_type === "schedule") {
        // Check if mailData.to exists and contains valid recipients
        if (!mailData.to || mailData.to.length === 0) {
          return failed(res, "No email addresses provided for scheduling.");
        }

        // Schedule the emails in chunks
        for (const chunk of chunkedEntities) {
          mailResponse = await scheduleReportNotification(
            chunk,
            newData,
            sendDatetime.toDate()
          );
        }
      }

      // Check if the email operation was successful
      return success(res, "Emails processed successfully in chunks!");
    } catch (error) {
      console.error("Error in sendScheduleReportEmail:", error);
      return serverError(res, "Internal server error.");
    }
  },
  
};
