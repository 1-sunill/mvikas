const { Validator } = require("node-input-validator");
const {
    serverError,
    validateFail,
    success,
    failed,
} = require("../../../../helper/response");
const { Op, where } = require("sequelize");
const db = require("../../../../../models");
const User = db.mvUser;
const Role = db.mvRole;
const { USER_CONSTANTS, ADMIN_CONSTANTS } = require("../../../../helper/message");
const { sendmail } = require("../../../../helper/mail");
const fs = require("fs");
const ejs = require("ejs");
const bcrypt = require('bcryptjs');

module.exports = {
    listUsers: async (req, res) => {
        try {
            const request = req.query;
            const search = request.search ? request.search : "";
            const page = request.page ? parseInt(request.page) : 1;
            const limit = request.limit ? parseInt(request.limit) : 10;
            const offset = (page - 1) * limit;
            const user = await User.findOne({ id: req.decodedData.id });
            let params = {
                id: {
                    [Op.ne]: user.id,

                },
                roleId: { [Op.ne]: 0 },
                userType: "Admin"
            };
            if (request.status) {
                params = Object.assign(params, {
                    isActive: request.status
                })
            }
            if (request.roleId) {
                params = Object.assign(params, {
                    roleId: request.roleId
                })
            }

            if (search) {
                params = {
                    ...params,
                    [Op.or]: [
                        {
                            name: {
                                [Op.like]: `%${search}%`,
                            },
                        },
                        {
                            email: {
                                [Op.like]: `%${search}%`,
                            },
                        },
                        {
                            mobile: {
                                [Op.like]: `%${search}%`,
                            },
                        }

                    ],
                };
            }
            console.log(params);
            let list = await User.findAll({
                where: params,
                attributes: ['id', 'name', 'email', 'mobile', 'roleName', 'userType', 'roleId', 'isActive'],
                limit,
                offset

            })
            let totalCount = await User.count({ where: params })
            return success(res, USER_CONSTANTS.DATA_FETCHED, {
                list,
                totalCount,
            });
        } catch (error) {
            console.log({ error });
            return serverError(res, "Internal server error");
        }
    },
    addUser: async (req, res) => {
        try {
            const validate = new Validator(req.body, {
                name: "required",
                email: "required|email",
                mobile: "required",
                password: "required",
                confirmPassword: "required|same:password",
                roleId: "required",
            });
            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            const request = req.body;

            const { name, email, mobile, password } =
                req.body;
            let { workspaceId, roleId } = req.body; // Use let to allow reassignment

            workspaceId = parseInt(workspaceId) ? parseInt(workspaceId) : 0;
            roleId = parseInt(roleId) ? parseInt(roleId) : 0;
            // console.log({ workspaceId }); return 1;
            //Check user
            const userCheckemail = await User.findOne({
                where: {
                    email: email,
                    userType: 'Admin'
                }
            });
            if (userCheckemail) {
                return failed(res, "User email already exist.");
            }

            const userCheckMobile = await User.findOne({
                where: {
                    mobile: mobile,
                    userType: 'Admin'
                },
            });
            if (userCheckMobile) {
                return failed(res, "User mobile already exist.");
            }

            const checkRole = await Role.findOne({ where: { id: roleId } });
            if (!checkRole) {
                return failed(res, "Role not found.");
            }
            const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPTSALT, 10));

            await User.create({
                name: name,
                mobile: mobile,
                email: email,
                password: hashedPassword,
                roleId: roleId,
                roleName: checkRole.name,
                createdBy: req.decodedData.id,
                userType: 'Admin',
                isActive: 1
            });

            return success(res, "User created successfully.");
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
                mobile,
                password,
                roleId

            } = req.body;

            const checkRole = await Role.findOne({ where: { id: roleId } });
            if (!checkRole) {
                return failed(res, "Role not found.");
            }

            const userCheckemail = await User.findOne({
                where: {
                    email: email,
                    userType: 'Admin',
                    id: {
                        [Op.ne]: userId
                    }
                }
            });
            if (userCheckemail) {
                return failed(res, "User email already exist.");
            }

            const userCheckMobile = await User.findOne({
                where: {
                    mobile: mobile,
                    userType: 'Admin',
                    id: {
                        [Op.ne]: userId
                    }
                },
            });
            if (userCheckMobile) {
                return failed(res, "User mobile already exist.");
            }

            const reqData = {
                name,
                email,
                mobile,
                roleId,
                roleName: checkRole.name || ""
            };

            // Hash password if provided
            if (password) {
                reqData.password = await bcrypt.hash(password, parseInt(process.env.BCRYPTSALT, 10));
            }
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
            const checkUser = await User.findOne({ where: { id: req.query.userId }, attributes: ['id', 'name', 'email', 'mobile', 'roleName', 'userType', 'roleId', 'isActive'] })
            if (!checkUser) {
                return failed(res, "User not found.");
            }
            checkUser.role = checkUser.roleName
            return success(res, "Data fetched successfully.", checkUser);
        } catch (error) {
            return serverError(res, "Internal server error");
        }
    },
    updateUserStatus: async (req, res) => {
        try {
            const validate = new Validator(req.body, {
                id: 'required',
                status: 'required|in:0,1'
            });

            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            let { id, status } = req.body;
            isActive = status ? 1 : 0

            const user = await User.findOne({ where: { id, userType: 'Admin' } });
            if (!user)
                return failed(res, USER_CONSTANTS.USER_NOT_FOUND);

            await user.update({ isActive: isActive }, {
                where: {
                    id: req.body.id
                }
            });

            return success(res, ADMIN_CONSTANTS.DATA_UPDATED);

        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    userDelete: async (req, res) => {
        try {

            let id = req.params.id;

            const user = await User.findOne({ where: { id: id, userType: 'Admin' } });
            if (!user)
                return failed(res, USER_CONSTANTS.USER_NOT_FOUND);

            await User.destroy(
                {
                    individualHooks: true, // Use individual hooks for the destroy operation
                    hooks: true, // Enable global hooks
                    returning: false, // Do not return the deleted retailer object
                    where: { id }, // Additional where clause to ensure specific user deletion
                }
            );

            return success(res, ADMIN_CONSTANTS.DELETED);

        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    }
};
