const {
    success,
    failed,
    serverError,
    validateFail,
} = require("../../../helper/response");

const { USER_CONSTANTS, EMAIL_CONSTANTS, AUTH_CONSTANTS, SYSTEM_FAILURE, PINCODE_CONSTANTS, SERVICE_CONSTANTS } = require('../../../helper/message');
const db = require("../../../../models/");
const _ = require("lodash");
const Service = db.mvService;
const Associate = db.mvAssociateVendors;
const User = db.mvUser;
const { Validator } = require("node-input-validator");
const { fn, col, Op, where, literal } = require("sequelize");


exports.createService = async (req, res) => {
    try {

        const { name, serviceType } = req.body;
        const validate = new Validator(req.body, {
            name: "required",
            serviceType: "required|in:surface,air,water"
        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }

        const service = await Service.findOne({ where: { userId: req.decodedData.id, name } });

        if (service)
            return failed(res, SERVICE_CONSTANTS.ALRADY_EXIST_SERVICE);

        const addedService = await Service.create({
            name: name,
            userId: req.decodedData.id,
            serviceType: serviceType,
            isActive: true
        });

        const addedData = _.pick(addedService, ['id', 'name', 'userId', 'serviceType', 'isUser', 'isActive', 'createdAt']);

        return success(res, SERVICE_CONSTANTS.SERVICE_ADD_SUCCESS, addedData);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.getService = async (req, res) => {
    try {
        const service = await Service.findAll({
            where: { userId: req.decodedData.id, deletedAt: false || null },
            attributes: ['id', 'name', 'userId', 'serviceType', 'createdAt'],
            order: [['createdAt', 'DESC']]
        });

        if (!service)
            return failed(res, SERVICE_CONSTANTS.No_DATA_FOUND);

        // Return success response with the found data
        return success(res, SERVICE_CONSTANTS.SERVICE_ADD_SUCCESS, service);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.updateService = async (req, res) => {
    try {
        const { name, serviceType } = req.body;
        const validate = new Validator(req.body, {
            serviceId: "required",
            name: "required",
            serviceType: "required|in:surface,air,water"
        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }

        const [updatedRows, updatedServices] = await Service.update(
            {
                name,
                serviceType,
            },
            {
                where: { id: req.body.serviceId },
                returning: true // This option returns the updated record
            }
        );

        if (updatedRows === 0) {
            return failed(res, SERVICE_CONSTANTS.No_DATA_FOUND);
        }

        // Return success response with the found data
        return success(res, SERVICE_CONSTANTS.SERVICE_UPDATE_SUCCESS);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.deleteService = async (req, res) => {
    try {
        // Validate the request
        const validate = new Validator(req.params, {
            id: "required"
        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }

        let deletedData = await Service.destroy(
            {
                individualHooks: true, // Use individual hooks for the destroy operation
                hooks: true, // Enable global hooks
                returning: false, // Do not return the deleted retailer object
                where: { id: req.params.id }, // Additional where clause to ensure specific user deletion
            }
        );

        if (!deletedData) {
            return failed(res, SERVICE_CONSTANTS.No_DATA_FOUND);
        }

        // Return success response with the found data
        return success(res, SERVICE_CONSTANTS.SERVICE_DELETED_SUCCESS);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.getLp = async (req, res) => {
    try {
        const service = await Associate.findAll({
            where: { userId: req.decodedData.id },
            include: [
                {
                    model: User,
                    as: "lpData",
                    attributes: ["id", "name"],
                },
            ],
        });

        if (!service.length)
            return failed(res, SERVICE_CONSTANTS.No_DATA_FOUND);

        return success(res, SERVICE_CONSTANTS.SERVICE_ADD_SUCCESS, service);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};
