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
const Service = db.mvService;
const Associate = db.mvAssociateVendors;
const User = db.mvUser;
const Pincode = db.mvPincode
const ZonePinMap = db.mvZonePinMap
const ZoneServiceMap = db.mvZoneServiceMap
const VendorRate = db.mvVendorRates
const Order = db.mvorder
const OrderItemDimension = db.mvOrderDimension
const OrderItem = db.mvOrderItem
const OrderItemStatus = db.mvOrderedItemStatus
const OrderedItemsStatus = db.mvOrderedItemStatus
const OrderStatusType = db.mvOrderStatusType
const moment = require('moment')
const fs = require("fs");
const pdf = require("html-pdf-node");
const ejs = require("ejs");
const { uploadPdfToS3 } = require("../../../../helper/aws");
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
const numberToword = require('../../../../helper/numberToWord')
const XLSXDownloader = require("../../Service/XLSXDownloader");

module.exports = {
    getInvoiceList: async (req, res) => {
        try {
            let {
                search,
                status,
                page = 1,
                limit = 10,
                fromDate = null,
                toDate = null,
                column = 'Order_id',
                operator = 'equals',
                value,
                sortBy = 'DESC',
                sortByColumn = 'createdAt'
            } = req.query;
            page = parseInt(page);
            limit = parseInt(limit);
            const offset = (page - 1) * limit;
            let params = {
                paymentStatus: {
                    [Op.ne]: 'Initiated'
                },
                userId: req.decodedData.id
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
            if (status) {
                if (status == 'Pending') {
                    params = Object.assign(params, {
                        paymentMode: {
                            [Op.eq]: "Paylater"
                        }
                    })

                } else {
                    params = Object.assign(params, {
                        paymentMode: {
                            [Op.or]: [{
                                [Op.eq]: "Wallet"
                            }, {
                                [Op.eq]: "Online"
                            }]
                        }
                    })
                }
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
                        Customername: { [Op.like]: `%${search}%` }
                    },
                    {
                        iteminvoice: { [Op.like]: `%${search}%` }
                    },
                    {
                        Order_id: { [Op.like]: `%${search}%` }
                    },
                    {
                        invoiceNumber: { [Op.like]: `%${search}%` }

                    }

                ];
            }
            let orders = await Order.findAll({
                where: params,
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'mobile']
                }, {
                    model: User,
                    as: 'vendor',
                    attributes: ['id', 'name', 'email', 'mobile']
                },
                {
                    model: User,
                    as: 'vendorold',
                    attributes: ['id', 'name', 'email', 'mobile']
                }],
                limit,
                offset,
                order: [
                    [sortByColumn, sortBy]
                ]
            });
            let count = await Order.count({ where: params })
            let data = {
                list: orders,
                count: count,
                limit: limit
            }
            return success(res, "Invoice list", data)
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    exportInvoice: async (req, res) => {
        try {
            let {
                search,
                status,
                fromDate = null,
                toDate = null,
                column = 'Order_id',
                operator = 'equals',
                value,
                sortBy = 'DESC',
                sortByColumn = 'createdAt'
            } = req.query;
            let params = {
                paymentStatus: {
                    [Op.ne]: 'Initiated'
                },
                userId: req.decodedData.id
            }
            if (fromDate && toDate) {
                fromDate = moment(fromDate).format('YYYY-MM-DD')
                toDate = moment(toDate).format('YYYY-MM-DD')
                params.createdAt = {
                    [Op.gte]: fromDate
                }
                params.createdAt = {
                    [Op.lte]: toDate
                }
            }
            if (fromDate) {
                fromDate = moment(fromDate).format('YYYY-MM-DD')
                params.createdAt = {
                    [Op.gte]: fromDate
                }
            }
            if (toDate) {
                toDate = moment(toDate).format('YYYY-MM-DD')
                params.createdAt = {
                    [Op.lte]: toDate
                }
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
                        iteminvoice: { [Op.like]: `%${search}%` }
                    },
                    {
                        Order_id: { [Op.like]: `%${search}%` }
                    },
                    {
                        invoiceNumber: { [Op.like]: `%${search}%` }

                    }

                ];
            }
            let order = await Order.findAll({
                where: params,
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'mobile']
                }, {
                    model: User,
                    as: 'vendor',
                    attributes: ['id', 'name', 'email', 'mobile']
                },
                {
                    model: User,
                    as: 'vendorold',
                    attributes: ['id', 'name', 'email', 'mobile']
                }],
            });

            // Define header as a simple array of strings
            let headers = [
                'Invoice Number', 'Invoice Date', 'Service From', 'Payment To', 'Taxable Amount', 'GST', 'Total Amount'
            ];

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('invoice');



            // Add headers to the worksheet
            worksheet.columns = headers.map(header => ({ header, key: header }));

            // Add data rows
            order.forEach(o => {
                worksheet.addRow({
                    'Invoice Number': o.invoiceNumber,
                    'Invoice Date': moment(o.createdAt).format('YYYY-MM-DD'),
                    'Service From': o.vendor.name,
                    'Payment To': "M-Vikash",
                    'Taxable Amount': parseFloat(o.taxableAmount).toFixed(2),
                    'GST': o.gst,
                    'Total Amount': o.totalAmount
                });
            });

            // Write the workbook to the response
            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                'attachment; filename=' + 'invoice.xlsx'
            );

            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    invoiceDownload: async (req, res) => {
        try {
            // Validate the request
            const validate = new Validator(req.query, {
                orderId: "required"
            });

            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            let order = await Order.findOne({ where: { id: req.query.orderId } })
            if (!order)
                return response(res, 422, "No data found")
            let items = await OrderItem.count({
                where: {
                    Orderid: order.Order_id
                }
            })
            let user = await User.findOne({
                where: {
                    id: order.userId
                }
            })
            let masterDocketURL = ""

            let htmlContent;
            try {
                htmlContent = fs.readFileSync("views/mvload/saleorderinvoice.ejs", "utf-8");
            } catch (err) {
                console.error("Error reading EJS template file:", err);
                return response(res, 422, "Something went wrong")

            }
            const dynamicData = {
                customerName: order.Customername,
                customerGST: user.GSTNo ? user.GSTNo : 'N/A',
                invoiceDate: moment(order.createdAt).format("YYYY-MM-DD"),
                invoiceNumber: order.invoiceNumber,
                billingAddress: user.billingAddressLine1 && user.billingAddressLine2 ? `${user.billingAddressLine1}, ${user.billingAddressLine2}, ${user.billingAddressCity}, ${user.billingAddressState}, ${user.billingAddressCountry}, ${user.billingAddressPincode}` : "N/A",
                pickupAddress: order.Pickupaddress,
                shippingAddress: order.deliveryaddress,
                itemName: order.Itemname,
                quantity: items,
                rate: order.rate,
                taxableAmount: order.taxableAmount,
                gstAmount: order.gst_Amount,
                gst: order.gst,
                totalAmount: order.totalAmount,
                totalAmountInWord: await numberToword.numberToWords(parseFloat(order.totalAmount)),
                bankName: "",
                IFSC: "",
                accountNumber: "",
                specialCharge: order.specialCharge
            };

            const compiledHtml = ejs.render(htmlContent, dynamicData);
            const options = { format: "A4" };

            // Generate PDF
            try {
                const pdfBuffer = await pdf.generatePdf(
                    { content: compiledHtml },
                    options
                );

                // Upload PDF to S3
                const pdfFile = await uploadPdfToS3(pdfBuffer, "pdf", `invoice_${order.Order_id}`);
                masterDocketURL = pdfFile.url
                // Respond with the S3 URL of the uploaded PDF
                // await Order.update({ masterDocketURL: masterDocketURL }, {
                //     where: {
                //         id: order.id
                //     }
                // })

            } catch (error) {
                console.error("PDF generation or S3 upload failed:", error);
                return serverError(res, SYSTEM_FAILURE);
            }


            return success(res, "Success", { url: masterDocketURL });

        } catch (error) {
            console.log("error---------------", error)
            // req.logger.error(error)
            return failed(res, SYSTEM_FAILURE);
        }
    }
}