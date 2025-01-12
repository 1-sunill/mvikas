const express = require("express");
const router = express.Router();
const {
    getVendors,
    getOrders,
    createOrder,
    getOrderDetails,
    createOrderIdForPaymentGateway,
    ReviewAndRatingDetails,
    submitOrderRatingAndReview,
    exportOrder,
    webhookHandler,
    refundWebhookHandler,
    paymentHistory,
    exportPayment,
    downloadMasterDocket,
    downloadDocket,
    downloadOrderItemLabel,
    getTrackOrder,
    paymentInvoice,
    getAdditionalServiceCharge
} = require('../../../../app/v1/mvload/controller/User/OrderController');
const isAuthenticate = require('../../../../app/middleware/appAuth');
const InvoiceController = require('../../../../app/v1/mvload/controller/User/InvoiceController');
const DashboardController = require("../../../../app/v1/mvload/controller/User/DashboardController");
const WalletController = require('../../../../app/v1/mvload/controller/User/WalletController');
const HomeController = require("../../../../app/v1/mvload/controller/User/HomeController");
const OrderRateReconcilation = require("../../../../app/v1/mvload/controller/User/OrderRateReconcilation");
// //otp send and update
// router.post('/sendOtp', sendOtp);
// router.post('/otpVerifyCreate', otpVerifyCreate);
// router.post('/login', login);
// router.post('/mobileLogin', mobileLogin);
// router.get('/userDetails', isAuthenticate, userDetails);
// router.put('/editProfile', isAuthenticate, editProfile);
router.post( // use this as webhook handler
    "/payment/verification",
    webhookHandler
);
router.post( // use this as webhook handler for payment refund
    "/refund/webhook",
    refundWebhookHandler
);
router.post('/home/service/list', HomeController.getServices)
router.get('/order/track', getTrackOrder)
router.use(isAuthenticate);
router.get('/dashboard', DashboardController.dashboard)
router.get('/wallet/amount', DashboardController.getWalletAmount)
router.get('/notification/list', DashboardController.notificationList)
router.get('/order/master/docket/download', downloadMasterDocket)
router.get('/order/docket/download', downloadDocket)
router.get('/order/label/download', downloadOrderItemLabel)

//order routers
router.post('/vendor/list', getVendors)
router.post('/order/create', createOrder)
router.post('/order/additional/service/charge', getAdditionalServiceCharge)
router.get('/order/list', getOrders)
router.get('/order/export', exportOrder)
router.get('/order/details', getOrderDetails)
router.get('/order/review/details', ReviewAndRatingDetails)
router.post('/order/review/submit', submitOrderRatingAndReview)
router.post('/get/razorpay/orderId', createOrderIdForPaymentGateway)
router.get('/payment/list', paymentHistory)
router.get('/payment/export', exportPayment)
router.get('/payment/invoice', paymentInvoice)

//invoice routes
router.get('/invoice/list', InvoiceController.getInvoiceList)
router.get('/invoice/export', InvoiceController.exportInvoice)
router.get('/invoice/download', InvoiceController.invoiceDownload)

router.post('/wallet/recharge', WalletController.userWalletRecharge)

//Rate reconcilation route
router.get('/order/rate/reconcilation/list', OrderRateReconcilation.getRateReconcilationList)
router.post('/order/rate/reconcilation/accept/reject', OrderRateReconcilation.acceptRejectRateReconcilation)
router.get('/order/rate/reconcilation/dashboard', OrderRateReconcilation.getRateReconcilationDashboard)

module.exports = router;