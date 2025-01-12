const {
  SYSTEM_FAILUmomentRE,
  SYSTEM_FAILURE,
} = require("../../../helper/message");
const {
  serverError,
  success,
  validateFail,
  failed,
} = require("../../../helper/response");
const db = require("../../../../models");
const { Sequelize, sequelize } = require("../../../../models");
const { Validator } = require("node-input-validator");
const { Op } = require("sequelize");
const {
  sendBulkEmailToEntities,
  scheduleNotification,
} = require("../../../helper/mail");
const NotificationType = db.CrmNotificationType;
const Customer = db.CrmAllCustomer;
const User = db.crmuser;
const Transporter = db.CrmTransport;
const CrmNotifiables = db.CrmNotifiables;
const Notification = db.CrmNotification;
const Workspace = db.crmworkspace;

const moment = require("moment");
const { Not } = require("typeorm");

module.exports = {
  notificationType: async (req, res) => {
    try {
      const list = await NotificationType.findAll();
      return success(res, "Data fetched successfully.", list);
    } catch (error) {
      console.error("Error fetching notification types:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  updateStatus: async (req, res) => {
    try {
      const validate = new Validator(req.body, {
        id: "required",
      });

      const matched = await validate.check();

      if (!matched) {
        return validateFail(res, validate);
      }

      const notification = await NotificationType.findByPk(req.body.id);

      if (!notification) {
        return failed(res, "Notification type not found.");
      }

      notification.status = notification.status === 0 ? 1 : 0;
      await notification.save();

      return success(res, "Status updated successfully.", notification);
    } catch (error) {
      console.log({ error });
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  notificationUserList: async (req, res) => {
    try {
      const request = req.query;

      const validate = new Validator(request, {
        workspaceId: "required",
        userType: "required|in:customer,user,vendor,transporter",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      // Determine the model and type condition based on userType
      let Model;
      let typeCondition = {};

      switch (request.userType) {
        case "customer":
          Model = Customer;
          typeCondition = { type: 1 }; // type=1 for customer
          break;
        case "vendor":
          Model = Customer;
          typeCondition = { type: 2 }; // type=2 for vendor
          break;
        case "user":
          Model = User;
          break;
        case "transporter":
          Model = Transporter;
          break;
        default:
          return failed(res, "Invalid userType provided.");
      }
      // Prepare the search filter
      let searchCondition = {};
      if (request.search) {
        // Search by name
        if (request.userType === "customer" || request.userType === "vendor") {
          searchCondition = { name: { [Op.like]: `%${request.search}%` } }; // Assuming name field exists
        } else if (request.userType === "user") {
          searchCondition = { name: { [Op.like]: `%${request.search}%` } }; // Assuming username field for User
        } else if (request.userType === "transporter") {
          searchCondition = { name: { [Op.like]: `%${request.search}%` } }; // Assuming name field exists for Transporter
        }
      }
      // Fetch CRM Notifiables as an array of notifiable IDs
      const crmNotifiableIds = await CrmNotifiables.findAll({
        where: {
          workspace_id: request.workspaceId,
          notifiable_type: request.userType,
        },
        attributes: ["notifiable_id"],
        raw: true,
      }).then((results) => results.map((result) => result.notifiable_id));

      let isStatusLiteral;

      if (crmNotifiableIds.length > 0) {
        // If crmNotifiableIds is not empty, use the IDs in the literal
        isStatusLiteral = Sequelize.literal(
          `CASE WHEN id IN (${crmNotifiableIds.join(
            ","
          )}) THEN true ELSE false END`
        );
      } else {
        isStatusLiteral = Sequelize.literal("false");
      }

      // Fetch records with the custom 'isStatus' field
      const entities = await Model.findAll({
        where: {
          workspaceId: request.workspaceId,
          ...typeCondition,
          ...searchCondition,
        },
        attributes: {
          include: [[isStatusLiteral, "isStatus"]],
        },
      });
      
      const data = {
        entities: entities,
        count: entities.length,
      };
      // Return the modified entity list
      return success(res, "Data fetched successfully.", data);
    } catch (error) {
      console.error("Error fetching notification user list:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  updateNotifiableList: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const request = req.body;
      const validate = new Validator(request, {
        workspaceId: "required",
        userType: "required|in:customer,user,vendor,transporter",
        notification_type_id: "required",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      const users = request.usersIds;
      let requestData;
      let usersDataArray = [];

      requestData = Array.isArray(users) ? users : JSON.parse(users);

      // Delete existing records for the given workspaceId, userType, and usersIds
      await CrmNotifiables.destroy({
        where: {
          workspace_id: request.workspaceId,
          notifiable_type: request.userType,
          notification_type_id: request.notification_type_id,
        },
        transaction,
      });

      // Prepare new data entries
      for (let i = 0; i < requestData.length; i++) {
        const element = requestData[i];

        const newData = {
          workspace_id: request.workspaceId,
          notification_type_id: request.notification_type_id,
          notifiable_type: request.userType,
          notifiable_id: element,
        };

        usersDataArray.push(newData);
      }

      // Bulk insert new data
      await CrmNotifiables.bulkCreate(usersDataArray, { transaction });

      await transaction.commit();

      return success(res, "Notifiable list updated successfully.");
    } catch (error) {
      await transaction.rollback();
      console.error("Error updating notifiable list:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  sendUserTypeEmail: async (req, res) => {
    try {
      const request = req.body;
      // Validate the request
      const validate = new Validator(request, {
        workspaceId: "required",
        userType: "required|in:customer,user,vendor,transporter",
        // notificationType: "require|in:normal,schedule",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      // Determine the model and type condition based on userType
      let Model;
      let typeCondition = {};

      switch (request.userType) {
        case "customer":
          Model = Customer;
          typeCondition = { type: 1 }; // type=1 for customer
          break;
        case "vendor":
          Model = Customer;
          typeCondition = { type: 2 }; // type=2 for vendor
          break;
        case "user":
          Model = User;
          break;
        case "transporter":
          Model = Transporter;
          break;
        default:
          return failed(res, "Invalid userType provided.");
      }

      // Fetch CRM Notifiables as an array of notifiable IDs
      const crmNotifiableIds = await CrmNotifiables.findAll({
        where: {
          workspace_id: request.workspaceId,
          notifiable_type: request.userType,
        },
        attributes: ["notifiable_id"],
        raw: true,
      }).then((results) => results.map((result) => result.notifiable_id));

      let isStatusLiteral;

      if (crmNotifiableIds.length > 0) {
        // If crmNotifiableIds is not empty, use the IDs in the literal
        isStatusLiteral = Sequelize.literal(
          `CASE WHEN id IN (${crmNotifiableIds.join(
            ","
          )}) THEN true ELSE false END`
        );
      } else {
        isStatusLiteral = Sequelize.literal("false");
      }

      // Fetch records with the custom 'isStatus' field
      const entities = await Model.findAll({
        where: {
          workspaceId: request.workspaceId,
          ...typeCondition,
        },
        attributes: {
          include: [[isStatusLiteral, "isStatus"]],
        },
      });
      // return success(res, entities);
      // console.log({ entities });
      // Filter out entities where 'isStatus' is true
      const entitiesWithStatusTrue = entities.filter(
        (entity) => entity.dataValues.isStatus === 1
      );
      const newData = {
        workspace_id: request.workspaceId,
        type: request.userType,
        title: request.title,
        description: request.description,
        scheduleDate: request.scheduleDateTime || null,
        usersCount: entities.length,
      };
      // return success(res,entitiesWithStatusTrue);
      // If there are users with isStatus: true, send emails
      if (entitiesWithStatusTrue.length > 0) {
        if (request.notificationType == "normal") {
          await sendBulkEmailToEntities(entitiesWithStatusTrue, newData);
        } else if (request.notificationType == "schedule") {
          let sendDatetime = moment(request.scheduleDateTime);
          sendDatetime = sendDatetime.add(5, "hours").add(30, "minutes");

          await scheduleNotification(
            entitiesWithStatusTrue,
            newData,
            sendDatetime.toDate()
          );
        }
        await Notification.create(newData);

        return success(res, "Emails sent successfully.");
      } else {
        return success(res, "No users found with isStatus: true.");
      }
    } catch (error) {
      console.error("Error sending emails:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  notificationList: async (req, res) => {
    try {
      const request = req.query;

      // Validate the request
      const validate = new Validator(request, {
        workspaceId: "required",
        notificationType: "required|in:normal,schedule",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const page = request.page ? parseInt(request.page) : 1;
      const pageSize = request.limit ? request.limit : process.env.PAGE_LIMIT;
      const offset = (page - 1) * pageSize;
      const { startDate, endDate } = request;

      let whereCondition = {};

      // Apply date filtering if startDate or endDate is provided
      if (startDate || endDate) {
        whereCondition[Op.and] = [];

        // Handle startDate filter
        if (startDate && startDate !== "null") {
          const start = new Date(startDate);
          if (!isNaN(start.getTime())) {
            whereCondition[Op.and].push({
              createdAt: {
                [Op.gte]: start, // Apply start date filter
              },
            });
          } else {
            return failed(res, "Invalid startDate format.");
          }
        }

        // Handle endDate filter
        if (endDate && endDate !== "null") {
          const end = new Date(endDate);
          if (!isNaN(end.getTime())) {
            end.setHours(23, 59, 59, 999);
            whereCondition[Op.and].push({
              createdAt: {
                [Op.lte]: end,
              },
            });
          } else {
            return failed(res, "Invalid endDate format.");
          }
        }
      }

      const currentDate = new Date();
      let list;

      // Fetch notifications based on notificationType
      if (request.notificationType === "schedule") {
        list = await Notification.findAll({
          where: {
            workspace_id: request.workspaceId,
            scheduleDate: {
              [Op.gt]: currentDate,
            },
            ...whereCondition,
          },
          include: [
            {
              model: Workspace,
              as: "workspaceData",
              attributes: ["name"],
            },
          ],
          order: [["id", "DESC"]],
          limit: parseInt(pageSize),
          offset: offset,
        });
      } else {
        list = await Notification.findAll({
          where: {
            workspace_id: request.workspaceId,
            [Op.or]: [
              { scheduleDate: { [Op.lt]: currentDate } },
              { scheduleDate: null },
            ],
            ...whereCondition,
          },
          include: [
            {
              model: Workspace,
              as: "workspaceData",
              attributes: ["name"],
            },
          ],
          order: [["id", "DESC"]],
          limit: parseInt(pageSize),
          offset: offset,
        });
      }
      const newData = {
        list,
        count: list.length,
      };
      return success(res, "Data fetched successfully", newData);
    } catch (error) {
      console.error("Error fetching notification list:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
};
