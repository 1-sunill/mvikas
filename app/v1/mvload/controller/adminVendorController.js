const {
    success,
    failed,
    serverError,
    validateFail,
} = require("../../../helper/response");
const { USER_CONSTANTS, AUTH_CONSTANTS, SYSTEM_FAILURE, ADMIN_CONSTANTS } = require('../../../helper/message');
const db = require("../../../../models");
const bcrypt = require('bcryptjs');
const _ = require("lodash");
const User = db.mvUser;
const Account = db.mvAccountDetails;
const { Validator } = require("node-input-validator");
const jwt = require("jsonwebtoken");
const { aws } = require('../../../helper/aws');
const { fn, col, Op, where, literal } = require("sequelize");
const ExcelJS = require('exceljs');
const moment = require('moment')

exports.vendorList = async (req, res) => {
    try {
        let { search, days, status, page = 1, pageSize = 10, fromDate, toDate } = req.query;
        page = parseInt(page);
        pageSize = parseInt(pageSize);

        // Validate page and pageSize
        if (isNaN(page) || page < 1) page = 1;
        if (isNaN(pageSize) || pageSize < 1) pageSize = 10;

        const whereClause = {};

        if (days) {
            const date = new Date();
            date.setDate(date.getDate() - parseInt(days));
            whereClause.createdAt = {
                [Op.gte]: date
            };
        }

        if (search) {
            whereClause[Op.or] = [
                { email: { [Op.like]: `%${search}%` } },
                { name: { [Op.like]: `%${search}%` } }
            ];
        }

        if (status)
            whereClause.isActive = status;
        if (!days && fromDate && toDate) {
            fromDate = moment(fromDate).format('YYYY-MM-DD')
            toDate = moment(fromDate).format('YYYY-MM-DD')
            whereClause.createdAt = {
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
            }
        }

        whereClause.isVendor = true;

        const limit = pageSize;
        const offset = (page - 1) * limit;

        const { count, rows } = await User.findAndCountAll({
            where: whereClause,
            attributes: [
                'id', 'name', 'email', 'mobile', 'isUser', 'isVendor', 'isDummy', 'isActive',
                'GSTNo', 'panNo', 'createdAt', 'updatedAt', 'isBlocked','rateType'
            ],
            limit: limit,
            offset: offset
        });

        const totalPages = Math.ceil(count / limit);

        if (req.params.id) {
            let data = await User.findOne({
                where: { id: req.params.id },
                attributes: [
                    'id', 'name', 'email', 'mobile', 'isUser', 'isVendor', 'isActive',
                    'GSTNo', 'panNo', 'createdAt', 'updatedAt', 'secondEmail',
                    'dealItem', 'avgShipmentWeight', 'companyAddressLine1',
                    'companyAddressLine2', 'companyAddressState', 'companyAddressPincode',
                    'companyAddressCity', 'companyAddressCountry', 'companyDescription',
                    'billingAddressLine1', 'billingAddressLine2', 'billingAddressPincode',
                    'billingAddressState', 'billingAddressCity', 'billingAddressCountry',
                    'isBlocked', 'monthlyShipping', 'noOfShipment', 'isDummy', 'image','rateType'
                ],
                include: [
                    {
                        model: Account,
                        as: 'account',
                        attributes: [
                            'userId', 'billingType', 'creditLimit', 'billingCycle',
                            'billingDay', 'paymentCycle', 'paymentDay', 'remark',
                            'availableAmount', 'createdAt', 'updatedAt', 'markup'
                        ]
                    }
                ]
            });
            if (!data) return failed(res, USER_CONSTANTS.USER_NOT_FOUND);

            return success(res, USER_CONSTANTS.USER_FOUND, data);
        }


        return success(res, USER_CONSTANTS.USER_FOUND, {
            data: rows,
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



exports.vendorEdit = async (req, res) => {
    try {
        const allowedFields = [
            'id', 'name', 'GSTNo', 'email', 'mobile', 'panNo', 'dealItem', 'avgShipmentWeight', 'secondEmail',
            'companyAddressLine1', 'companyAddressLine2', 'companyAddressPincode',
            'companyAddressState', 'companyAddressCity', 'companyAddressCountry',
            'companyDescription', 'billingAddressLine1', 'billingAddressLine2', 'image', 'isDummy',
            'billingAddressPincode', 'billingAddressCity', 'billingAddressState', 'billingAddressCountry', 'markup'
        ];
        const validate = new Validator(req.body, {
            id: 'required',
            secondEmail: 'sometimes',
            name: 'sometimes',
            GSTNo: 'sometimes',
            mobile: 'sometimes',
            email: 'sometimes',
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
            billingAddressCountry: 'sometimes',
            isDummy: 'required',
            image: 'sometimes',
            markup: 'required'

        });
        const id = req.body.id;

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }

        const extraFields = Object.keys(req.body).filter(key => !allowedFields.includes(key));

        if (extraFields.length > 0) {
            return res.status(400).json({
                error: `The following fields are not allowed: ${extraFields.join(', ')}`
            });
        }

        let updatedData = { ...req.body };

        const isDummy = req.body.isDummy;
        updatedData.isDummy = isDummy;

        if (req.files && req.files.image) {
            const image = await aws(req.files.image, 'document');
            updatedData.image = image.Location;
        } else {
            delete updatedData.image
        }
        let markup = req.body.markup

        const [affectedRows] = await User.update(updatedData, { where: { id, isVendor: true } });

        const [affectedacc] = await Account.update({ markup }, { where: { userId: id } });

        if (affectedRows === 0 || affectedacc === 0)
            return failed(res, USER_CONSTANTS.USER_UPDATED_ERROR);


        // Return success response
        return success(res, USER_CONSTANTS.USER_UPDATED);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

//dummy vendor
exports.makeItDummy = async (req, res) => {
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

        const vendor = await User.findOne({ where: { id, isVendor: true } });
        if (!vendor)
            return failed(res, USER_CONSTANTS.USER_NOT_FOUND);

        await vendor.update({ isDummy: status });

        return success(res, ADMIN_CONSTANTS.DATA_UPDATED);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};


exports.vendorInactive = async (req, res) => {
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

        const vendor = await User.findOne({ where: { id, isVendor: true } });
        if (!vendor)
            return failed(res, USER_CONSTANTS.USER_NOT_FOUND);

        await vendor.update({ isActive: status });

        return success(res, ADMIN_CONSTANTS.DATA_UPDATED);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};


exports.vendorDelete = async (req, res) => {
    try {

        const id = req.params.id;

        const vendor = await User.findOne({ where: { id, isVendor: true } });
        if (!vendor)
            return failed(res, USER_CONSTANTS.USER_NOT_FOUND);

        await User.destroy(
            {
                individualHooks: true, // Use individual hooks for the destroy operation
                hooks: true, // Enable global hooks
                returning: false, // Do not return the deleted retailer object
                where: { id }, // Additional where clause to ensure specific user deletion
            }
        );


        return success(res, ADMIN_CONSTANTS.VENDOR_DELETE_SUCCESS);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.vendorBlock = async (req, res) => {
    try {
        const validate = new Validator(req.query, {
            isBlocked: 'required|boolean',
            id: 'required'
        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }


        const vendor = await User.findOne({ where: {  id: req.query.id, isVendor: true } });
        if (!vendor)
            return failed(res, USER_CONSTANTS.USER_NOT_FOUND);
        let isBlocked = vendor.isBlocked ? 0 : 1

        await User.update({ isBlocked: isBlocked }, {
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


exports.vendorPasswordChange = async (req, res) => {
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
        const user = await User.findOne({ where: { id, isVendor: true } });

        if (!user)
            return failed(res, ADMIN_CONSTANTS.NOT_FOUND)


        const validPassword = await bcrypt.compare(req.body.oldPassword, user.password);

        if (!validPassword)
            return failed(res, USER_CONSTANTS.INVALID_CURRENT_PASSWORD);

        const updatedPassword = await bcrypt.hash(req.body.password, parseInt(process.env.BCRYPTSALT, 10));

        await user.update({ password: updatedPassword });

        // Return success response
        return success(res, AUTH_CONSTANTS.PASSWORD_CHANGE_SUCCESS);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};


exports.exportVendorList = async (req, res) => {
    try {
        let { search, days, status, fromDate, toDate } = req.query;
        page = parseInt(page);
        pageSize = parseInt(pageSize);

        // Validate page and pageSize
        if (isNaN(page) || page < 1) page = 1;
        if (isNaN(pageSize) || pageSize < 1) pageSize = 10;

        const whereClause = {};

        if (days) {
            const date = new Date();
            date.setDate(date.getDate() - parseInt(days));
            whereClause.createdAt = {
                [Op.gte]: date
            };
        }

        if (search) {
            whereClause[Op.or] = [
                { email: { [Op.like]: `%${search}%` } },
                { name: { [Op.like]: `%${search}%` } }
            ];
        }

        if (status)
            whereClause.isActive = status;
        if (fromDate && toDate) {
            fromDate = moment(fromDate).format('YYYY-MM-DD')
            toDate = moment(fromDate).format('YYYY-MM-DD')
            whereClause.createdAt = {
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
            }
        }

        whereClause.isVendor = true;
        const data = await User.findAll({
            where: whereClause,
            attributes: ['id', 'name', 'email', 'mobile', 'isDummy', 'isActive', 'GSTNo', 'panNo', 'createdAt', 'updatedAt'],
        });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Vendor List');

        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Mobile', key: 'mobile', width: 15 },
            { header: 'Is Dummy', key: 'isDummy', width: 10 },
            { header: 'Active', key: 'isActive', width: 10 },
            { header: 'GST No', key: 'GSTNo', width: 20 },
            { header: 'PAN No', key: 'panNo', width: 20 },
            { header: 'Created At', key: 'createdAt', width: 20 },
            { header: 'Updated At', key: 'updatedAt', width: 20 },
        ];

        data.forEach(user => {
            worksheet.addRow(user.toJSON());
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=vendor_list.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};




