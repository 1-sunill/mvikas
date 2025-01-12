const db = require('../../../../models');
const {
    Op,
    literal
} = require("sequelize");
const moment = require('moment');
const User = db.mvUser;
const Order = db.mvorder
const OrderStatusType = db.mvOrderStatusType
const NotificationType = db.mvNotificationType
const NotifiableUser = db.mvNotifiableUser
const nodemailer = require("nodemailer");
const USER = process.env.NODEMAILER_EMAIL;
const PASSWORD = process.env.NODEMAILER_PASSWORD;
const ExcelJS = require('exceljs');
const { uploadExcelfile } = require("../../../helper/aws");

module.exports = {
    sendMIS: async () => {
        console.log("qwqweq");
        try {
            let msgTemplate = await NotificationType.findOne({ where: { notificationRoute: 'DailyMIS' } })
            let params = {
                paymentStatus: {
                    [Op.ne]: 'Initiated'
                },
                latestStatus: {
                    [Op.in]: [1, 2, 3, 6]
                }
            }
            let orders = []
            if (msgTemplate && msgTemplate.status) {
                orders = await Order.findAll({
                    where: params,
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'email', 'mobile']
                    },
                    {
                        model: OrderStatusType,
                        as: "orderStatus"
                    }],
                });
            }
            if (!orders.length)
                return true

            for (const order of orders) {
                let notifyUserExist = await NotifiableUser.findOne({
                    where: {
                        userId: order.userId,
                        userType: 'User',
                        notificationTypeId: msgTemplate.id
                    }
                })
                if (notifyUserExist) {
                    let headers = [
                        { header: 'Order Number', key: 'Order_id' },
                        { header: 'Booking Date', key: 'bookingDate' },
                        { header: 'From Pin', key: 'Frompincode' },
                        { header: 'To Pin', key: 'Topincode' },
                        { header: 'Status', key: 'Status' },
                        { header: 'ETA', key: 'ETA' },
                        { header: 'Shipment weight', key: 'Shipmentweight' },
                        { header: 'Chargeable Weight', key: 'ChargeableWeight' },
                        { header: 'Shipment Value', key: 'ShipmentValue' },
                        { header: 'Rate', key: 'Rate' },
                        { header: 'Additional Charge', key: 'AdditionalCharge' },
                        { header: 'Taxable Amount', key: 'TaxableAmount' },
                        { header: 'GST Amount', key: 'GSTAmount' },
                        { header: 'Total Amount', key: 'totalAmount' },
                        { header: 'Pickup Person Name	', key: 'Pickuppersonname' },
                        { header: 'Pickup Address', key: 'Pickupaddress' },
                        { header: 'Pickup Person No.', key: 'Pickuppersonmobile' },
                        { header: 'Delivery Person Name', key: 'DeliveryPersonName' },
                        { header: 'Delivery Address', key: 'deliveryaddress' },
                        { header: 'Delivery Address No.', key: 'deliverypersonmobile' },
                        { header: 'Customer Invoice', key: 'invoiceNumber' },
                        { header: 'Item Invoice', key: 'iteminvoice' },
                        { header: 'Docker Number', key: 'MvikasDocketNo' }
                    ]
                    const workbook = new ExcelJS.Workbook();
                    const worksheet = workbook.addWorksheet('Order');
                    // Add headers to the worksheet
                    worksheet.columns = headers;
                    worksheet.addRow({
                        Order_id: order.Order_id,
                        bookingDate: moment(order.createdAt).format('DD MM YYYY'),
                        Frompincode: order.Frompincode,
                        Topincode: order.Topincode,
                        Status: order.orderStatus.name,
                        ETA: moment(order.ExpectedDelivery).format('DD MM YYYY'),
                        Shipmentweight: parseFloat(order.Shipment_weight).toFixed(2),
                        ChargeableWeight: parseFloat(order.chargable_weight).toFixed(2),
                        ShipmentValue: parseFloat(order.Shipment_value).toFixed(2),
                        Rate: parseFloat(order.rate).toFixed(2),
                        AdditionalCharge: JSON.parse(order.additionalCharges),
                        totalAmount: order.totalAmount,
                        Pickuppersonname: order.Pickuppersonname,
                        Pickupaddress: order.Pickupaddress,
                        Pickuppersonmobile: order.Pickuppersonmobile,
                        DeliveryPersonName: order.deliverypersonname,
                        deliveryaddress: order.deliveryaddress,
                        deliverypersonmobile: order.deliverypersonmobile,
                        invoiceNumber: order.invoiceNumber,
                        iteminvoice: order.iteminvoice,
                        MvikasDocketNo: order.MvikasDocketNo
                    })
                    const buffer = await workbook.xlsx.writeBuffer();
                    const pdfFile = await uploadExcelfile(buffer, "xlsx", `order_${order.Order_id}`);
                    let xlsxUrl = pdfFile.url
                    console.log(xlsxUrl);
                    let subject = "Order MIS"
                    let html = `<p>
                    Dear ${order.user.name},<br><br>
                        We are excited to confirm that your order ${order.Order_id} has been ${order.orderStatus.name} successfully.<br><br>

                        You can track your order status using your Order ID. If you have any queries, feel free to contact us.<br><br>
                        Attachment: <a href="${xlsxUrl}" target="_blank">Click here</a><br><br>
                        Thank you for your using MVLOAD.<br><br>

                        Best regards,
                        MVLOAD </p>
                `;
                    let transporter = nodemailer.createTransport({
                        service: "gmail",
                        auth: {
                            user: USER,
                            pass: PASSWORD,
                        },
                    });

                    let mailOptions = {
                        from: `"MV-Load" <${USER}>`,
                        to: order.user.email,
                        subject: subject,
                        text: "",
                        html: html || "",
                    };

                    // Send email
                    try {
                        const info = await transporter.sendMail(mailOptions);
                        console.log("Email sent: " + info.response);
                    } catch (error) {
                        console.error("Error sending email:", error);
                    }
                }
            }
        } catch (error) {
            console.log(error);
        }
    }

}