const db = require("../../models");
const orderStatusType = db.mvOrderStatusType
const User = db.mvUser
const Notification = db.mvnotification
const NotificationType = db.mvNotificationType
const NotifiableUser = db.mvNotifiableUser
const axios = require('axios');
const nodemailer = require("nodemailer");
const USER = process.env.NODEMAILER_EMAIL;
const PASSWORD = process.env.NODEMAILER_PASSWORD;
const fs = require('fs')
module.exports = {
    //mv load
    createOrderUpdateNotification: async (userEmail, orderId, vendorId, userId, statusType, bodyValues, number, buttonValues = []) => {
        try {
            let status = await orderStatusType.findOne({ where: { id: statusType } })
            let msgTemplate
            if (statusType == 1) {
                msgTemplate = await NotificationType.findOne({ where: { notificationRoute: 'NewOrderPlaced' } })
            } else {
                msgTemplate = await NotificationType.findOne({ where: { notificationRoute: 'OrderStatus' } })
            }
            if (msgTemplate && msgTemplate.status) {
                let notifyUserExist = await NotifiableUser.findOne({
                    where: {
                        userId: userId,
                        userType: 'User',
                        notificationTypeId: msgTemplate.id
                    }
                })
                if (notifyUserExist) {
                    await sendWhatsAppMessage(number, bodyValues, msgTemplate.templateId, buttonValues)
                    await sendEmail(msgTemplate.templateId, bodyValues, userEmail)
                }
            }
            let title = statusType == 1 ? 'Order placed' : 'Order status updated'
            let message = `Your order (${orderId} has been ${status.name})`
            await Notification.create({
                title: title,
                message: message,
                senderId: vendorId,
                receiverId: userId,
                userType: 'User',
                createdAt: new Date(),
                updatedAt: new Date()
            })

        } catch (error) {
            console.log(error);
        }
    },
    createPaymentConfirmationNotification: async (userEmail, orderId, vendorId, userId, statusType, bodyValues, number) => {
        try {
            // let status = await orderStatusType.findOne({ where: { id: statusType } })
            let msgTemplate = await NotificationType.findOne({ where: { notificationRoute: 'PaymentConfirmation' } })
            if (msgTemplate && msgTemplate.status) {
                let notifyUserExist = await NotifiableUser.findOne({
                    where: {
                        userId: userId,
                        userType: 'User',
                        notificationTypeId: msgTemplate.id
                    }
                })
                if (notifyUserExist) {
                    await sendWhatsAppMessage(number, bodyValues, msgTemplate.templateId)
                    await sendEmail('mvload_payment_confirmation', bodyValues, userEmail)

                }
            }
        } catch (error) {
            console.log(error);
        }
    },
    createOnboardNotification: async (userEmail, userId, bodyValues, number) => {
        try {
            // let status = await orderStatusType.findOne({ where: { id: statusType } })
            let msgTemplate = await NotificationType.findOne({ where: { notificationRoute: 'mvload_register' } })
            if (msgTemplate && msgTemplate.status) {
                await sendWhatsAppMessage(number, bodyValues, msgTemplate.templateId)
            }
            await sendEmail('mvload_register', bodyValues, userEmail)
        } catch (error) {
            console.log(error);
        }
    }
}


// Function to send a WhatsApp message
const sendWhatsAppMessage = async (phoneNumber, bodyValues, templateNmae, buttonValues = []) => {
    const MSG91_API_KEY = process.env.MSG91_API_KEY // Your MSG91 API key
    const TEMPLATE_ID = templateNmae; // Approved template ID from MSG91
    const SENDER_ID = process.env.MSG91_SENDER_ID; // Your WhatsApp sender ID provided by MSG91
    const countryCode = '91'; // Country code for the phone number (91 for India)
    const languageCode = 'En'
    try {
        let to = phoneNumber && Array.isArray(phoneNumber) ? phoneNumber : [phoneNumber]
        const components = {};
        bodyValues.forEach((value, index) => {
            components[`body_${index + 1}`] = {
                type: 'text',
                value: value
            };
        });
        if (buttonValues.length) {
            buttonValues.forEach((value, index) => {
                components[`button_${index + 1}`] = {
                    "subtype": "url",
                    "type": "text",
                    "value": `${value}`
                };
            });
        }

        let data = {
            "integrated_number": SENDER_ID,
            "content_type": "template",
            "payload": {
                "type": "template",
                "template": {
                    "name": TEMPLATE_ID,
                    "language": {
                        "code": languageCode,
                        "policy": "deterministic"
                    },
                    "to_and_components": [
                        {
                            "to": to,
                            "components": components
                        }

                    ]
                },
                "messaging_product": "whatsapp"
            }
        }
        const response = await axios({
            method: 'post',
            url: 'https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/',
            headers: {
                'Content-Type': 'application/json',
                authkey: MSG91_API_KEY,  // Add your MSG91 auth key here
            },
            data: JSON.stringify(data),
        });

        if (response.data && response.data.type === 'success') {
            console.log('Message sent successfully:', response.data);
        } else {
            console.error('Failed to send message:', response.data);
        }
    } catch (error) {
        console.error('Error sending WhatsApp message:', error.response ? error.response.data : error.message);
    }
};

