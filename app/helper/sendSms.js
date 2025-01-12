const https = require("https");
let axios = require("axios");
// const Notifiable = require("../v1/../../models/crmnotifiables");
const db = require("../../models");
const NotificationType = db.CrmNotificationType;
const Notifiables = db.CrmNotifiables;
const { failed } = require("./response");
const USER = process.env.MAIL_USER;
const PASSWORD = process.env.MAIL_PASSWORD;
const nodemailer = require("nodemailer");
const Customer = db.CrmAllCustomer;
const User = db.crmuser;
const Transporter = db.CrmTransport;
exports.sendMobileOTP = async (mobileNo, otp) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MS91_TEMPLATE_KEY;
  mobileNo = "91" + mobileNo;
  const mobileWithoutPlus = mobileNo;

  const postData = JSON.stringify({
    OTP: otp.toString(),
  });

  console.log("authKey:", authKey, "templateId:", templateId);

  // Construct the request options
  const options = {
    method: "POST",
    hostname: "control.msg91.com",
    port: null,
    path: `/api/v5/otp?template_id=${templateId}&mobile=${mobileWithoutPlus}&authkey=${authKey}&realTimeResponse=true`,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
    },
  };

  // Send the HTTP request
  const req = https.request(options, (res) => {
    let chunks = [];

    res.on("data", (chunk) => {
      chunks.push(chunk);
    });

    res.on("end", () => {
      const body = Buffer.concat(chunks);
      console.log("Response:", body.toString());
    });
  });

  // Handle request errors
  req.on("error", (err) => {
    console.error("Error sending OTP request:", err.message);
  });

  // Write the request body and end the request
  req.write(postData);
  req.end();
};

exports.sendWhatsAppMessage = async (
  authKey,
  fromNumber,
  templateName,
  languageCode,
  receiverNumbers,
  components
) => {
  console.log("++++++++++++++++++++++", receiverNumbers);
  const MSG91_API_KEY = authKey; // Your MSG91 API key
  const TEMPLATE_ID = templateName; // Approved template ID from MSG91
  const SENDER_ID = fromNumber; // Your WhatsApp sender ID provided by MSG91
  const countryCode = languageCode; // Country code for the phone number (91 for India)
  // const languageCode = "En";
  const phoneNumber = receiverNumbers;
  try {
    let to =
      phoneNumber && Array.isArray(phoneNumber) ? phoneNumber : [phoneNumber];
    const component = components;

    let data = {
      integrated_number: SENDER_ID,
      content_type: "template",
      payload: {
        type: "template",
        template: {
          name: templateName,
          language: {
            code: "en_US",
            policy: "deterministic",
          },
          to_and_components: [
            {
              to: to,
              components: component,
            },
          ],
        },
        messaging_product: "whatsapp",
      },
    };
    const response = await axios({
      method: "post",
      url: "https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
      headers: {
        "Content-Type": "application/json",
        authkey: MSG91_API_KEY, // Add your MSG91 auth key here
      },
      data: JSON.stringify(data),
    });

    if (response.data && response.data.type === "success") {
      console.log("Message sent successfully:", response.data);
    } else {
      console.error("Failed to send message:", response.data);
    }
    return response.data;
  } catch (error) {
    console.error(
      "Error sending WhatsApp message:",
      error.response ? error.response.data : error.message
    );
  }
};
// console.log("NotificationType:", NotificationType);
exports.sendNotificationEmail = async (
  entities,
  templateName,
  notifiable_type,
  workspace_id
) => {
  try {
    // Find the notification type by template name
    const notificationType = await NotificationType.findOne({
      where: { template_code: templateName, status: 1 },
    });
    if (!notificationType) return; // Exit if no notification type found
    // Fetch matching notifiable IDs from Notifiables for filtering
    const notifiables = await Notifiables.findAll({
      where: {
        notification_type_id: notificationType.id,
        notifiable_type: notifiable_type,
        workspace_id: workspace_id,
      },
      attributes: ["notifiable_id"], // Fetch only notifiable IDs
    });
    console.log({ notifiables });
    console.log("notificationType.id", notificationType.id);
    console.log("workspace_id", workspace_id);
    console.log("notifiable_type", notifiable_type);

    // Extract notifiable IDs for filtering
    const notifiableIds = notifiables.map((n) => n.notifiable_id);
    const entitiesIds = entities.map((e) => e.ids);
    // console.log({ entitiesIds });
    // Filter `entities` by checking if `ids` are in `Notifiables`
    // const entitiesToNotify = entities.filter((entity) =>
    // entity.ids.some((id) => notifiableIds.includes(id))
    // );
    console.log({ entities });

    const entitiesToNotify = entities.filter((entity) => {
      const ids = Array.isArray(entity.ids) ? entity.ids : [entity.ids];
      return ids.some((id) => notifiableIds.includes(id));
    });
    // Get the model based on the notifiable type
    let Model;
    switch (notifiable_type) {
      case "customer":
        Model = Customer;
        break;
      case "vendor":
        Model = Customer;
        break;
      case "user":
        Model = User;
        break;
      case "transporter":
        Model = Transporter;
        break;
      default:
        console.error("Invalid notifiable type");
        return;
    }
    // Retrieve emails for entities that need notification
    const emailsToSend = [];

    for (const entity of entitiesToNotify) {

      const idsToQuery = Array.isArray(entity.ids)
        ? entity.ids.filter((id) => notifiableIds.includes(id))
        : [entity.ids].filter((id) => notifiableIds.includes(id));
      const users = await Model.findAll({
        where: { id: idsToQuery },
        attributes: ["id", "email"],
      });

      // Prepare emails for each user
      users.forEach((user) => {
        console.log("users emails", user.email);

        emailsToSend.push({
          email: user.email,
          subject: entity.subject,
          html: entity.html,
          attachments: entity.attachments,
        });
      });
    }
    // console.log("emailsToSend++++++++++++++++++++", emailsToSend);
    // console.log("entities++++++++++++++++++++", entitiesIds);

    // return 1;
    // Setup email transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: USER,
        pass: PASSWORD,
      },
    });
    // Send email notifications
    const emailPromises = emailsToSend.map(({ email, subject, html, attachments }) => {
      const mailOptions = {
        from: USER,
        to: email,
        subject,
        html,
        attachments
      };

      return transporter.sendMail(mailOptions).catch((err) => {
        console.error(`Failed to send email to ${email}:`, err.message);
      });
    });

    await Promise.all(emailPromises);
    console.log("All emails sent successfully to filtered users.");
  } catch (error) {
    console.error(
      "Error in sendNotificationEmail:",
      error.response ? error.response.data : error.message
    );
  }
};

exports.sendNotificationWhatsApp = async () => {
  try {
  } catch (error) { }
};
exports.sendMobileOTPMVLOAD = async (mobileNo, otp) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MS91_TEMPLATE_KEY;
  const mobile = `91${mobileNo}`;

  const postData = JSON.stringify({ OTP: otp.toString() });

  const options = {
    method: "POST",
    hostname: "control.msg91.com",
    path: `/api/v5/otp?template_id=${templateId}&mobile=${mobile}&authkey=${authKey}&realTimeResponse=true`,
    headers: { "Content-Type": "application/json" },
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => (data += chunk)); // Collect data
      res.on("end", () => {
        try {
          const response = JSON.parse(data);
          resolve(response.type === "success"); // Resolve true if success
        } catch {
          resolve(false); // Handle JSON parse errors
        }
      });
    });

    req.on("error", () => resolve(false)); // Handle network errors
    req.write(postData);
    req.end();
  });

};

