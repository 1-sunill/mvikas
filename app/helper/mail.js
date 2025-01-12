const nodemailer = require("nodemailer");
const fs = require("fs"); // For reading file data
const path = require("path");
const axios = require("axios");
const USER = process.env.MAIL_USER;
const PASSWORD = process.env.MAIL_PASSWORD;
const moment = require("moment");
const schedule = require("node-schedule");
const db = require("../../models");
const Notification = db.CrmNotification;

exports.mail = async (req) => {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: USER,
      pass: PASSWORD,
    },
  });

  let mailOptions = {
    from: USER,
    to: req.to.join(", "),
    cc: req.cc ? req.cc.join(", ") : null,
    subject: req.subject || "Test Subject",
    text: req.text || "Test Body",
    html: req.html || "<h1>Test HTML</h1>",
  };
  // console.log({mailOptions}); return
  // Send email
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};
exports.sendmail = async (req) => {
  // console.log("++++++++++++++++", req);
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: USER,
      pass: PASSWORD,
    },
  });

  let mailOptions = {
    from: USER,
    to: req.to,
    subject: req.subject || "Test Subject",
    text: req.text || "Test Body",
    html: req.html || "<h1>Test HTML</h1>",
    attachments: req.attachments,
  };
  // console.log({mailOptions}); return
  // Send email
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

exports.sendBulkEmailToEntities = async (entities, message) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: USER, // Your email
      pass: PASSWORD, // Your email password
    },
  });

  // Helper function for retrying failed emails
  const sendWithRetry = async (mailOptions, retries = 3, delay = 5000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await transporter.sendMail(mailOptions);
        return { success: true, email: mailOptions.to };
      } catch (error) {
        if (attempt < retries && error.responseCode === 421) {
          console.log(
            `Retrying email to ${mailOptions.to}, attempt ${attempt}`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          console.error(`Failed to send email to ${mailOptions.to}:`, error);
          return { success: false, email: mailOptions.to, error };
        }
      }
    }
  };

  // Send emails in parallel with retry logic and result tracking
  const emailResults = await Promise.all(
    entities.map((entity) => {
      const mailOptions = {
        from: USER,
        to: entity.email,
        subject: message.title,
        text: message.description,
        html: message.description,
      };
      return sendWithRetry(mailOptions);
    })
  );

  return emailResults;
};

exports.scheduleNotification = async (entities, messages, scheduledDate) => {
  try {
    // Adjust scheduledDate by subtracting 5 hours and 30 minutes for time zone correction (e.g., IST)
    const adjustedDate = moment(scheduledDate)
      .subtract(5, "hours")
      .subtract(30, "minutes");
    console.log({ adjustedDate });
    // Schedule the job to run at the adjusted date/time

    const job = schedule.scheduleJob(adjustedDate.toDate(), async () => {
      try {
        console.log("++++++++++++", adjustedDate);

        console.log("Scheduled job running at", new Date());

        let transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: USER, // Your email
            pass: PASSWORD, // Your email password
          },
        });

        const emailPromises = entities.map((entity) => {
          const mailOptions = {
            from: USER,
            to: entity.email, // Assuming the 'email' field is in the entity
            subject: messages.title,
            // text: messages.description,
            html: messages.description,
          };
          console.log("entity.email", entity.email);
          // Send email for each entity
          return transporter.sendMail(mailOptions);
        });

        // Wait for all emails to be sent
        await Promise.all(emailPromises);

        console.log("All bulk notifications sent successfully.");
      } catch (error) {
        console.error("Error sending notifications:", error);
        throw error;
      }
    });

    if (job) {
      console.log(`Job scheduled successfully with name: ${job.name}`);
    } else {
      console.error("Failed to schedule job. Job is null.");
    }

    return job ? job.name : null;
  } catch (error) {
    console.error("Error scheduling notifications:", error);
    throw error;
  }
};
exports.scheduleReportNotification = async (
  emails,
  messages,
  scheduledDate
) => {
  try {
    const adjustedDate = moment(scheduledDate)
      .subtract(5, "hours")
      .subtract(30, "minutes");
    console.log("Adjusted schedule date:", adjustedDate.format());

    const job = schedule.scheduleJob(adjustedDate.toDate(), async () => {
      try {
        console.log("Scheduled job running at:", new Date());

        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER, // Use environment variables for security
            pass: process.env.EMAIL_PASSWORD,
          },
        });

        const emailPromises = emails.map((email) => {
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: messages.title,
            text: messages.description,
            html: "<h1>You have a new notification</h1>",
          };
          console.log("Sending email to:", email);
          return transporter.sendMail(mailOptions);
        });

        await Promise.all(emailPromises); // Wait for all emails to be sent
        console.log("All notifications sent successfully.");
      } catch (error) {
        console.error("Error sending notifications:", error);
        throw error;
      }
    });

    if (job) {
      console.log(`Job scheduled successfully with name: ${job.name}`);
      return job.name;
    } else {
      console.error("Failed to schedule job.");
      return null;
    }
  } catch (error) {
    console.error("Error scheduling notifications:", error);
    throw error;
  }
};
