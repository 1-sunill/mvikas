const { Validator } = require("node-input-validator");
const {
  serverError,
  validateFail,
  success,
  failed,
} = require("../../../helper/response");
const { Op, where } = require("sequelize");
const db = require("../../../../models");
const User = db.crmuser;
const Workspace = db.crmworkspace;
const Role = db.Role;
const CrmNotifiables = db.CrmNotifiables;
const NotificationType = db.CrmNotificationType;

const { USER_CONSTANTS } = require("../../../helper/message");
const { sendmail } = require("../../../helper/mail");
const fs = require("fs");
const ejs = require("ejs");

module.exports = {
  listUsers: async (req, res, whereCondition = {}) => {
    try {
      const request = req.query;
      // const validate = new Validator(request, {
      //   workspaceId: "required",
      // });

      // const matched = await validate.check();
      // if (!matched) {
      //   return validateFail(res, validate);
      // }
      const search = request.search ? request.search : "";
      const page = request.page ? parseInt(request.page) : 1;
      const pageSize = request.limit ? request.limit : process.env.PAGE_LIMIT;
      const offset = (page - 1) * pageSize;
      const user = await User.findOne({ id: req.decodedData.id });
      if (!user) {
        return failed(res, "Users not found.");
      }
      let params = { id: { [Op.ne]: user.id } };

      if (user.userType === 0) {
        if (request.workspaceId > 1) {
          // console.log({ user });

          params = {
            ...params,
            [Op.and]: [
              { id: { [Op.ne]: user.id } },
              { workspaceId: request.workspaceId, ...whereCondition },
            ],
          };
        }
      } else {
        params = {
          ...params,
          workspaceId: request.workspaceId,
          id: { [Op.ne]: user.id },
          ...whereCondition,
        };
      }
      console.log({ params });
      if (search) {
        params = {
          ...params,
          [Op.or]: [
            {
              name: {
                [Op.like]: `%${search}%`,
              },
            },
          ],
        };
      }
      let list;
      let totalCount;
      if (req.query.type == 1) {
        if (user.userType == 0) {
          list = await User.findAll({
            where: {
              // workspaceId: request.workspaceId,
              status: 1,
              // userType: 1,
              // id: { [Op.ne]: user.id },
            },
            order: [["id", "DESC"]],
          });
        } else {
          list = await User.findAll({
            where: {
              workspaceId: request.workspaceId,
              status: 1,
              // id: { [Op.ne]: user.id },
            },
            order: [["id", "DESC"]],
          });
        }

        totalCount = await User.count({
          where: {
            workspaceId: request.workspaceId,
            status: 1,
            id: { [Op.ne]: user.id },
          },
        });
      } else {
        list = await User.findAll({
          where: params,
          order: [["id", "DESC"]],
          limit: parseInt(pageSize),
          offset: offset,
        });
        totalCount = await User.count({ where: params });
      }

      return success(res, USER_CONSTANTS.DATA_FETCHED, {
        list,
        totalCount,
      });
    } catch (error) {
      console.log({ error });
      return serverError(res, "Internal server error");
    }
  },
  workspaceList: async (req, res) => {
    try {
      const list = await Workspace.findAll({
        where: {
          id: {
            [Op.gt]: 0,
          },
          status: 1,
        },
        // order: [["id", "DESC"]],
      });

      return success(res, "Success", list);
    } catch (error) {
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  addUser: async (req, res) => {
    try {
      const validate = new Validator(req.body, {
        name: "required",
        email: "required|email",
        contact_number: "required",
        password: "required",
        confirmPassword: "required|same:password",
        department: "required|in:sales,scm,finance",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const request = req.body;

      const { name, email, contact_number, password, department, socialId } =
        req.body;
      let { workspaceId, roleId } = req.body;

      workspaceId = parseInt(workspaceId) ? parseInt(workspaceId) : 0;
      roleId = parseInt(roleId) ? parseInt(roleId) : 0;
      // console.log({ workspaceId }); return 1;
      //Check user
      const userCheckemail = await User.findOne({
        where: { email: email, workspaceId: workspaceId },
      });
      if (userCheckemail) {
        return failed(res, "User email already exist.");
      }

      const userCheckMobile = await User.findOne({
        where: { contact_number: contact_number, workspaceId: workspaceId },
      });
      if (userCheckMobile) {
        return failed(res, "User mobile already exist.");
      }

      const checkRole = await Role.findOne({ where: { id: roleId } });
      if (!checkRole) {
        return failed(res, "Role not found.");
      }
      const user = await User.findOne({ where: { id: req.decodedData.id } });
      let checkWorkSpace;
      if (workspaceId > 0) {
        checkWorkSpace = await Workspace.findOne({
          where: { id: workspaceId },
        });
        if (!checkWorkSpace) {
          return failed(res, "Workspace not found.");
        }
      } else {
        checkWorkSpace = await Workspace.findOne({
          where: { id: user.workspaceId },
        });
      }
      // console.log({ user });
      // return 1;
      const reqData = {
        name,
        email,
        contact_number,
        password,
        roleName: checkRole && checkRole.name ? checkRole.name : "",
        workspace:
          checkWorkSpace && checkWorkSpace.name ? checkWorkSpace.name : "",
        workspaceId: workspaceId || user.workspaceId,
        roleId: roleId || 0,
        createdBy: req.decodedData.id,
        department,
        socialId,
      };

      //Add new user
      const userData = await User.create(reqData);
      if (workspaceId) {
        await Workspace.update(
          { userId: userData.id },
          { where: { id: reqData.workspaceId } }
        );
      }
      const mailData = {
        to: email,
        subject: "Welcome to new user",
        text: "Please find your attatchments.",
      };

      let htmlContent;
      try {
        htmlContent = fs.readFileSync("views/emails/userCreation.ejs", "utf-8");
      } catch (err) {
        console.error("Error reading EJS template file:", err);
        return res
          .status(500)
          .json({ message: "Failed to read template file" });
      }
      const workspace = await Workspace.findOne({
        where: { id: user.workspaceId },
      });
      const dynamicData = {
        customer_name: name,
        email: email,
        password: password,
        workspaceName: workspace.name ? workspace.name : "M-vikas",
      };
      const compiledHtml = ejs.render(htmlContent, dynamicData);

      //Send email to user
      await sendmail({
        to: mailData.to,
        subject: mailData.subject,
        html: compiledHtml,
      });

      // Add in notifables
      const notificationTypes = await NotificationType.findAll();

      if (notificationTypes.length > 0) {
        // Prepare bulk insert data
        const notifiableData = notificationTypes.map((element) => ({
          workspace_id: workspaceId,
          notification_type_id: element.id,
          notifiable_type: "user",
          notifiable_id: userData.id,
        }));

        // Bulk insert the data
        await CrmNotifiables.bulkCreate(notifiableData);
      }

      return success(res, "User created successfully.", reqData);
    } catch (error) {
      console.log({ error });
      return serverError(res, "Internal server error");
    }
  },
  updateUser: async (req, res) => {
    try {
      const validate = new Validator(req.body, {
        userId: "required",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      const {
        userId,
        name,
        email,
        contact_number,
        password,
        workspaceId,
        roleId,
        department,
        socialId,
      } = req.body;

      const checkRole = await Role.findOne({ where: { id: roleId } });
      if (!checkRole) {
        return failed(res, "Role not found.");
      }
      const checkWorkSpace = await Workspace.findOne({
        where: { id: workspaceId },
      });
      if (!checkWorkSpace) {
        return failed(res, "Workspace not found.");
      }
      console.log({ checkWorkSpace });
      // Prepare data for update
      const reqData = {
        name,
        email,
        contact_number,
        workspaceId,
        roleId,
        roleName: checkRole.name || "",
        workspace: checkWorkSpace.name || "",
        department,
        socialId,
      };

      // Hash password if provided
      if (password) {
        reqData.password = await User.hashPassword(password);
      }
      if (workspaceId) {
        await Workspace.update(
          { userId: userId },
          { where: { id: reqData.workspaceId } }
        );
      }
      // Update the user with the specified userId
      await User.update(reqData, { where: { id: userId } });

      return success(res, "User updated successfully.", reqData);
    } catch (error) {
      console.log({ error });
      return serverError(res, "Internal server error");
    }
  },
  getUser: async (req, res) => {
    try {
      const validate = new Validator(req.query, {
        userId: "required",
      });

      const matched = await validate.check();

      if (!matched) {
        return validateFail(res, validate);
      }
      const checkUser = await User.findByPk(req.query.userId);
      if (!checkUser) {
        return failed(res, "User not found.");
      }
      return success(res, "Data fetched successfully.", checkUser);
    } catch (error) {
      return serverError(res, "Internal server error");
    }
  },
  updateUserStatus: async (req, res) => {
    try {
      const validate = new Validator(req.body, {
        id: "required",
      });

      const matched = await validate.check();

      if (!matched) {
        return validateFail(res, validate);
      }

      const user = await User.findByPk(req.body.id);

      if (!user) {
        return failed(res, "user not found.");
      }

      user.status = user.status === 0 ? 1 : 0;
      await user.save();

      return success(res, "Status updated successfully.", user);
    } catch (error) {
      return serverError(res, SYSTEM_FAILURE);
    }
  },
};
