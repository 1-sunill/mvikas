const {
    success,
    failed,
    serverError,
    validateFail,
    response
} = require("../../../../helper/response");

const {
    SYSTEM_FAILURE,
    ORDER_CONSTANTS,
    USER_CONSTANTS
} = require('../../../../helper/message');
const db = require("../../../../../models");
const _ = require("lodash");
const User = db.mvUser;
const Payment = db.mvpayment
const UserAccount = db.mvAccountDetails

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
const PaymentService = require('../../Service/PaymentService')
module.exports = {
    userWalletRecharge: async (req, res) => {
        try {
            const validate = new Validator(req.body, {
                totalAmount: "required"
            });

            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            let request = req.body
            let user = await User.findOne({
                where: {
                    id: req.decodedData.id
                }
            })
            if (!user)
                return response(res, 422, USER_CONSTANTS.USER_NOT_FOUND)
            // if (!user.isUser)
            // return response(res, 422, ORDER_CONSTANTS.ORDER_DENIED)
            let account = await UserAccount.findOne({
                where: {
                    userId: req.decodedData.id
                }
            })
            let totalWalletAmount = account.totalWalletAmount ? atob(account.totalWalletAmount) : 0
            let availableWalletAmount = account.availableWalletAmount ? atob(account.availableWalletAmount) : 0
            console.log(totalWalletAmount, availableWalletAmount, "available wallet balance");
            let data = {
                paidAmount: request.totalAmount,
                userId: req.decodedData.id,
                user: {
                    name: user.name,
                    mobile: user.mobile,
                    email: user.email
                }
            }
            let razorpayData = await PaymentService.initiatePayment(data)
            await Payment.create({
                userId: req.decodedData.id,
                paymentType: "Wallet",
                totalAmount: request.totalAmount,
                orderId: razorpayData.id,
                status: "Initiated",
                isWalletRecharge: true
            })
            console.log(razorpayData, 'wallet recharge');
            return success(res, ORDER_CONSTANTS.RAZORPAY_ORDER_ID, { gatewayOrderId: razorpayData.id, amount: razorpayData.amount, currency: razorpayData.currency })
        } catch (error) {
            console.error(SYSTEM_FAILURE, error);
            return failed(res, SYSTEM_FAILURE);
        }
    }
}