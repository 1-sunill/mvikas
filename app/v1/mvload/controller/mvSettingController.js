const {
    success,
    failed,
    serverError,
    validateFail,
} = require("../../../helper/response");

const { PICUPSLOT_CONSTANTS, DELIVERY_CONSTANTS, SYSTEM_FAILURE, RULE_CONSTANTS } = require('../../../helper/message');
const db = require("../../../../models");
const _ = require("lodash");
const Setting = db.mvVendorSetting; // Ensure this matches your model definition
const { Validator } = require("node-input-validator");
const { fn, col, Op, where, literal } = require("sequelize");

//rulesControllers
exports.createSetting = async (req, res) => {
    try {

        const {name, value} = req.body;
        const validate = new Validator(req.body, {
            name: 'required|in:rule,deliverySlot,picupSlot',
            value: 'required'
        });
        
        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }
        
        const addedRule = await Setting.create({
        name: name,
        userId: req.decodedData.id,
        value,
        isActive: true,
        });

    const addedData = _.pick(addedRule, ['id', 'name', 'value', 'isActive', 'createdAt']);


    if (name === 'picupSlot')
    return success(res, PICUPSLOT_CONSTANTS.PICUPSLOT_ADD_SUCCESS, addedData);    

    if (name === 'deliverySlot')
    return success(res, DELIVERY_CONSTANTS.DELIVERY_ADD_SUCCESS, addedData); 

    return success(res, RULE_CONSTANTS.RULE_ADD_SUCCESS, addedData);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.getSetting = async (req, res) => {
    try {
        const {name, value} = req.query;
        const validate = new Validator(req.query, {
            name: 'required|in:rule,deliverySlot,picupSlot',
        });
        
        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }
        const rule = await Setting.findAll({
            where: { userId: req.decodedData.id, deletedAt: false||null, name: req.query.name },
            attributes: ['id', 'name', 'value', 'isActive', 'createdAt']
        });

        if(!rule)
        return failed(res, RULE_CONSTANTS.No_DATA_FOUND);

        if (name === 'picupSlot')
        return success(res, PICUPSLOT_CONSTANTS.PICUPSLOT_FETCH_SUCCESS, rule);    
        
        if (name === 'deliverySlot')
        return success(res, DELIVERY_CONSTANTS.DELIVERY_FETCH_SUCCESS, rule); 

        // Return success response with the found data
         success(res, RULE_CONSTANTS.RULE_FETCH_SUCCESS, rule);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.updateSetting = async (req, res) => { 
    try {
        const {name, id, value} = req.body;
        const validate = new Validator(req.body, {
            id: "required",
            name: "required|in:rule,deliverySlot,picupSlot",
            value: "required",
        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }

        const updatedData= await Setting.update( { name, value,},{where: { id, name }});

        if (updatedData == 0) 
        return failed(res, RULE_CONSTANTS.No_DATA_FOUND);
        

        if (name === 'picupSlot')
        return success(res, PICUPSLOT_CONSTANTS.PICUPSLOT_UPDATE_SUCCESS);    
            
        if (name === 'deliverySlot')
        return success(res, DELIVERY_CONSTANTS.DELIVERY_UPDATE_SUCCESS); 

        // Return success response with the found data
        return success(res, RULE_CONSTANTS.RULE_UPDATE_SUCCESS);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.deleteSetting = async (req, res) => {
    try {
        // Validate the request
        const {id, name}=req.query
        const validate = new Validator(req.query, {
            id: "required",
            name: "required|in:rule,deliverySlot,picupSlot",
        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }

        let deletedData = await Setting.destroy(
            {
                individualHooks: true, // Use individual hooks for the destroy operation
                hooks: true, // Enable global hooks
                returning: false, // Do not return the deleted retailer object
                where: { id , name }, // Additional where clause to ensure specific user deletion
              }
        );

        if (!deletedData) {
            return failed(res, RULE_CONSTANTS.No_DATA_FOUND);
        }

        if (name === 'picupSlot')
        return success(res, PICUPSLOT_CONSTANTS.PICUPSLOT_DELETED_SUCCESS);    
                
        if (name === 'deliverySlot')
        return success(res, DELIVERY_CONSTANTS.DELIVERY_DELETED_SUCCESS); 
    

        // Return success response with the found data
        return success(res, RULE_CONSTANTS.RULE_DELETED_SUCCESS);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};