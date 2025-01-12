const {
    success,
    failed,
    serverError,
    validateFail,
    response,
} = require("../../../helper/response");
const { USER_CONSTANTS, EMAIL_CONSTANTS, ADDRESS_CONSTANTS, AUTH_CONSTANTS, SYSTEM_FAILURE, BANK_CONSTANTS, KYC_SUCCESS, VALIDATION_FAILED } = require('../../../helper/message');
const db = require("../../../../models/");
const bcrypt = require('bcryptjs');
const _ = require("lodash");
// const Admin = db.mvAdmin;
const Admin = db.mvUser;
const Order = db.mvorder;
const AssingUser = db.mvCustomerAssign;
const { Validator } = require("node-input-validator");
const jwt = require("jsonwebtoken");
const { fn, col, Op, where, literal } = require("sequelize");
const e = require("express");
const { assign } = require("nodemailer/lib/shared");
const Module = db.mvModule;
const SubModule = db.mvSubModule;
const Access = db.mvAccess;
const Role = db.mvRole;
const RolePermission = db.mvRolePermission;
const ModuleAccesses = db.mvModuleAccess;

//admin basic modules
exports.login = async (req, res) => {
    try {
        const validate = new Validator(req.body, {
            email: 'required|email',
            password: 'required|minLength:6'
        });

        const matched = await validate.check();
        if (!matched)
            return validateFail(res, validate);

        const { email, password } = req.body;

        const userData = await Admin.findOne({
            where: {
                email: email,
                userType: 'Admin'
            },
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
            ]
        });

        if (!userData) return failed(res, USER_CONSTANTS.USER_NOT_FOUND)

        const hashedPassword = await bcrypt.compare(password, userData.password);

        if (hashedPassword === false)
            return failed(res, USER_CONSTANTS.INVALID_CREDENTIALS);

        const token = jwt.sign({ id: userData.id, email: userData.email }, process.env.JWT_SECRET_KEY);

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
        var moduleAccess = []
        // Create a map for quick permission lookup
        const rolePermissionsMap = new Map();
        if (userData.role && userData.role.rolePermissions) {
            userData.role.rolePermissions.forEach((rp) => {
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
            moduleAccess = newresponseData.filter(
                (group) => group.access.length > 0
            );
        }
        // Remove role data before sending the response
        const { role, ...userWithoutRole } = userData.toJSON();
        let user = _.pick(userData, ['id', 'name', 'email', 'mobile', 'roleName', 'userType', 'roleId', 'isActive'])
        user.role = user.roleName
        // Return success response
        return success(res, USER_CONSTANTS.LOGGED_IN, { user, moduleAccess, token });

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.getProfile = async (req, res) => {
    try {
        const id = req.decodedData.id;
        let user = await Admin.findOne({
            where: { id },
            attributes: ['id', 'name', 'email', 'mobile', 'roleName', 'createdAt', 'updatedAt']
        });


        if (!user) return failed(res, USER_CONSTANTS.USER_NOT_FOUND)
        user.role = user.roleName
        // Return success response
        return success(res, USER_CONSTANTS.USER_FOUND, user);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.updateProfile = async (req, res) => {
    try {
        // Validate request body
        const validate = new Validator(req.body, {
            name: 'required|string',
            mobile: 'required|integer',
            email: "sometimes"
        });

        const matched = await validate.check();
        if (!matched)
            return validateFail(res, validate);

        const { name, mobile, email } = req.body;

        const user = await Admin.findOne({ where: { id: req.decodedData.id } });

        if (!user) return failed(res, USER_CONSTANTS.USER_NOT_FOUND);

        let updatedData = await user.update({ name, mobile, email });
        const updateduser = await Admin.findOne({
            where: { id: req.decodedData.id },
            attributes: ['id', 'name', 'email', 'mobile', 'roleName', 'createdAt', 'updatedAt']
        });
        updateduser.role = updateduser.roleName
        return success(res, USER_CONSTANTS.USER_UPDATED, updateduser);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.changePassword = async (req, res) => {
    try {
        // Validate request body
        const validate = new Validator(req.body, {
            oldPassword: 'required',
            password: 'required|different:oldPassword',
            confirmPassword: 'required|same:password'
        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }

        // Check if user already exists
        const admin = await Admin.findOne({ where: { id: req.decodedData.id } })

        const validPassword = await bcrypt.compare(req.body.oldPassword, admin.password);

        if (!validPassword)
            return failed(res, USER_CONSTANTS.INVALID_PASSWORD);

        const updatedPassword = await bcrypt.hash(req.body.password, parseInt(process.env.BCRYPTSALT, 10));

        await admin.update({ password: updatedPassword });

        // Return success response
        return success(res, AUTH_CONSTANTS.PASSWORD_CHANGE_SUCCESS);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.getKamList = async (req, res) => {
    try {
        const data = await Admin.findAll({
            where: { roleName: 'KAM' },
            attributes: ['id', 'name', 'email', 'roleName', 'roleId'] // Specify the columns you want
        });

        return success(res, USER_CONSTANTS.KAM_FETCHED, data);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.assignKam = async (req, res) => {
    try {
        const validate = new Validator(req.body, {
            userId: 'required',
            orderId: 'required'
        });

        const matched = await validate.check();
        if (!matched)
            return validateFail(res, validate);

        // const assignBy = req.decodedData.id;
        // const { userId, kamId } = req.body;

        // const datafetch = await AssingUser.findOne({ where: { userId } });

        // if (datafetch) {
        //     datafetch.update({ assignTo: kamId });
        //     return success(reinRanges, USER_CONSTANTS.KAM_ASSINGED);
        // }

        // const data = await AssingUser.create({ userId, assignTo: kamId, assignBy });
        let order = await Order.findOne({
            where: {
                id: req.body.orderId
            }
        })
        if (!order)
            return response(res, 422, "Order not found")
        await Order.update({ kamId: req.body.userId }, {
            where: {
                id: req.body.orderId
            }
        })
        return success(res, USER_CONSTANTS.KAM_ASSINGED);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};
exports.assignUserKam = async (req, res) => {
    try {
        const validate = new Validator(req.body, {
            userId: 'required',
            kamId: 'required'
        });

        const matched = await validate.check();
        if (!matched)
            return validateFail(res, validate);

        const assignBy = req.decodedData.id;
        const { userId, kamId } = req.body;

        const datafetch = await AssingUser.findOne({ where: { userId: userId } });

        if (datafetch) {
            datafetch.update({ assignTo: kamId });
            return success(res, USER_CONSTANTS.KAM_ASSINGED);
        }

        const data = await AssingUser.create({ userId: userId, assignTo: kamId, assignBy: assignBy });
        return success(res, USER_CONSTANTS.KAM_ASSINGED);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};



