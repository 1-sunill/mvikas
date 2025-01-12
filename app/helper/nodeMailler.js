require('dotenv').config();
const nodemailer = require('nodemailer');
// const constants = require('../config/contants');
  

// Create a transporter object using Zoho's SMTP transport
let transporter = nodemailer.createTransport({
service: "gmail",
  auth: {
    user: process.env.NODEMAILER_EMAIL ,
    pass: process.env.NODEMAILER_PASSWORD
  }
});

// Function to send otp on email
const sendEmailOtp = (to, name, otp, callback) => {
    let year=new Date().getFullYear()
  let mailOptions = {
    from: `"MV-Load" <${process.env.NODEMAILER_EMAIL}>`,
    to,
    subject: 'OTP FOR YOUR MVLOAD ACCOUNT.',
    html: `
      <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OTP Verification</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            color: #333;
            padding: 20px;
            margin: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            background-color: #007bff;
            color: #ffffff;
            padding: 15px;
            text-align: center;
        }
        .content {
            padding: 20px;
        }
        .otp {
            font-size: 24px;
            font-weight: bold;
            color: #007bff;
            margin: 20px 0;
        }
        .footer {
            background-color: #f4f4f4;
            padding: 10px;
            text-align: center;
            font-size: 12px;
            color: #777;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>OTP Verification</h1>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>Here is your One-Time Password (OTP) for verification:</p>
            <div class="otp">
                "${otp}"
            </div>
            <p>Please use this OTP to complete your verification process. If you did not request this OTP, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>&copy; ${year} Your Company. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `
  };

  transporter.sendMail(mailOptions, callback);
};

//forget password email
const sendEmailforgetPassword = (to, name, token, callback) => {
    let resetLink = `${process.env.USER_RESET_PASSWORD}?token=${token}`;
  let mailOptions = {
    from: `"MV-Load" <${process.env.NODEMAILER_EMAIL}>`,
    to,
    subject: 'Reset Password',
    html: `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            color: #333;
            padding: 20px;
            margin: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            background-color: #007bff;
            color: #ffffff;
            padding: 15px;
            text-align: center;
        }
        .content {
            padding: 20px;
        }
        .reset-link {
            font-size: 18px;
            font-weight: bold;
            color: #007bff;
            margin: 20px 0;
            display: block;
        }
        .footer {
            background-color: #f4f4f4;
            padding: 10px;
            text-align: center;
            font-size: 12px;
            color: #777;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Reset Password</h1>
        </div>
        <div class="content">
            <p>Hello, ${name}</p>
            <p>We received a request to reset your password. Click the link below to choose a new password:</p>
            <a href="${resetLink}" class="reset-link">Reset Password</a>
            <p>If you did not request a password reset, please ignore this email.</p>
        </div>
        <div class="footer">
            <p> MV-Load. All rights reserved.</p>
        </div>
    </div>
</body>
</html>

    `
  };

  transporter.sendMail(mailOptions, callback);
};

module.exports = { sendEmailOtp, sendEmailforgetPassword };
