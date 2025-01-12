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
const User = db.mvUser;
const Order = db.mvorder
const OrderReview = db.mvorderReview
const ReviewType = db.mvreviewType
const moment = require('moment')
const ExcelJS = require('exceljs');

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
const {
    aws
} = require('../../../../helper/aws');
const XLSXDownloader = require("../../Service/XLSXDownloader");
module.exports = {
    getReviewList: async (req, res) => {
        try {
            let {
                search,
                isApproved = null,
                page = 1,
                limit = 10,
                fromDate = null,
                toDate = null,
                column = 'OrderRating',
                operator = 'equals',
                value,
                sortBy = 'DESC',
                sortByColumn = 'createdAt'
            } = req.query;
            page = parseInt(page);
            limit = parseInt(limit);
            const offset = (page - 1) * limit;
            let params = {
            }
            if (isApproved) {
                params.isApproved = isApproved
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
            if (search) {
                params = {
                    ...params,
                    [Op.or]: [
                        {
                            "$user.name$": {
                                [Op.substring]: search
                            }
                        },
                        {
                            Orderid: {
                                [Op.substring]: search
                            }
                        },
                        {
                            "$order.Frompincode$": {
                                [Op.substring]: search
                            }
                        },
                        {
                            "$order.Topincode$": {
                                [Op.substring]: search
                            }
                        }

                    ],
                };
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

            let orders = await OrderReview.findAll({
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'mobile']
                },
                {
                    model: Order,
                    as: 'order',
                    attributes: ['id', 'Order_id', 'Frompincode', 'Topincode']
                }
                ],
                where: params,
                limit,
                offset,
                order: [
                    [sortByColumn, sortBy]
                ]
            });
            let count = await OrderReview.count({
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'mobile']
                },
                {
                    model: Order,
                    as: 'order',
                    attributes: ['id', 'Order_id', 'Frompincode', 'Topincode']
                }
                ],
                where: params
            })
            let data = {
                list: orders,
                count: count,
                limit: limit
            }
            return success(res, "review list", data)
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    exportReviewList: async (req, res) => {
        try {
            let {
                search,
                isApproved = null,
                fromDate = null,
                toDate = null,
                column = 'OrderRating',
                operator = 'equals',
                value,
            } = req.query;
            let params = {
            }
            if (isApproved) {
                params.isApproved = isApproved
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
            if (search) {
                params = {
                    ...params,
                    [Op.or]: [
                        {
                            "$user.name$": {
                                [Op.substring]: search
                            }
                        },
                        {
                            Orderid: {
                                [Op.substring]: search
                            }
                        },
                        {
                            "$order.Frompincode$": {
                                [Op.substring]: search
                            }
                        },
                        {
                            "$order.Topincode$": {
                                [Op.substring]: search
                            }
                        }

                    ],
                };
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

            let orders = await OrderReview.findAll({
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'email', 'mobile']

                    },

                    {
                        model: Order,
                        as: 'order',
                        attributes: ['id', 'Order_id', 'Frompincode', 'Topincode'],

                    }, 
                    {
                        model: ReviewType,
                        as: "reviewtype"
                    }],
                where: params
            });
            // return success(res, "m", orders)
            // Define header as a simple array of strings
            let headers = [
                'Order Number',
                'Customer Name',
                'Date & Time',
                'From Pin',
                'To Pin',
                'Rating',
                'Review Type',
                'Description'
            ];

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('order-review');



            // Add headers to the worksheet
            worksheet.columns = headers.map(header => ({ header, key: header }));

            // Add data rows
            orders.forEach(async o => {
                worksheet.addRow({
                    'Order Number': o.order.Order_id,
                    'Customer Name': o.user.name,
                    'Date & Time': moment(o.createdAt).format('YYYY-MM-DD'),
                    'From Pin': o.order.Frompincode,
                    'To Pin': o.order.Topincode,
                    'Rating': o.OrderRating,
                    'Review Type': o.reviewtype.name,
                    'Description': o.ReviewDesc

                });
            });

            // Write the workbook to the response
            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                'attachment; filename=' + 'order-review.xlsx'
            );

            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    updateStatus: async (req, res) => {
        try {
            // Validate the request
            const validate = new Validator(req.query, {
                reviewId: "required",
                isApproved: "required|in:0,1"
            });
            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            let orderReview = await OrderReview.findOne({
                id: req.query.reviewId
            })
            if (!orderReview)
                return response(res, 422, 'Invalid review id')
            await OrderReview.update({
                isApproved: req.query.isApproved
            }, {
                where: {
                    id: req.query.reviewId
                }
            })
            let user = await User.findOne({
                where: {
                    id: orderReview.vendorId
                }
            })
            let rating = user.rating && user.rating > 0 ? ((parseFloat(user.rating) + parseFloat(orderReview.OrderRating)) / 2).toFixed(1) : parseFloat(orderReview.OrderRating)
            await User.update({ rating: rating }, {
                where: {
                    id: orderReview.vendorId
                }
            })
            return success(res, 'Status changed')
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    deleteReview: async (req, res) => {
        try {
            // Validate the request
            const validate = new Validator(req.body, {
                reviewId: "required",
            });
            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            let orderReview = await OrderReview.findOne({
                id: req.body.reviewId
            })
            if (!orderReview)
                return response(res, 422, 'Invalid review id')
            await OrderReview.update({
                deletedAt: new Date()
            }, {
                where: {
                    id: req.body.reviewId
                }
            })
            return success(res, 'Review deleted')
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    }
}