const sendEmail = async (expression, data, userEmail) => {
    try {
        console.log({ expression, data, userEmail });
        let html = ''
        let subject = ""
        switch (expression) {
            case 'mvload_orderbooking':
                subject = "Order booking"
                let htmlContent
                try {
                    htmlContent = fs.readFileSync("views/mvload/email/orderBooking.ejs", "utf-8");
                } catch (err) {
                    console.error("Error reading EJS template file:", err);
                    return response(res, 422, "Something went wrong")

                }
                const compiledHtml = ejs.render(htmlContent, {
                    name: data.name,
                    orderId: data.orderId
                });
                html = compiledHtml
                break;
            case 'mvload_orderstatus_change':
                subject = "Order status"

                let htmlContent1;
                try {
                    htmlContent1 = fs.readFileSync("views/mvload/email/orderStatus.ejs", "utf-8");
                } catch (err) {
                    console.error("Error reading EJS template file:", err);
                    return response(res, 422, "Something went wrong")

                }
                const compiledHtml1 = ejs.render(htmlContent1, {
                    orderId: data[0],
                    status: data[1],
                    bookingDate: data[2],
                    boxes: data[3],
                    deliveryAddress: data[4],
                    remark: data[5],
                    deliveryDate: data[6],
                    LR: data[7],
                    invoiceNo: data[8],
                    consineeName: data[9]
                });
                html = compiledHtml1

                // html = `
                //   <p>  Dear Valuable Customer,<br><br>

                //     We're delighted to share that your order ${data[0]} has been ${data[1]} successfully .Please find the additional details mentioned below:<br><br>

                //     Booking Date - ${data[2]}<br>
                //     No of Boxes - ${data[3]}<br>
                //     Destination - ${data[4]}<br>
                //     Updated Remark - ${data[5]}<br>
                //     EDD - ${data[6]}<br>
                //     MVikas LR NO - ${data[7]}<br>
                //     Invoice No - ${data[8]}<br>
                //     Consignee Name - ${data[9]}<br><br><br>

                //     You can track your order using your Order ID on the website. For more enquiries, you can reach out to us. Thank you for your continued patience and understanding.<br><br>

                //     Best Regards,
                //     MVLOAD </p>
                // `
                break;
            case 'mvload_promo':
                html = ``
                break;
            case 'mvload_register':
                subject = "Onboard"
                let htmlContentr
                try {
                    htmlContentr = fs.readFileSync("views/mvload/email/register.ejs", "utf-8");
                } catch (err) {
                    console.error("Error reading EJS template file:", err);
                    return response(res, 422, "Something went wrong")

                }
                const compiledHtmlr = ejs.render(htmlContentr, {
                    name: data[0]
                });
                html = compiledHtmlr
                // html = `
                //   <p>  Dear ${data[0]}!<br><br>

                //     Welcome to MVLOAD! We're thrilled to have you onboard and excited to help you with your logistics needs.<br><br>

                //     We understand moving your valuable cargo can be stressful, so we're here to make things as smooth and efficient as possible.<br><br>

                //     Our team of experts is dedicated to providing you with the best-in-class service, tailored to your specific requirements.<br><br>

                //     Please start making your booking from the platform.<br><br>

                //     Best regards,
                //     MVLOAD </p>


                // `
                break;
            case 'mvload_outstanding_payment':
                subject = "Outstanding payment"

                html = `
               <p> Dear ${data[0]},<br><br>

                This is a friendly reminder regarding your outstanding payment for your MV Load Postpaid Account. We appreciate your prompt attention to settle the amount of Rs ${data[1]} at your earliest convenience to avoid late fee payment. If you've already made the payment, kindly disregard this message.<br><br>

                Best Regards,
                MVLOAD </p>
                
                `
                break;
            case 'mvload_payment_confirmation':
                subject = "Payment confirmation"
                let htmlContentpc
                try {
                    htmlContentpc = fs.readFileSync("views/mvload/email/register.ejs", "utf-8");
                } catch (err) {
                    console.error("Error reading EJS template file:", err);
                    return response(res, 422, "Something went wrong")

                }
                const compiledHtmlpc = ejs.render(htmlContentpc, {
                    name: data[0],
                    orderId: data[1],
                    amount: data[2]
                });
                html = compiledHtmlpc
                // html = `
                //   <p>  Dear ${data[0]},<br><br>

                //     We're pleased to confirm your payment for ${data[1]}. The amount of Rs ${data[2]} has been received successfully.<br><br>

                //     For any questions, feel free to contact us.<br>
                //     Thank you for placing order with us.<br><br>

                //     Best regards,
                //     MVLOAD</p>

                // `
                break;
            default:
                html = ``
        }
        let transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: USER,
                pass: PASSWORD,
            },
        });

        let mailOptions = {
            from: `"MV-Load" <${USER}>`,
            to: userEmail,
            subject: subject,
            text: "",
            html: html || "<h1>Test HTML</h1>",
        };

        // Send email
        try {
            const info = await transporter.sendMail(mailOptions);
            console.log("Email sent: " + info.response);
            return true;
        } catch (error) {
            console.error("Error sending email:", error);
            return false;
        }
    } catch (error) {
        console.log(error.message);
    }
}
