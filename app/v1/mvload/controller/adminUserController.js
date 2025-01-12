const {
    success,
    failed,
    serverError,
    validateFail,
    response,
} = require("../../../helper/response");
const { USER_CONSTANTS, AUTH_CONSTANTS, SYSTEM_FAILURE, KYC_CONSTANTS, ADMIN_CONSTANTS } = require('../../../helper/message');
const db = require("../../../../models/");
const bcrypt = require('bcryptjs');
const _ = require("lodash");
const User = db.mvUser;
const Associate = db.mvAssociateVendors;
const Admin = db.mvAdmin;
const AssingUser = db.mvCustomerAssign;
const Account = db.mvAccountDetails;
const kyc = db.mvKycVerifcation;
const { Validator } = require("node-input-validator");
const jwt = require("jsonwebtoken");
const { fn, col, Op, where, literal } = require("sequelize");
const e = require("express");
const ExcelJS = require('exceljs');
const { EKS } = require("aws-sdk");
const moment = require('moment')

exports.customerList = async (req, res) => {
    try {
        let { search, days, status, isBlocked = "", page = 1, pageSize = 10, fromDate, toDate } = req.query;
        page = parseInt(page);
        pageSize = parseInt(pageSize);

        let whereClause = {
            isUser: true
        };

        if (days) {
            const date = new Date();
            date.setDate(date.getDate() - parseInt(days));
            whereClause = Object.assign(whereClause, {
                createdAt: { [Op.gte]: date }
            })
        }
        if (!days && fromDate && toDate) {
            fromDate = moment(fromDate).format('YYYY-MM-DD')
            toDate = moment(toDate).format('YYYY-MM-DD')
            whereClause = Object.assign(whereClause, {
                [Op.and]: [{
                    createdAt: {
                        [Op.gte]: fromDate + ' 00:00:00'
                    }
                },
                {
                    createdAt: {
                        [Op.lte]: toDate + ' 23:59:00'
                    }
                }
                ]
            })
        }

        if (search) {
            // Add search conditions to an array
            whereClause = Object.assign(whereClause, {
                [Op.or]: [
                    { email: { [Op.like]: `%${search}%` } },
                    { name: { [Op.like]: `%${search}%` } }
                ]
            })
        }

        if (status) {
            whereClause = Object.assign(whereClause, {
                isActive: status
            })
        }

        if (isBlocked) {
            whereClause = Object.assign(whereClause, {
                isBlocked: isBlocked
            })
        }



        const limit = pageSize;
        const offset = (page - 1) * limit;

        const { count, rows } = await User.findAndCountAll({
            where: whereClause,
            attributes: [
                'id', 'name', 'email', 'mobile', 'isActive', 'GSTNo', 'panNo', 'createdAt', 'isBlocked', 'rateType'
            ],
            include: [
                {
                    model: kyc,
                    as: 'kycVerification',
                    attributes: ['isApproved']
                },
                {
                    model: Account,
                    as: 'account',
                    attributes: ['billingType']
                },
                {
                    model: AssingUser,
                    as: 'assignedKAM',
                    include: [
                        {
                            model: User,
                            as: 'assigned'
                        }
                    ]
                }
            ],
            limit,
            offset
        });

        const totalPages = Math.ceil(count / limit);

        // Transform the result to simplify the nested objects
        const transformedData = rows.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            isActive: user.isActive,
            isBlocked: user.isBlocked,
            GSTNo: user.GSTNo,
            panNo: user.panNo,
            createdAt: user.createdAt,
            rateType: user.rateType,
            kycVerification: user.kycVerification ? user.kycVerification.isApproved : null,
            account: user.account ? user.account.billingType : null,
            assignedKAM: user.assignedKAM ? {
                assignTo: user.assignedKAM.assignTo,
                assigned: user.assignedKAM.assigned ? user.assignedKAM.assigned.email : null
            } : null
        }));

        if (req.params.id) {
            const user = await User.findOne({
                where: { id: req.params.id },
                attributes: [
                    'id', 'name', 'email', 'mobile', 'isUser', 'isVendor', 'isActive',
                    'GSTNo', 'panNo', 'createdAt', 'updatedAt', 'secondEmail',
                    'dealItem', 'avgShipmentWeight', 'companyAddressLine1',
                    'companyAddressLine2', 'companyAddressState', 'companyAddressPincode',
                    'companyAddressCity', 'companyAddressCountry', 'companyDescription',
                    'billingAddressLine1', 'billingAddressLine2', 'billingAddressPincode',
                    'billingAddressState', 'billingAddressCity', 'billingAddressCountry',
                    'isBlocked', 'monthlyShipping', 'noOfShipment', 'rateType'
                ],
                include: [
                    {
                        model: Account,
                        as: 'account',
                        attributes: ['userId', 'billingType', 'creditLimit', 'billingCycle', 'billingDay', 'paymentCycle', 'paymentDay', 'remark', 'availableAmount', 'createdAt', 'updatedAt']
                    }
                ]
            });

            if (!user) {
                return failed(res, USER_CONSTANTS.USER_NOT_FOUND);
            }

            return success(res, USER_CONSTANTS.USER_FOUND, user);
        }

        return success(res, USER_CONSTANTS.USER_FOUND, {
            data: transformedData,
            totalRecords: count,
            totalPages: totalPages,
            currentPage: page,
            pageSize: limit
        });

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.customerEdit = async (req, res) => {
    try {
        const allowedFields = [
            "id", 'name', 'GSTNo', 'panNo', 'dealItem', 'avgShipmentWeight', 'monthlyShipping',
            'companyAddressLine1', 'companyAddressLine2', 'companyAddressPincode',
            'companyAddressState', 'companyAddressCity', 'companyAddressCountry',
            'companyDescription', 'billingAddressLine1', 'billingAddressLine2',
            'billingAddressPincode', 'billingAddressCity', 'billingAddressState', 'billingAddressCountry'
        ];
        const validate = new Validator(req.body, {
            id: "required",
            name: 'sometimes',
            GSTNo: 'sometimes',
            monthlyShipping: 'sometimes',
            panNo: 'sometimes',
            dealItem: 'sometimes',
            avgShipmentWeight: 'sometimes',
            companyAddressLine1: 'sometimes|maxLength:254',
            // companyAddressLine2: 'sometimes|maxLength:254',
            companyAddressPincode: 'sometimes',
            companyAddressState: 'sometimes',
            companyAddressCity: 'sometimes',
            companyAddressCountry: 'sometimes',
            companyDescription: 'sometimes|maxLength:1800',
            billingAddressLine1: 'sometimes',
            // billingAddressLine2: 'sometimes',
            billingAddressPincode: 'sometimes',
            billingAddressCity: 'sometimes',
            billingAddressCountry: 'sometimes'

        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }
        const id = req.body.id;
        const extraFields = Object.keys(req.body).filter(key => !allowedFields.includes(key));

        if (extraFields.length > 0) {
            return res.status(400).json({
                error: `The following fields are not allowed: ${extraFields.join(', ')}`
            });
        }

        const [affectedRows] = await User.update(req.body, { where: { id, isUser: true } });

        if (affectedRows === 0) {
            return failed(res, USER_CONSTANTS.USER_UPDATED_ERROR);
        }

        // Return success response
        return success(res, USER_CONSTANTS.USER_UPDATED);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.customerInactive = async (req, res) => {
    try {
        const validate = new Validator(req.query, {
            status: 'required|boolean',
            id: 'required'
        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }
        let { id, status } = req.query;
        status = status

        const vendor = await User.findOne({ where: { id, isUser: true } });
        if (!vendor)
            return failed(res, USER_CONSTANTS.USER_NOT_FOUND);

        await vendor.update({ isActive: status });

        return success(res, ADMIN_CONSTANTS.DATA_UPDATED);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.customerBlock = async (req, res) => {
    try {
        const validate = new Validator(req.query, {
            isBlocked: 'required|boolean',
            id: 'required'
        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }

        const user = await User.findOne({ where: { id: req.query.id, isUser: true } });
        if (!user)
            return failed(res, USER_CONSTANTS.USER_NOT_FOUND);

        let isBlocked = user.isBlocked ? 0 : 1

        await user.update({ isBlocked: isBlocked }, {
            where: {
                id: req.query.id
            }
        });

        return success(res, ADMIN_CONSTANTS.DATA_UPDATED);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.customerDelete = async (req, res) => {
    try {

        let id = req.params.id;

        const user = await User.findOne({ where: { id, isUser: true } });
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
};

exports.getKycUser = async (req, res) => {
    try {
        const id = req.params.id;

        const kycData = await kyc.findOne({ where: { userId: id } }, { attributes: ['id', 'businessType', 'document1Type', 'document2Type', 'document1FrontSide', 'document2FrontSide', 'document1BackSide', 'document2BackSide', 'customerName', 'GSTNo', 'tanNo', 'isApproved', 'createdAt', 'updatedAt'] });

        // if (!kycData)
        //     return failed(res, KYC_CONSTANTS.KYC_NOT_FOUND);

        return success(res, KYC_CONSTANTS.KYC_FETCH, kycData);
    } catch (error) {
        console.error({ error });
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.getKycApprove = async (req, res) => {
    try {
        const { id, status } = req.query;

        const validate = new Validator({ id, status }, {
            id: "required",
            status: "required|in:0,2"
        });

        const matched = await validate.check();
        if (!matched) {
            return res.status(400).json({ errors: validate });
        }

        const kycData = await kyc.findOne({
            where: { userId: id },
            attributes: [
                'id', 'businessType', 'document1Type', 'document2Type',
                'document1FrontSide', 'document2FrontSide', 'document1BackSide',
                'document2BackSide', 'customerName', 'GSTNo', 'tanNo',
                'isApproved', 'createdAt', 'updatedAt'
            ]
        });

        if (!kycData) {
            return failed(res, KYC_CONSTANTS.KYC_NOT_FOUND);
        }

        if (kycData.isApproved === 2) {
            return success(res, KYC_CONSTANTS.KYC_APPROVED_ALREADY);
        }

        await kycData.update({ isApproved: status });

        const data = status === '2' ? KYC_CONSTANTS.KYC_APPROVED : KYC_CONSTANTS.KYC_REJECTED;

        return success(res, data);
    } catch (error) {
        console.error({ error });
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.customerChangePassword = async (req, res) => {
    try {
        // Validate request body
        const validate = new Validator(req.body, {
            id: 'required',
            oldPassword: 'required',
            password: 'required|different:oldPassword',
            confirmPassword: 'required|same:password'
        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }
        const id = req.body.id;

        // Check if user already exists
        const user = await User.findOne({ where: { id, isUser: true } });

        if (!user)
            return failed(res, ADMIN_CONSTANTS.NOT_FOUND)

        const validPassword = await bcrypt.compare(req.body.oldPassword, user.password);

        if (!validPassword)
            return failed(res, USER_CONSTANTS.INVALID_CREDENTIALS);

        const updatedPassword = await bcrypt.hash(req.body.password, parseInt(process.env.BCRYPTSALT, 10));

        await user.update({ password: updatedPassword });

        // Return success response
        return success(res, AUTH_CONSTANTS.PASSWORD_CHANGE_SUCCESS);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.mvikasAccount = async (req, res) => {
    try {
        // const allowedFields = ['userId', 'creditLimit', 'billingType', 'billingCycle', 'paymentCycle', 'availableAmount', 'paymentDay', 'billingDay', 'markup'];

        // const extraFields = Object.keys(req.body).filter(key => !allowedFields.includes(key));
        // if (extraFields.length > 0) {
        //     return res.status(400).json({
        //         code: '400',
        //         message: `Extra fields are not allowed: ${extraFields.join(', ')}`
        //     });
        // }

        const validate = new Validator(req.body, {
            userId: 'required',
            billingType: 'required|in:prepaid,postpaid',
            billingCycle: 'sometimes|string',
            paymentDay: 'sometimes|integer',
            billingDay: 'sometimes|integer',
            creditLimit: 'sometimes|numeric',
            markup: 'sometimes|numeric',
            paymentCycle: 'sometimes|string',
            availableAmount: 'nullable|numeric'
        });

        const matched = await validate.check();
        if (!matched) return validateFail(res, validate);

        const { userId, billingType } = req.body;
        if (req.body.markup && parseFloat(req.body.markup) < 0) {
            return response(res, 422, 'Markup must be zero or greater tahn zero')
        }
        const existingUser = await User.findByPk(userId);
        if (!existingUser) {
            return failed(res, USER_CONSTANTS.USER_NOT_FOUND);
        }

        const existingAccount = await Account.findOne({ where: { userId } });
        // if (req.body.availableAmount) {
        //     req.body.availableAmount = parseFloat(req.body.creditLimit) - parseFloat(req.body.availableAmount)
        // } else {
        //     req.body.availableAmount = req.body.creditLimit
        // }
        req.body.availableAmount = req.body.creditLimit

        if (!existingAccount) {
            const createdAccount = await Account.create(req.body);
            await User.update({ billingType }, { where: { id: userId } });
            return success(res, USER_CONSTANTS.ACCOUNT_UPDATE_SUCCESS, createdAccount);
        } else {
            await existingAccount.update(req.body);
            return success(res, USER_CONSTANTS.ACCOUNT_UPDATE_SUCCESS);
        }
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};


exports.getMvikasAccount = async (req, res) => {
    try {
        const id = req.params.id;
        const data = await Account.findOne({ where: { userId: id }, attributes: ['id', 'billingType', 'creditLimit', 'billingCycle', 'paymentCycle', 'billingDay', 'billingDay', 'paymentCycle', 'paymentDay', 'userId', 'remark', 'availableAmount', 'createdAt', 'updatedAt', 'markup'] });
        // Return success response
        return success(res, USER_CONSTANTS.ACCOUNT_FETCH_SUCCESS, data);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.getVendors = async (req, res) => {
    try {
        const userId = req.params.userId;
        const data = await User.findAll({
            where: { isVendor: true, isActive: true },
            attributes: ['id', 'name'],
            include: [
                {
                    model: Associate,
                    as: 'AssciateVendor',
                    attributes: ['id'],
                    where: {
                        userId: userId,
                    },
                    required: false,
                },
            ]
        });

        //   data.forEach((item) => {
        //     item.dataValues.assigned = item.AssciateVendor && item.AssciateVendor.id ? true : false;
        //     delete item.dataValues.AssciateVendor;
        //   });

        return success(res, USER_CONSTANTS.KAM_FETCHED, data);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.updateAssociateVendor = async (req, res) => {
    try {
        // Validate request data
        const validate = new Validator(req.body, {
            userId: 'required',
            vendorId: 'required|array'
        });

        const matched = await validate.check();
        if (!matched) return validateFail(res, validate);

        const { userId, vendorId } = req.body;
        await Associate.destroy({
            where: {
                userId: userId
            }
        })
        if (vendorId.length > 0) {
            const newAssociations = vendorId.map(vendorId => ({
                vendorId,
                userId
            }));
            await Associate.bulkCreate(newAssociations);
        }

        return success(res, USER_CONSTANTS.VENDOR_ASSIGNED);

        // Fetch existing associations for the user
        const existingAssociations = await Associate.findAll({ where: { userId } });

        // Identify vendor IDs that need to be removed
        const deleteData = existingAssociations.filter(association => !vendorId.includes(association.vendorId));

        // Identify new vendor IDs that need to be added
        const newData = vendorId.filter(vendorId => !existingAssociations.some(association => association.vendorId === vendorId));

        // If there are vendor associations to be deleted, process the deletion
        if (deleteData.length > 0) {
            await Associate.destroy({
                where: {
                    userId,
                    vendorId: deleteData.map(association => association.vendorId)
                },
                individualHooks: true, // Use hooks if necessary
                hooks: true
            });
        }

        // If there are new vendor associations to be added, process the addition
        if (newData.length > 0) {
            const newAssociations = newData.map(vendorId => ({
                vendorId,
                userId
            }));
            await Associate.bulkCreate(newAssociations);
        }

        // Return success response
        return success(res, USER_CONSTANTS.VENDOR_ASSIGNED);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};


exports.exportUserList = async (req, res) => {
    try {
        let { search, days, status, isBlocked, fromDate, toDate } = req.query;
        const whereClause = {};

        if (days) {
            const date = new Date();
            date.setDate(date.getDate() - parseInt(days));
            whereClause.createdAt = { [Op.gte]: date };
        }
        if (fromDate && toDate) {
            fromDate = moment(fromDate).format('YYYY-MM-DD')
            toDate = moment(toDate).format('YYYY-MM-DD')
            whereClause.createdAt = {
                [Op.gte]: fromDate
            }
            whereClause.createdAt = {
                [Op.lte]: toDate
            }
        }

        if (search) {
            // Use Op.or to search in multiple fields
            whereClause[Op.or] = [
                {
                    email: { [Op.like]: `%${search}%` }
                },
                {
                    name: { [Op.like]: `%${search}%` }
                }
            ];
        }

        if (status)
            whereClause.isActive = status;
        if (isBlocked == true) {
            whereClause.isBlocked = true
        }
        if (isBlocked == false) {
            whereClause[Op.or] = [
                {
                    isBlocked: { [Op.eq]: false }
                },
                {
                    isBlocked: { [Op.eq]: null }
                }
            ];
        }

        whereClause.isUser = true;
        const users = await User.findAll({
            where: whereClause,
            attributes: ['id', 'name', 'email', 'mobile', 'isActive', 'GSTNo', 'panNo', 'createdAt'],
            include: [
                {
                    model: kyc,
                    as: 'kycVerification',
                    attributes: ['isApproved']
                },
                {
                    model: Account,
                    as: 'account',
                    attributes: ['billingType']
                },
                {
                    model: AssingUser,
                    as: 'assignedKAM',
                    attributes: ['assignTo'],
                    include: [
                        {
                            model: Admin,
                            as: 'assignedEmail',
                            attributes: ['email']
                        }
                    ]
                }
            ]
        });

        const formattedData = users.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            isActive: user.isActive,
            GSTNo: user.GSTNo,
            panNo: user.panNo,
            createdAt: user.createdAt,
            isApproved: user.kycVerification?.isApproved === 1 ? 'true' : 'false',
            billingType: user.account?.billingType,
            assignedKAM: user.assignedKAM?.assignTo,
            assignedEmail: user.assignedKAM?.assignedEmail?.email
        }));

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('User List');

        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Name', key: 'name', width: 20 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Mobile', key: 'mobile', width: 15 },
            { header: 'Status', key: 'isActive', width: 15 },
            { header: 'GST Number', key: 'GSTNo', width: 20 },
            { header: 'PAN Number', key: 'panNo', width: 20 },
            { header: 'Created At', key: 'createdAt', width: 20 },
            { header: 'KYC Approved', key: 'isApproved', width: 20 },
            { header: 'Billing Type', key: 'billingType', width: 15 },
            { header: 'Assigned KAM Id', key: 'assignedKAM', width: 25 },
            { header: 'Assigned Email', key: 'assignedEmail', width: 30 }
        ];

        worksheet.addRows(formattedData);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=user_list.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};
exports.changeRateType = async (req, res) => {
    try {
        const validate = new Validator(req.body, {
            rateType: 'required|in:1,2,3',
            userId: "required"
        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }
        const userData = await User.findOne({
            where: {
                id: req.body.userId
            }
        });

        if (!userData) {
            return failed(res, USER_CONSTANTS.USER_NOT_FOUND);
        }

        await User.update({ rateType: req.body.rateType }, {
            where: {
                id: req.body.userId
            }
        })
        return success(res, "Rate type updated")
    } catch (error) {
        return failed(res, SYSTEM_FAILURE);

    }
}

