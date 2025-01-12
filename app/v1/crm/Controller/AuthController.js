const { Validator } = require("node-input-validator");
const {
  serverError,
  validateFail,
  success,
  failed,
} = require("../../../helper/response");
const db = require("../../../../models");
const Workspace = db.crmworkspace;
const { Op } = require("sequelize");
const User = db.crmuser;
const Role = db.Role;
const RolePermission = db.RolePermission;
const ModuleAccesses = db.moduleAccess;
const Module = db.Module;
const SubModule = db.SubModule;
const Access = db.Access;
const { USER_CONSTANTS, SYSTEM_FAILURE } = require("../../../helper/message");
const bcrypt = require("bcrypt");
const { aws } = require("../../../helper/aws");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
// Initialize passport for Google OAuth
// Initialize Google OAuth using credentials from environment variables
const axios = require("axios");

const verifyGoogleAccessToken = async (token) => {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`
    );

    if (
      response.data &&
      response.data.audience === process.env.GOOGLE_CLIENT_ID
    ) {
      // Token is valid and the audience matches
      const user = {
        id: response.data.user_id,
        email: response.data.email,
        expires_in: response.data.expires_in,
      };
      return user;
    } else {
      throw new Error("Invalid token");
    }
  } catch (error) {
    console.error("Error verifying Google access token:", error);
    return null;
  }
};

module.exports = {
  // Login
  login: async (req, res) => {
    try {
      const requests = req.body;

      // Validate the incoming request
      const v = new Validator(requests, {
        email: "required|email",
        // password: "required",
        // loginType: "required|in:social,normal",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }

      let userExist;

      if (requests.loginType === "social") {
        // Social media login
        const { provider, token } = requests;

        // Find user in database by social token (in production you would verify the token with the provider)
        let socialUser;
        if (provider === "google") {
          // Handle Google login (you would typically verify token with Google API)
          socialUser = await verifyGoogleAccessToken(token);
        }
        // Add other social providers (e.g., Facebook) similarly
        if (!socialUser) {
          return failed(res, "Invalid social login token.");
        }

        // Find or create user based on social ID
        userExist = await User.findOne({
          where: { email: socialUser.email },
          include: [
            {
              model: Role,
              as: "role",
              attributes: ["id", "name", "slug"],
              include: [
                {
                  model: RolePermission,
                  as: "rolePermissions",
                  attributes: ["accessId", "moduleId", "subModuleId"],
                },
              ],
            },
          ],
        });
        if (!userExist) {
          return failed(res, "User not found.");
        }
      } else {
        // Normal login
        userExist = await User.findOne({
          where: { email: requests.email },
          include: [
            {
              model: Role,
              as: "role",
              attributes: ["id", "name", "slug"],
              include: [
                {
                  model: RolePermission,
                  as: "rolePermissions",
                  attributes: ["accessId", "moduleId", "subModuleId"],
                },
              ],
            },
          ],
        });

        if (!userExist) {
          return failed(res, "User not found.");
        }

        // Check if user is blocked
        if (userExist.status == 0) {
          return failed(
            res,
            "Your account is blocked. Please contact the admin."
          );
        }

        // Check if workspace is assigned
        if (userExist.workspaceId == 0) {
          return failed(
            res,
            "No workspace is assigned to this email. Please contact the admin."
          );
        }

        // Compare the provided password with the stored password hash (only for normal login)
        const passwordMatch = await bcrypt.compare(
          requests.password,
          userExist.password
        );
        if (!passwordMatch) {
          return failed(res, "Incorrect password");
        }
      }

      // Fetch all modules and group them by moduleId and subModuleId
      const getAllModules = await ModuleAccesses.findAll({
        include: [
          { model: Module, as: "modules", attributes: ["id", "name", "slug"] },
          {
            model: SubModule,
            as: "submodules",
            attributes: ["id", "name", "slug"],
          },
          { model: Access, as: "access", attributes: ["id", "name", "slug"] },
        ],
      });

      // Process the modules to include only relevant data
      const groupedData = {};
      getAllModules.forEach((item) => {
        const moduleName = item.modules ? item.modules.name : "";
        const moduleSlug = item.modules ? item.modules.slug : "";

        const subModuleName = item.submodules ? item.submodules.name : "";
        const subModuleSlug = item.submodules ? item.submodules.slug : "";

        const key = `${item.moduleId}-${item.subModuleId}`;
        if (!groupedData[key]) {
          groupedData[key] = {
            moduleId: item.moduleId,
            moduleName: moduleName,
            moduleSlug: moduleSlug,
            subModuleId: item.subModuleId,
            subModuleSlug: subModuleSlug,
            subModuleName: subModuleName,
            access: [],
          };
        }

        const accessName = item.access ? item.access.name : "";
        const accessSlug = item.access ? item.access.slug : "";

        groupedData[key].access.push({
          id: item.access ? item.access.id : null,
          name: accessName,
          accessSlug: accessSlug,
          isSelected: false,
        });
      });

      const newresponseData = Object.values(groupedData);

      // Create a map for quick permission lookup
      const rolePermissionsMap = new Map();
      if (userExist.role && userExist.role.rolePermissions) {
        userExist.role.rolePermissions.forEach((rp) => {
          const key = `${rp.moduleId}-${rp.subModuleId}-${rp.accessId}`;
          rolePermissionsMap.set(key, true);
        });

        // Mark access objects as selected based on permissions
        newresponseData.forEach((group) => {
          group.access = group.access
            .map((access) => {
              const key = `${group.moduleId}-${group.subModuleId}-${access.id}`;
              return {
                ...access,
                isSelected: rolePermissionsMap.has(key),
              };
            })
            .filter((access) => access.isSelected);
        });

        // Remove any modules that have no access IDs remaining
        const filteredResponseData = newresponseData.filter(
          (group) => group.access.length > 0
        );

        // Generate a JWT token
        let token = await userExist.generateToken();

        // Remove role data before sending the response
        const { role, ...userWithoutRole } = userExist.toJSON();
        const responseData = {
          userDetails: userWithoutRole,
          modules: filteredResponseData,
          token: token,
        };

        return success(res, "Login success", responseData);
      } else {
        return failed(res, "User has no permissions.");
      }
    } catch (error) {
      console.error(error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  getProfile: async (req, res) => {
    try {
      const checkUser = await User.findOne({
        where: { id: req.decodedData.id },
        include: [
          {
            model: Workspace,
            as: "workspaceData",
          },
        ],
      });
      if (!checkUser) {
        return failed(res, "User not found.");
      }
      return success(res, "Data fetched successfully.", checkUser);
    } catch (error) {
      return serverError(res, "Internal server error");
    }
  },
  //Change Password
  changePassword: async (req, res) => {
    try {
      const requests = req.body;
      const v = new Validator(requests, {
        oldPassword: "required",
        newPassword: "required",
        confirmNewPassword: "required|same:newPassword",
      });

      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }

      let userExist = await User.findOne({
        email: requests.email,
      });

      if (!userExist) {
        return failed(res, "User not found.");
      }

      // Compare the provided password with the stored password hash
      const passwordMatch = await bcrypt.compare(
        requests.oldPassword,
        userExist.password
      );

      if (!passwordMatch) {
        return failed(res, "Old password is incorrect.");
      }
      const userId = req.decodedData.id;
      console.log({ userId });
      const hashedNewPassword = await User.hashPassword(requests.newPassword);
      console.log(hashedNewPassword);
      await User.update(
        { password: hashedNewPassword },
        { where: { id: userId } }
      );
      return success(res, "Password updated successfully.");
    } catch (error) {
      console.log({ error });
      return serverError(res, SYSTEM_FAILURE);
    }
  },

  updateUserProfile: async (req, res) => {
    try {
      const userId = req.decodedData.id;
      const { name, email, contact_number, password, workspaceId, roleId } =
        req.body;

      let reqData = { name, email, contact_number, password };

      if (workspaceId) {
        const checkWorkSpace = await Workspace.findOne({
          where: { id: workspaceId },
        });
        if (!checkWorkSpace) {
          return failed(res, "Workspace not found.");
        }
        reqData.workspaceId = workspaceId;
        reqData.workspace = checkWorkSpace.name;
      }

      if (req.files) {
        if (req.files.signature) {
          const signatureFileName = await aws(
            req.files.signature,
            "crm/profile"
          );
          reqData.signature = signatureFileName.Location;
        }
        if (req.files.profileImage) {
          const profileImageFileName = await aws(
            req.files.profileImage,
            "crm/profile"
          );
          reqData.profileImage = profileImageFileName.Location;
        }
      }

      // Update the user with the specified userId
      await User.update(reqData, { where: { id: userId } });

      return success(res, "User updated successfully.", reqData);
    } catch (error) {
      console.log({ error });
      return serverError(res, SYSTEM_FAILURE);
    }
  },

  switchUser: async (req, res) => {
    try {
      const { currentUserId, targetUserId } = req.body;

      // Fetch the current user details
      const currentUser = await User.findByPk(currentUserId);

      // Check if the current user is of type Global (userType = 0)
      if (currentUser.userType !== 0) {
        return failed(res, "Only global users can switch to other users.");
      }

      // Fetch the target user
      const targetUser = await User.findByPk(targetUserId);
      if (!targetUser) {
        return failed(res, "Target user not found.");
      }
      console.log("req.session", req.session);
      // Implement logic for switching user context/session (update session, etc.)
      req.session.userId = targetUser.id;
      req.session.userType = targetUser.userType;

      return res.status(200).json({
        message: `Successfully switched to user: ${targetUser.name}`,
        targetUser: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          userType: targetUser.userType,
        },
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },
};
