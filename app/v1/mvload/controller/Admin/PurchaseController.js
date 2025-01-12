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
const ExcelJS = require('exceljs');
const fs = require("fs");
const pdf = require("html-pdf-node");
const ejs = require("ejs");
const OrderSpecialCharge = db.mvOrderSpecialCharge

const { uploadPdfToS3 } = require("../../../../helper/aws");
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
    getPurchaseReport: async (req, res) => {
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
                sortByColumn = 'createdAt',
                days = null
            } = req.query;
            page = parseInt(page);
            limit = parseInt(limit);
            const offset = (page - 1) * limit;
            let params = {
                paymentStatus: {
                    [Op.ne]: 'Initiated'
                }
            }
            if (days) {
                const date = new Date();
                date.setDate(date.getDate() - parseInt(days));
                params = Object.assign(params, {
                    createdAt: { [Op.gte]: date }
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
            console.log(params);
            if (search) {
                // Use Op.or to search in multiple fields
                params[Op.or] = [
                    {
                        Topincode: { [Op.like]: `%${search}%` }
                    },
                    {
                        Frompincode: { [Op.like]: `%${search}%` }
                    },
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
                },
                {
                    model: OrderSpecialCharge
                }, 
                {
                    model: OrderStatusType,
                    as: "latestorderstatus"

                }]
                ,
                where: params,
                limit,
                offset,
                order: [
                    [sortByColumn, sortBy]
                ]
            });
            const seenIds = new Set();
            const uniqueLeads = [];
      
            // Loop through the leads and add only unique ones
            for (const order of orders) {
              if (!seenIds.has(order.id)) {
                seenIds.add(order.id);
                uniqueLeads.push(order);
              }
            }
            let count = await Order.count({
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
                    model: OrderStatusType,
                    as: "latestorderstatus"

                }],
                where: params
            })
            // for (let order of orders) {
            //     order.dataValues.articles = await OrderItem.count({ where: { Orderid: order.Order_id } })
            // }
            for (let order of uniqueLeads) {
                order.dataValues.articles = await OrderItem.count({ where: { Orderid: order.Order_id } })
            }
            let data = {
                list: uniqueLeads,
                count: count,
                limit: limit
            }
            return success(res, "Purchase report", data)
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    exportPurchaseReport: async (req, res) => {
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
                }
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
                        Topincode: { [Op.like]: `%${search}%` }
                    },
                    {
                        Frompincode: { [Op.like]: `%${search}%` }
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
                    model: OrderStatusType,
                    as: "latestorderstatus"
                }],
            });

            // Define header as a simple array of strings
            let headers = [
                'Order Number',
                'Order Date',
                'Invoice Number',
                'Customer Name',
                'Customer Email',
                'Customer Number',
                'Vendor Name',
                'Article',
                'Item Type',
                'Category',
                'Customer Invoice No.',
                'Docket Number',
                'LSP Docket No',
                'Item Name',
                'E-Way Bill No.',
                'E-Way Bill Expiry',
                'Delivery Address',
                'Delivery Person Name',
                'Pick-Up Address',
                'Pick-Up Person Name',
                'Pick-Up Person Contact No.',
                'From Pin',
                'To Pin',
                'Chargable Weight',
                'GST Amt.',
                'Total Amt.',
                'Other Info.'
            ];

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('purchase-report');



            // Add headers to the worksheet
            worksheet.columns = headers.map(header => ({ header, key: header }));

            // return success(res,order)
            // Add data rows
            for (let i = 0; i < order.length; i++) {
                let articles = await OrderItem.count({ where: { Orderid: order[i].Order_id } })
                worksheet.addRow({
                    'Order Number': order[i].Order_id,
                    'Order Date': moment(order[i].createdAt).format('YYYY-MM-DD'),
                    'Invoice Number': order[i].invoiceNumber,
                    'Customer Name': order[i].user.name,
                    'Customer Email': order[i].user.email,
                    'Customer Number': order[i].user.mobile,
                    'Vendor Name': order[i].vendor?.name || "",
                    'Article': articles,
                    'Item Type': order[i].ItemType,
                    'Category': order[i].ItemCategory,
                    'Customer Invoice No.': order[i].iteminvoice,
                    'Docket Number': order[i].MvikasDocketNo,
                    'LSP Docket No': order[i].LSPDocketNo ? order[i].LSPDocketNo : "",
                    'Item Name': order[i].Itemname,
                    'E-Way Bill No.': order[i].EWayBillNo ? order[i].EWayBillNo : '',
                    'E-Way Bill Expiry': order[i].EWayBillExpDate ? moment(order[i].EWayBillExpDate).format('YYYY-MM-DD') : '',
                    'Order Status': order[i]?.latestorderstatus?.name,
                    'Delivery Address': order[i].deliveryaddress,
                    'Delivery Person Name': order[i].deliverypersonname,
                    'Pick-Up Address': order[i].Pickupaddress,
                    'Pick-Up Person Name': order[i].Pickuppersonname,
                    'Pick-Up Person Contact No.': order[i].Pickuppersonmobile,
                    'From Pin': order[i].Frompincode,
                    'To Pin': order[i].Topincode,
                    'Chargable Weight': parseFloat(order[i].chargable_weight).toFixed(2),
                    'Taxable Amt.': parseFloat(order[i].V_taxableAmount).toFixed(2),
                    'GST Amt.': parseFloat(order[i].V_gst_Amount).toFixed(2),
                    'Total Amt.': parseFloat(order[i].V_totalAmount).toFixed(2),
                    'Other Info.': order[i].OtherInfromation ? order[i].OtherInfromation : ""

                });
            }

            // order.forEach(o => {
            //     worksheet.addRow({
            //         'Order Number': o.Order_id,
            //         'Order Date': moment(o.createdAt).format('YYYY-MM-DD'),
            //         'Invoice Number': o.invoiceNumber,
            //         'Customer Name': o.user.name,
            //         'Customer Email': o.user.email,
            //         'Customer Number': o.user.mobile,
            //         'Vendor Name': o.vendor.name,
            //         'Item Type': o.ItemType,
            //         'Category': o.ItemCategory,
            //         'Customer Invoice No.': o.iteminvoice,
            //         'Docket Number': o.MvikasDocketNo,
            //         'LSP Docket No': o.LSPDocketNo ? o.LSPDocketNo : "",
            //         'Item Name': o.Itemname,
            //         'E-Way Bill No.': o.EWayBillNo ? o.EWayBillNo : '',
            //         'E-Way Bill Expiry': o.EWayBillExpDate ? moment(o.EWayBillExpDate).format('YYYY-MM-DD') : '',
            //         'Delivery Address': o.deliveryaddress,
            //         'Delivery Person Name': o.deliverypersonname,
            //         'Pick-Up Address': o.Pickupaddress,
            //         'Pick-Up Person Name': o.Pickuppersonname,
            //         'Pick-Up Person Contact No.': o.Pickuppersonmobile,
            //         'From Pin': o.Frompincode,
            //         'To Pin': o.Topincode,
            //         'Chargable Weight': parseFloat(o.chargable_weight).toFixed(2),
            //         'Taxable Amt.': parseFloat(o.V_taxableAmount).toFixed(2),
            //         'GST Amt.': parseFloat(o.V_gst_Amount).toFixed(2),
            //         'Total Amt.': parseFloat(o.V_totalAmount).toFixed(2),
            //         'Other Info.': o.OtherInfromation ? o.OtherInfromation : ""

            //     });
            // });


            // Write the workbook to the response
            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                'attachment; filename=' + 'purchase-report.xlsx'
            );

            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    getPurchaseInvoice: async (req, res) => {
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
                sortByColumn = 'createdAt',
                days = null
            } = req.query;
            page = parseInt(page);
            limit = parseInt(limit);
            const offset = (page - 1) * limit;
            let params = {
                paymentStatus: {
                    [Op.ne]: 'Initiated'
                }
            }
            if (days) {
                const date = new Date();
                date.setDate(date.getDate() - parseInt(days));
                params = Object.assign(params, {
                    createdAt: { [Op.gte]: date }
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
            return success(res, "Purchase invoice", data)
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    exportPurchaseInvoice: async (req, res) => {
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
                }
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
                }],
            });

            // Define header as a simple array of strings
            let headers = [
                'Invoice Number', 'Customer Name', 'Booking Date', 'Payment To', 'Total Amount', 'Item Name', 'Order Number'
            ];

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('purchase-invoice');



            // Add headers to the worksheet
            worksheet.columns = headers.map(header => ({ header, key: header }));

            // Add data rows
            order.forEach(o => {
                worksheet.addRow({
                    'Invoice Number': o.invoiceNumber,
                    'Customer Name': o.user.name,
                    'Booking Date': moment(o.createdAt).format('YYYY-MM-DD'),
                    'Payment To': o.vendor.name,
                    'Total Amount': parseFloat(o.V_totalAmount).toFixed(2),
                    'Item Name': o.Itemname,
                    'Order Number': o.Order_id
                });
            });

            // Write the workbook to the response
            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                'attachment; filename=' + 'purchase-report.xlsx'
            );

            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    },
    purchaseInvoice: async (req, res) => {
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
                    id: order.vendorId
                }
            })
            let masterDocketURL = ""
            let htmlContent;
            try {
                htmlContent = fs.readFileSync("views/mvload/purchaseorderinvoice.ejs", "utf-8");
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
                rate: order.VRate,
                taxableAmount: order.V_taxableAmount,
                gstAmount: order.V_gst_Amount,
                gst: order.VGst,
                totalAmount: order.V_totalAmount,
                totalAmountInWord: await numberToword.numberToWords(parseFloat(order.V_totalAmount)),
                bankName: "",
                IFSC: "",
                accountNumber: "",
                specialCharge:order.VspecialCharge

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
                const pdfFile = await uploadPdfToS3(pdfBuffer, "pdf");
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