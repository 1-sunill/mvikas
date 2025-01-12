const {
    success,
    failed,
    serverError,
    validateFail,
    response
} = require("../../../../helper/response");

const {
    SYSTEM_FAILURE,
    ORDER_CONSTANTS
} = require('../../../../helper/message');
const db = require("../../../../../models");
const _ = require("lodash");
const StateCharge = db.mvStateCharge;
const moment = require('moment')
const {
    Validator
} = require("node-input-validator");
const {
    fn,
    col,
    Op,
    where,
    literal
} = require("sequelize");
module.exports = {
    getStateCharge: async (req, res) => {
        try {
            let {
                search,
                status = 1,
                page = 1,
                limit = 10,
                fromDate = null,
                toDate = null,
                column = 'status',
                operator = 'equals',
                value,
                sortBy = 'DESC',
                sortByColumn = 'createdAt'
            } = req.query;
            page = parseInt(page);
            limit = parseInt(limit);
            const offset = (page - 1) * limit;
            let params = {
                vendorId: req.decodedData.id
            }
            if (status != null || status != "") {
                params = Object.assign(params, {
                    status: status
                })
            }
            if (fromDate && fromDate != 'null' && toDate == 'null') {
                params = Object.assign(params, {
                    createdAt: {
                        [Op.gte]: fromDate + ' 00:00:00'
                    }
                })
            }
            if (toDate && toDate != 'null' && fromDate == 'null') {
                params = Object.assign(params, {
                    createdAt: {
                        [Op.lte]: toDate + ' 00:00:00'
                    }
                })
            }
            if ((fromDate && fromDate != 'null') && (toDate && toDate != 'null')) {
                params = Object.assign(params, {
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
            if (value) {
                switch (operator) {
                    case 'contains':
                        params[column] = { [Op.like]: `%${value}%` };
                        break;
                    case 'equals':
                        params[column] = { [Op.eq]: value };
                        break;
                    case 'starts with':
                        params[column] = { [Op.like]: `${value}%` };
                        break;
                    case 'ends with':
                        params[column] = { [Op.like]: `%${value}` };
                        break;
                    case 'is empty':
                        params[column] = { [Op.eq]: null };
                        break;
                    case 'is not empty':
                        params[column] = { [Op.ne]: null };
                        break;
                    case 'is any of':
                        params[column] = { [Op.in]: value.split(',') };
                        break;
                    default:
                        params[column] = { [Op.eq]: value };
                }
            }

            if (search) {
                // Use Op.or to search in multiple fields
                params[Op.or] = [
                    {
                        chargeName: { [Op.like]: `%${search}%` }
                    },
                    {
                        stateName: { [Op.like]: `%${search}%` }
                    },
                    {
                        amount: { [Op.like]: `%${search}%` }
                    },
                    {
                        type: { [Op.like]: `%${search}%` }

                    }

                ];
            }
            console.log(params);

            let orders = await StateCharge.findAll({
                where: params,
                limit,
                offset,
                order: [
                    [sortByColumn, sortBy]
                ]
            });
            let count = await StateCharge.count({ where: params })
            let data = {
                list: orders,
                count: count,
                limit: limit
            }
            return success(res, "state wise charge list", data)
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    createOrUpdateOrDeleteStateCharge: async (req, res) => {
        try {
            let requests = req.body
            // Validate the request
            const validate = new Validator(requests, {
                actionType: "required|in:add,update,delete",
                type: "required|in:Inbound,Outbound,Both",
                stateName: "required|string",
                chargeName: "required|string",
                amount: "required|min:0",
            });
            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            if (requests.actionType == 'add') {
                let exist = await StateCharge.findOne({
                    where: {
                        vendorId: req.decodedData.id,
                        stateName: requests.stateName,
                        chargeName: requests.chargeName
                    }
                })
                if (exist)
                    return response(res, 422, "Charge already created")
                await StateCharge.create({
                    vendorId: req.decodedData.id,
                    stateName: requests.stateName,
                    chargeName: requests.chargeName,
                    amount: requests.amount,
                    type: requests.type
                })
                return success(res, "Charge created")
            } else {
                if (!requests.id)
                    return response(res, 422, "Charge id required")
                let exist = await StateCharge.findOne({
                    where: {
                        id: requests.id
                    }
                })
                if (!exist)
                    return response(res, 422, "Charge not found")
                if (requests.actionType == "update") {
                    let exist = await StateCharge.findOne({
                        where: {
                            id: {
                                [Op.ne]: requests.id
                            },
                            vendorId: req.decodedData.id,
                            stateName: requests.stateName,
                            chargeName: requests.chargeName

                        }
                    })
                    if (exist)
                        return response(res, 422, "Charge already exist")
                    await StateCharge.update({
                        stateName: requests.stateName,
                        chargeName: requests.chargeName,
                        amount: requests.amount,
                        type: requests.type
                    }, {
                        where: {
                            id: requests.id
                        }
                    })
                    return success(res, "Charge updated")
                } else {
                    await StateCharge.destroy({ where: { id: requests.id } })
                    return success(res, "Charge deleted")
                }

            }
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    changeStateChargeStatus: async (req, res) => {
        try {
            let requests = req.query
            // Validate the request
            const validate = new Validator(requests, {
                id: "required",
            });
            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            let exist = await StateCharge.findOne({
                where: {
                    id: requests.id
                }
            })
            if (!exist)
                return response(res, 422, "Charge not found")
            await StateCharge.update({ status: exist.status ? 0 : 1 }, { where: { id: requests.id } })
            return success(res, "Charge status changed")
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    }
}