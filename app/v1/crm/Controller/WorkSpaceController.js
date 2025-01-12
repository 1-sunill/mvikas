const { Validator } = require("node-input-validator");
const {
  serverError,
  validateFail,
  success,
  failed,
} = require("../../../helper/response");
const db = require("../../../../models");
const { Op } = require("sequelize");
const User = db.crmuser;
const Role = db.Role;
const Workspace = db.crmworkspace;
const { USER_CONSTANTS, SYSTEM_FAILURE } = require("../../../helper/message");
const { aws } = require("../../../helper/aws");
const generateSlug = (name) => {
  console.log({ name });
  return name
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^\w-]+/g, "");
};
module.exports = {
  addWorkSpace: async (req, res) => {
    try {
      const validate = new Validator(req.body, {
        name: "required|string",
        legal_name: "required|string",
        email: "required|email",
        phone: "required|string",
        gst_tin: "required|string",
        cin: "required|string",
        bank_name: "required|string",
        bank_ifsc: "required|string",
        bank_ac_number: "required|string",
        address: "required",
      });
  
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
  
      let {
        name,
        legal_name,
        email,
        phone,
        gst_tin,
        cin,
        address,
        bank_name,
        bank_ifsc,
        bank_ac_number,
        userId,
      } = req.body;
  
      // Replace empty strings or undefined values with null
      const fields = [
        "name",
        "legal_name",
        "email",
        "phone",
        "gst_tin",
        "cin",
        "address",
        "bank_name",
        "bank_ifsc",
        "bank_ac_number",
        "userId",
      ];
  
      fields.forEach((field) => {
        if (!req.body[field] || req.body[field].trim() === "") {
          req.body[field] = null;
        }
      });
  
      // Check if a workspace with the same name already exists
      const workspaceNameCheck = await Workspace.findOne({ where: { name } });
      if (workspaceNameCheck) {
        return failed(res, "Workspace name already exists.");
      }
  
      // Check if workspace with email, phone, or GST already exists
      const [workspaceEmailCheck, workspaceGstCheck] = await Promise.all([
        Workspace.findOne({ where: { email } }),
        Workspace.findOne({ where: { gst_tin } }),
      ]);
  
      if (workspaceGstCheck) {
        return failed(res, "GST already exists.");
      }
  
      if (workspaceEmailCheck) {
        return failed(res, "Email already exists.");
      }
  
      const workspacephoneCheck = await Workspace.findOne({
        where: { phone },
      });
      if (workspacephoneCheck) {
        return failed(res, "Mobile already exists.");
      }
  
      let user;
      if (userId) {
        user = await User.findOne({ where: { id: userId } });
        if (!user) {
          return failed(res, "User not found.");
        }
      }
  
      const slug = generateSlug(name);
  
      const reqData = {
        name,
        legal_name,
        slug,
        email,
        phone,
        gst_tin,
        cin,
        address,
        bank_name,
        bank_ifsc,
        bank_ac_number,
        userId,
      };
  
      if (req.files && req.files.logo_path) {
        const logo_pathFileName = await aws(req.files.logo_path, "crm");
        reqData.logo_path = logo_pathFileName.Location;
      }
  
      if (req.files && req.files.banner_path) {
        const banner_pathFileName = await aws(req.files.banner_path, "crm");
        reqData.banner_path = banner_pathFileName.Location;
      }
  
      const workspace = await Workspace.create(reqData);
  
      if (userId) {
        await User.update(
          { workspaceId: workspace.id },
          { where: { id: userId } }
        );
      }
  
      return success(res, "Workspace added successfully.", reqData);
    } catch (error) {
      console.log({ error });
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  

  updateWorkSpace: async (req, res) => {
    try {
      const validate = new Validator(req.body, {
        id: "required|integer",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      const {
        id,
        name,
        legal_name,
        email,
        phone,
        gst_tin,
        cin,
        address,
        bank_name,
        bank_ifsc,
        bank_ac_number,
        userId,
      } = req.body;
      const slug = generateSlug(name);

      const reqData = {
        name,
        legal_name,
        slug,
        email,
        phone,
        gst_tin,
        cin,
        address,
        bank_name,
        bank_ifsc,
        bank_ac_number,
        userId,
      };

      if (req.files && req.files.logo_path) {
        const logo_pathFileName = await aws(req.files.logo_path, "crm");
        reqData.logo_path = logo_pathFileName.Location;
      }

      if (req.files && req.files.banner_path) {
        const banner_pathFileName = await aws(req.files.banner_path, "crm");
        reqData.banner_path = banner_pathFileName.Location;
      }
      if (userId) {
        await User.update({ workspaceId: id }, { where: { id: userId } });
      }
      const workspace = await Workspace.findByPk(id);
      if (!workspace) {
        return failed(res, "Workspace not found.");
      }

      await workspace.update(reqData);

      return success(res, "Workspace updated successfully.", reqData);
    } catch (error) {
      console.error({ error });
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  getWorkspace: async (req, res) => {
    try {
      const validate = new Validator(req.query, {
        id: "required|integer",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      const workspace = await Workspace.findByPk(req.query.id);
      if (!workspace) {
        return failed(res, "Workspace not found.");
      }
      return success(res, "Workspace fetched successfully.", workspace);
    } catch (error) {
      console.log({ error });
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  listWorkspace: async (req, res) => {
    try {
      const request = req.query;
      const search = request.search ? request.search : "";
      const page = request.page ? parseInt(request.page) : 1;
      const pageSize = request.limit ? request.limit : process.env.PAGE_LIMIT;
      const offset = (page - 1) * pageSize;
      let params = {};

      if (search) {
        params = {
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
      if (request.type == 1) {
        list = await Workspace.findAll({
          where: params,
          order: [["id", "DESC"]],
          limit: parseInt(pageSize),
          offset: offset,
        });
      } else {
        list = await Workspace.findAll({ where: { status: 1 } });
      }

      const totalCount = await Workspace.findAll({
        where: params,
      });
      const finalData = {
        list,
        count: totalCount.length,
      };
      return success(res, "Success", finalData);
    } catch (error) {
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  statusWorkspace: async (req, res) => {
    try {
      const validate = new Validator(req.body, {
        id: "required",
      });

      const matched = await validate.check();

      if (!matched) {
        return validateFail(res, validate);
      }

      const workspace = await Workspace.findByPk(req.body.id);

      if (!workspace) {
        return failed(res, "workspace not found.");
      }

      workspace.status = workspace.status === 0 ? 1 : 0;
      await workspace.save();

      return success(res, "Status updated successfully.", workspace);
    } catch (error) {
      return serverError(res, SYSTEM_FAILURE);
    }
  },
};
