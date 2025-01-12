const {
    success,
    failed,
    serverError,
    validateFail,
} = require("../../../helper/response");

const { CARGORATE_CONSTANTS} = require('../../../helper/message');
const db = require("../../../../models");
const { v4: uuidv4 } = require('uuid');
const _ = require("lodash");
const Charges = db.mvAdditionalCharges;
const { Validator } = require("node-input-validator");
const { fn, col, Op, where, literal } = require("sequelize");
const ExcelJS = require('exceljs');

exports.createCharges = async (req, res) => {
    try {
        const validate = new Validator(req.body, {
            rateSheetId:"required|integer",
            from: "required|decimal",
            to: "required|decimal",
            unit: "required|in:kg",
            rate: "required|decimal",
        });
        
        const allowedFields = ['from', 'to', 'unit', 'rate', 'rateSheetId'];
        
        const extraFields = Object.keys(req.body).filter(key => !allowedFields.includes(key));
        
        if (extraFields.length > 0) {
            return res.status(400).json({
                message: `Extra fields are not allowed: ${extraFields.join(', ')}`,
            });
        }
        
        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }

        await Charges.create(req.body);
        

        

        return success(res, CARGORATE_CONSTANTS.ADDITIONAL_CHARGERS_ADD_SUCCESS);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};


