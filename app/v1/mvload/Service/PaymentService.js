require('dotenv').config();
const db = require("../../../../models/");
const User = db.mvUser
const Order = db.mvorder
const Payment = db.mvpayment
const UserAccount = db.mvAccountDetails
const OrderItem=db.mvOrderItem
const Razorpay = require('razorpay');
const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET_KEY,
});
const constant = require('../../../helper/message')
const NotificationHelper = require('../../../helper/notification')

module.exports = {
    initiatePayment: async (data) => {
        try {
            const razorpayOptions = {
                amount: Math.round(data.paidAmount * 100),  // amount in the smallest currency unit
                currency: "INR",
                receipt: new Date(),
                payment_capture: 1,
                notes: {
                    name: (data.user && data.user.name) ? data.user.name : "dubug",
                    contact: (data.user && data.user.mobile) ? data.user.mobile : "",
                    email: data.user && data.user.email ? data.user.email : "",
                    user: data?.user,
                }
            };

            const razorpayResponse = await instance.orders.create(razorpayOptions);

            if (!razorpayResponse?.id) {
                return 0
            }

            return razorpayResponse
        } catch (error) {
            console.log(error)
            throw error;
        }
    },
    updateBookingTransactionOrderStatus: async (
        razorpayOrderMetadata,
        razorpayOrderDetails
    ) => {
        try {
            console.log(razorpayOrderDetails);
            const { CAPTURED, FAILED, AUTHORIZED } = constant.RazorPayPaymentStatus
            if (razorpayOrderDetails.status === CAPTURED) {
                let payment = await Payment.findOne({
                    where: {
                        orderId: razorpayOrderDetails.order_id
                    }
                })
                if (payment) {
                    //for waleet recharge
                    if (payment.isWalletRecharge) {
                        await Payment.update({
                            transactionId: razorpayOrderDetails?.id,
                            status: 'Completed'
                        }, {
                            where: {
                                orderId: razorpayOrderDetails.order_id
                            }
                        })
                        let account = await UserAccount.findOne({
                            where: {
                                userId: payment.userId
                            }
                        })
                        if (account.totalWalletAmount) {
                            let totalWalletAmount = atob(account.totalWalletAmount)
                            let availableWalletAmount = atob(account.availableWalletAmount)
                            console.log(totalWalletAmount, availableWalletAmount, "available wallet balance");
                            let FinaltotalWalletAmount = parseFloat(totalWalletAmount) + parseFloat(payment.totalAmount)
                            let finalavailableWalletAmount = parseFloat(availableWalletAmount) + parseFloat(payment.totalAmount)
                            console.log(payment.totalAmount, FinaltotalWalletAmount, finalavailableWalletAmount, "available wallet balance");

                            await UserAccount.update({
                                totalWalletAmount: btoa(FinaltotalWalletAmount),
                                availableWalletAmount: btoa(finalavailableWalletAmount)
                            }, {
                                where: {
                                    userId: payment.userId
                                }
                            })
                        } else {
                            await UserAccount.update({
                                totalWalletAmount: btoa(payment.totalAmount),
                                availableWalletAmount: btoa(payment.totalAmount)
                            }, {
                                where: {
                                    userId: payment.userId
                                }
                            })
                        }
                        //for order
                    } else {
                        await Order.update({
                            transactionId: razorpayOrderDetails?.id,
                            paymentStatus: 'Completed',
                            paymentMethod: razorpayOrderDetails.method,
                            transactionData: JSON.stringify(razorpayOrderDetails)
                        }, {
                            where: {
                                gatewayOrderId: razorpayOrderDetails.order_id
                            }
                        })
                        await Payment.update({
                            transactionId: razorpayOrderDetails?.id,
                            orderId: razorpayOrderDetails.order_id,
                            status: 'Completed'
                        }, {
                            where: {
                                orderId: razorpayOrderDetails.order_id
                            }
                        })
                        let orderExist = await Order.findOne({
                            where: {
                                gatewayOrderId: razorpayOrderDetails.order_id
                            }
                        })
                        let itemcount = await OrderItem.count({
                            where: {
                                Orderid: orderExist.Order_id
                            }
                        })
                        let user = await User.findOne({
                            where: {
                                id: orderExist.userId
                            }
                        })
                        let bodyValues = [orderExist.Order_id, 'Booked', moment(orderExist.createdAt).format('DD MM YYYY'), itemcount, orderExist.deliveryaddress, '', moment(orderExist.ExpectedDelivery).format('DD MM YYYY'), orderExist.MvikasDocketNo, orderExist.invoiceNumber, orderExist.deliverypersonname]
                        await NotificationHelper.createOrderUpdateNotification(user.email,orderExist.Order_id, orderExist.vendorId, orderExist.userId, 1, bodyValues, `91${user.mobile}`, [process.env.MSG91_BUTTON_URL])
                        let bodyValues1 = [user.name, orderExist.Order_id, orderExist.totalAmount]
                        await NotificationHelper.createPaymentConfirmationNotification(user.email,"", "", "", user.id, bodyValues1, `91${user.mobile}`)
                    }
                } else {
                    return true
                }
            } else if (razorpayOrderDetails.status === FAILED) {
                let payment = await Payment.findOne({
                    where: {
                        orderId: razorpayOrderDetails.order_id
                    }
                })
                if (payment) {
                    if (payment.isWalletRecharge) {
                        await Payment.update({
                            transactionId: razorpayOrderDetails?.id,
                            orderId: razorpayOrderDetails.order_id,
                            status: 'Failed'
                        }, {
                            where: {
                                orderId: razorpayOrderDetails.order_id
                            }
                        })
                    } else {
                        await Payment.update({
                            transactionId: razorpayOrderDetails?.id,
                            orderId: razorpayOrderDetails.order_id,
                            status: 'Failed'
                        }, {
                            where: {
                                orderId: razorpayOrderDetails.order_id
                            }
                        })
                        await Order.update({
                            transactionId: razorpayOrderDetails?.id,
                            paymentStatus: 'Failed',
                            paymentMethod: razorpayOrderDetails.method,
                            transactionData: JSON.stringify(razorpayOrderDetails),
                            OrderStatus: 2
                        }, {
                            where: {
                                gatewayOrderId: razorpayOrderDetails.order_id
                            }
                        })
                    }
                }

            }
            return true
        } catch (error) {
            throw error;
        }
    },
    updateRefundTransactionStatus: async (
        razorpayOrderMetadata,
        razorpayOrderDetails
    ) => {
        try {
            const { REFUNDED, FAILED, CREATED } = constant.RazorPayPaymentRefundStatus
            // console.log("refund transaction status------------", razorpayOrderDetails.status)
            // if (razorpayOrderDetails.status === REFUNDED) {
            //     await bookingModel.findOneAndUpdate(
            //         {
            //             _id: razorpayOrderMetadata.bookingTransactionId,
            //         }, {
            //         $set: {
            //             transactionStatus: constant.TRANSACTION_STATUS.REFUNDED

            //         }
            //     },
            //         { new: true }
            //     )

            //     await refundTransactionModel.findOneAndUpdate({
            //         bookingTransactionId: razorpayOrderMetadata.bookingTransactionId,
            //     },
            //         {
            //             $set: {
            //                 refundStatus: constant.TRANSACTION_STATUS.REFUNDED
            //             }
            //         },
            //         { new: true }
            //     );

            // } else if (razorpayOrderDetails.status === FAILED) {
            //     await bookingModel.findOneAndUpdate(
            //         {
            //             _id: razorpayOrderMetadata.bookingTransactionId
            //         }, {
            //         $set: {
            //             transactionStatus: constant.TRANSACTION_STATUS.REFUND_FAILED,
            //         }
            //     },
            //         { new: true }
            //     )

            //     await refundTransactionModel.findOneAndUpdate({
            //         bookingTransactionId: razorpayOrderMetadata.bookingTransactionId,
            //     },
            //         {
            //             $set: {
            //                 refundStatus: constant.TRANSACTION_STATUS.REFUND_FAILED
            //             }
            //         },
            //         { new: true }
            //     );

            // }

            return true
        } catch (error) {
            throw error;
        }
    }
}
