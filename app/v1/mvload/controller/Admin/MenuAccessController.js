const {
    serverError,
    success,
    validateFail,
    failed,
} = require("../../../../helper/response");
const {
    SYSTEM_FAILURE,
    ADMIN_CONSTANTS,
    USER_CONSTANTS,
} = require("../../../../helper/message");
const db = require("../../../../../models");
const sequelize = db.sequelize;
const Module = db.mvModule;
const SubModule = db.mvSubModule;
const Access = db.mvAccess;
const Role = db.mvRole;
const RolePermission = db.mvRolePermission;
const ModuleAccesses = db.mvModuleAccess;
const User = db.mvUser;
const { Validator } = require("node-input-validator");
const { Op } = require("sequelize");

const generateSlug = (name) => {
    console.log({ name });
    return name
        .toLowerCase()
        .replace(/ /g, "-")
        .replace(/[^\w-]+/g, "");
};
module.exports = {
    addModule: async (req, res) => {
        try {
            // Validate the request body
            const validate = new Validator(req.body, {
                name: "required",
            });
            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            // Extract the module name from the request body
            const { name: moduleName } = req.body;
            // Generate a slug from the module name
            const slug = generateSlug(moduleName);

            // Prepare the data to be saved
            const reqData = {
                name: moduleName,
                slug,
            };

            // Create a new module
            await Module.create(reqData);
            // Return a success response
            return success(res, ADMIN_CONSTANTS.DATA_ADDED, reqData);
        } catch (error) {
            // Log the error
            console.log({ error });
            // Return a server error response
            return serverError(res, SYSTEM_FAILURE);
        }
    },
    addSubModule: async (req, res) => {
        try {
            // Validate the request body
            const validate = new Validator(req.body, {
                name: "required",
                moduleId: "required", // Fixing the typo "require" to "required"
            });
            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            // Extract name and moduleId from the request body
            const { name, moduleId } = req.body;

            // Generate a slug from the name
            const slug = generateSlug(name);

            // Prepare the data to be saved
            const reqData = {
                name,
                slug,
                moduleId,
            };

            // Create a new submodule
            await SubModule.create(reqData);

            // Return a success response
            return success(res, ADMIN_CONSTANTS.DATA_ADDED, reqData);
        } catch (error) {
            console.log({ error });
            return serverError(res, SYSTEM_FAILURE);
        }
    },
    addAccess: async (req, res) => {
        try {
            const validate = new Validator(req.body, {
                name: "required",
            });
            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            const accessName = req.body.name;
            const slug = generateSlug(accessName);
            const reqData = {
                name: accessName,
                slug,
            };
            await Access.create(reqData);
            return success(res, ADMIN_CONSTANTS.DATA_ADDED, reqData);
        } catch (error) {
            console.log({ error });
            return serverError(res, SYSTEM_FAILURE);
        }
    },
    addRole: async (req, res) => {
        try {
            const validate = new Validator(req.body, {
                name: "required",
            });
            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            const name = req.body.name;
            const slug = generateSlug(name);
            const checkRole = await Role.findOne({ where: { name: { [Op.eq]: name } } });
            if (checkRole) {
                return failed(res, "Role already exist.");
            }
            const reqData = {
                name: name,
                slug,
                createdBy: req.decodedData.id,
            };
            await Role.create(reqData);
            return success(res, ADMIN_CONSTANTS.DATA_ADDED, reqData);
        } catch (error) {
            console.log({ error });
            return serverError(res, SYSTEM_FAILURE);
        }
    },
    // addRolePermission: async (req, res) => {
    //   try {
    //     const validate = new Validator(req.body, {
    //       roleId: "required|integer",
    //       roleAccesses: "required|array",
    //       "roleAccesses.*.moduleId": "required|integer",
    //       "roleAccesses.*.submoduleId": "required|integer",
    //       "roleAccesses.*.access": "required|array",
    //       "roleAccesses.*.access.*": "required|integer",
    //     });

    //     const matched = await validate.check();
    //     if (!matched) {
    //       return validateFail(res, validate);
    //     }

    //     const { roleId, roleAccesses } = req.body;

    //     const reqData = [];
    //     for (const access of roleAccesses) {
    //       const { moduleId, submoduleId, access: accessIds } = access;
    //       for (const accessId of accessIds) {
    //         reqData.push({
    //           roleId,
    //           moduleId,
    //           subModuleId: submoduleId,
    //           accessId,
    //         });
    //       }
    //     }
    //     await RolePermission.bulkCreate(reqData);
    //     return success(res, ADMIN_CONSTANTS.DATA_ADDED, reqData);
    //   } catch (error) {
    //     console.error(error);
    //     return serverError(res, SYSTEM_FAILURE);
    //   }
    // },
    addRolePermission: async (req, res) => {
        try {
            const validate = new Validator(req.body, {
                roleId: "required|integer",
                roleAccesses: "required|array",
                "roleAccesses.*.moduleId": "required|integer",
                // "roleAccesses.*.submoduleId": "required|integer",
                "roleAccesses.*.access": "required|array",
                "roleAccesses.*.access.*": "required|integer",
            });

            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }

            const { roleId, roleAccesses } = req.body;

            const reqData = [];
            for (const access of roleAccesses) {
                const { moduleId, submoduleId, access: accessIds } = access;
                for (const accessId of accessIds) {
                    reqData.push({
                        roleId,
                        moduleId,
                        subModuleId: submoduleId,
                        accessId,
                    });
                }
            }

            const result = await sequelize.transaction(async (t) => {
                await RolePermission.destroy({
                    where: { roleId },
                    transaction: t,
                });

                // Bulk insert new role permissions
                await RolePermission.bulkCreate(reqData, { transaction: t });
            });

            return success(res, "Role permissions added successfully.", reqData);
        } catch (error) {
            console.error(error);
            return serverError(res, SYSTEM_FAILURE);
        }
    },
    updateRolePermission: async (req, res) => {
        try {
            const validate = new Validator(req.body, {
                roleId: "required|integer",
                roleAccesses: "required|array",
                "roleAccesses.*.moduleId": "required|integer",
                "roleAccesses.*.submoduleId": "required|integer",
                "roleAccesses.*.access": "required|array",
                "roleAccesses.*.access.*": "required|integer",
            });

            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }

            const { roleId, roleAccesses } = req.body;

            // Delete existing role permissions for the roleId
            await RolePermission.destroy({
                where: { roleId },
            });

            const reqData = [];
            for (const access of roleAccesses) {
                const { moduleId, submoduleId, access: accessIds } = access;
                for (const accessId of accessIds) {
                    reqData.push({
                        roleId,
                        moduleId,
                        subModuleId: submoduleId,
                        accessId,
                    });
                }
            }

            // Insert the new role permissions
            await RolePermission.bulkCreate(reqData);

            return success(res, ADMIN_CONSTANTS.DATA_UPDATED, reqData);
        } catch (error) {
            console.error(error);
            return serverError(res, SYSTEM_FAILURE);
        }
    },
    getRolePermission: async (req, res) => {
        try {
            // Validate the request query
            const validate = new Validator(req.query, {
                roleId: "required",
            });
            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }

            // Check if the role exists
            const checkRole = await Role.findOne({ where: { id: req.query.roleId } });
            if (!checkRole) {
                return failed(res, "Role not found.");
            }

            // Fetch all modules with their submodules and access information
            const getAllModules = await ModuleAccesses.findAll({
                include: [
                    { model: Module, as: "modules", attributes: ["id", "name"] },
                    { model: SubModule, as: "submodules", attributes: ["id", "name"] },
                    { model: Access, as: "access", attributes: ["name", "id"] },
                ],
            });

            // Group the data by moduleId
            const groupedData = {};
            getAllModules.forEach((item) => {
                const moduleId = item.moduleId;

                if (!groupedData[moduleId]) {
                    groupedData[moduleId] = {
                        id: item.id,
                        moduleId: item.moduleId,
                        modules: item.modules,
                        submodules: [],
                    };
                }

                // Handle case where submodules is null
                if (item.submodules) {
                    const subModuleExists = groupedData[moduleId].submodules.find(
                        (sub) => sub.id === item.subModuleId
                    );
                    if (!subModuleExists) {
                        groupedData[moduleId].submodules.push({
                            id: item.submodules.id,
                            name: item.submodules.name,
                            access: [],
                        });
                    }

                    const submoduleIndex = groupedData[moduleId].submodules.findIndex(
                        (sub) => sub.id === item.subModuleId
                    );
                    groupedData[moduleId].submodules[submoduleIndex].access.push({
                        id: item.access.id,
                        name: item.access.name,
                        isSelected: false,
                    });
                } else {
                    // Add module-level access directly if there are no submodules
                    if (!groupedData[moduleId].submodules.length) {
                        groupedData[moduleId].submodules.push({
                            id: null,
                            name: null,
                            access: [],
                        });
                    }
                    groupedData[moduleId].submodules[0].access.push({
                        id: item.access.id,
                        name: item.access.name,
                        isSelected: false,
                    });
                }
            });

            // Convert groupedData to an array
            const responseData = Object.values(groupedData);
            // Fetch role permissions
            const rolePermissions = await RolePermission.findAll({
                where: { roleId: req.query.roleId }, // Assuming RolePermission has a roleId field
                attributes: ["accessId", "moduleId", "subModuleId"],
            });
            console.log(rolePermissions);
            // Create a map of rolePermissions for quick lookup
            const rolePermissionsMap = new Map();
            rolePermissions.forEach((rp) => {
                const key = `${rp.moduleId}-${rp.subModuleId}-${rp.accessId}`;
                rolePermissionsMap.set(key, true);
            });

            // Mark access objects as selected if their moduleId, subModuleId, and accessId match
            responseData.forEach((group) => {
                group.submodules.forEach((submodule) => {
                    submodule.access.forEach((access) => {
                        const key = `${group.moduleId}-${submodule.id}-${access.id}`;
                        if (rolePermissionsMap.has(key)) {
                            access.isSelected = true;
                        }
                    });
                });
            });

            return success(res, USER_CONSTANTS.DATA_FETCHED, responseData);
        } catch (error) {
            console.log({ error });
            return serverError(res, SYSTEM_FAILURE);
        }
    },
    getRole: async (req, res) => {
        try {
            const roles = await Role.findAll(
                { where: { createdBy: req.decodedData.id } },
                { attributes: ["id", "name", "slug"] }
            );

            return success(res, USER_CONSTANTS.DATA_FETCHED, roles);
        } catch (error) {
            console.log({ error });
            return serverError(res, SYSTEM_FAILURE);
        }
    },
    deleteRole: async (req, res) => {
        try {
            const validate = new Validator(req.body, {
                roleId: "required",
            });
            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            const { roleId } = req.body;

            const checkRole = await Role.findOne({ where: { id: roleId } });
            if (!checkRole) {
                return failed(res, "Role not found.");
            }
            // Delete existing role permissions for the roleId
            await RolePermission.destroy({
                where: { roleId },
            });
            return success(res, "Role deleted sucessfully.");
        } catch (error) {
            return serverError(res, SYSTEM_FAILURE);
        }
    }
};
