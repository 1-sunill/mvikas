const express = require("express");
const router = express.Router();
const { login, getProfile, updateProfile, changePassword, getKamList, assignKam, assignUserKam } = require('../../../../app/v1/mvload/controller/adminController');
const { vendorList, vendorEdit, makeItDummy, vendorInactive, vendorDelete, vendorPasswordChange, vendorBlock, exportVendorList } = require('../../../../app/v1/mvload/controller/adminVendorController');
const { changeRateType, customerList, customerEdit, customerInactive, customerBlock, getKycUser, getKycApprove, customerDelete, customerChangePassword, mvikasAccount, getMvikasAccount, getVendors, updateAssociateVendor, exportUserList } = require('../../../../app/v1/mvload/controller/adminUserController');
const isAuthenticate = require('../../../../app/middleware/adminAuth');
const SaleController = require('../../../../app/v1/mvload/controller/Admin/SaleController')
const PurchaseController = require('../../../../app/v1/mvload/controller/Admin/PurchaseController')
const ReviewController = require('../../../../app/v1/mvload/controller/Admin/ReviewController')
const MenuController = require('../../../../app/v1/mvload/controller/Admin/MenuAccessController')
const NotificationController = require('../../../../app/v1/mvload/controller/Admin/NotificationController')
const SubAdminController = require('../../../../app/v1/mvload/controller/Admin/SubAdminController')
const BulkOrderController = require('../../../../app/v1/mvload/controller/Admin/BulkOrderController');
const DashboardController = require("../../../../app/v1/mvload/controller/Admin/DashboardController");
const OrderRateReconcilation = require('../../../../app/v1/mvload/controller/Admin/OrderRateReconcilation')
//otp send and update

router.post('/login', login);
router.get('/getProfile', isAuthenticate, getProfile);
router.put('/updateProfile', isAuthenticate, updateProfile);
router.put('/changePassword', isAuthenticate, changePassword);

//vendor listing api
router.get('/vendorList', isAuthenticate, vendorList);
router.get('/vendorList/:id', isAuthenticate, vendorList);
router.get('/exportVendorList', isAuthenticate, exportVendorList);
router.put('/vendorPasswordChange', isAuthenticate, vendorPasswordChange);
router.put('/makeItDummy', isAuthenticate, makeItDummy);
router.put('/vendorBlock', isAuthenticate, vendorBlock);
router.put('/vendorInactive', isAuthenticate, vendorInactive);
router.put('/vendorEdit', isAuthenticate, vendorEdit);
router.delete('/vendorDelete/:id', isAuthenticate, vendorDelete);

//updated rate type
router.post('/update/user/rate/type', changeRateType)
//customer pannel
router.get('/customerList', isAuthenticate, customerList);
router.get('/customerList/:id', isAuthenticate, customerList);
router.get('/exportUserList', isAuthenticate, exportUserList);
router.put('/customerEdit', isAuthenticate, customerEdit);
router.put('/customerInactive', isAuthenticate, customerInactive);
router.put('/customerChangePassword', isAuthenticate, customerChangePassword);
router.put('/customerBlock', isAuthenticate, customerBlock);
router.delete('/customerDelete/:id', isAuthenticate, customerDelete);

//kyc 
router.get('/getKycUser/:id', isAuthenticate, getKycUser);
router.put('/getKycApprove', isAuthenticate, getKycApprove);

//assign createAdminRole
router.get('/getKamList', isAuthenticate, getKamList);
router.post('/assignKam', isAuthenticate, assignKam);
router.post('/assignUserKam', isAuthenticate, assignUserKam);

//mvikas account
router.post('/mvikasAccount', isAuthenticate, mvikasAccount);
router.get('/getMvikasAccount/:id', isAuthenticate, getMvikasAccount);

//vendor visibility to user
router.get('/getVendors/:userId', isAuthenticate, getVendors);
router.post('/updateAssociateVendor', isAuthenticate, updateAssociateVendor);
router.post('/bulk/user/upload', BulkOrderController.uploadUserDataByExcel)

router.use(isAuthenticate);
//sales and purchase report routes
router.get('/sale/report/list', SaleController.getSalesReport)
router.get('/sale/report/export', SaleController.exportSalesReport)
router.get('/sale/report/details', SaleController.getOrderDetails)
router.post('/sale/report/update/item/status', SaleController.updateOrderItemStatus)
router.post('/sale/report/upload/pod', SaleController.uploadPOD)
router.post('/sale/report/update/lsp/docket/number', SaleController.updateLSPDockectNumber)
router.get('/sale/vendor/list', SaleController.getVendorsForLPUpdate)
router.post('/sale/vendor/update', SaleController.updateLp)
router.post('/sale/special/charge/create', SaleController.createSpecialCharge)
router.post('/sale/special/charge/approval', SaleController.approveSpecialCharge)

//sale list with special charge

router.get('/sale/special/charge/list', SaleController.getSaleSpecialList)

router.get('/purchase/report/list', PurchaseController.getPurchaseReport)
router.get('/purchase/report/export', PurchaseController.exportPurchaseReport)

//sales and purchase invoice routes
router.get('/sale/invoice/list', SaleController.getSalesInvoice)
router.get('/sale/invoice/export', SaleController.exportSalesInvoice)
router.get('/sale/invoice', SaleController.salesInvoice)

router.get('/purchase/invoice/list', PurchaseController.getPurchaseInvoice)
router.get('/purchase/invoice/export', PurchaseController.exportPurchaseInvoice)
router.get('/purchase/invoice', PurchaseController.purchaseInvoice)

//review routes
router.get('/order/review/list', ReviewController.getReviewList)
router.get('/order/review/export', ReviewController.exportReviewList)
router.post('/order/review/update', ReviewController.updateStatus)
router.post('/order/review/delete', ReviewController.deleteReview)

/********************* Menu management *********************/
router.post("/add-module", MenuController.addModule);
router.post("/add-sub-module", MenuController.addSubModule);
router.post("/add-access", MenuController.addAccess);
router.post("/add-role", MenuController.addRole);
router.post("/add-role-permision", MenuController.addRolePermission);
router.post("/update-role-permision", MenuController.updateRolePermission);
router.post("/delete-role", MenuController.deleteRole);
router.get("/get-role", MenuController.getRole);
router.get("/get-module-access", MenuController.getRolePermission);
//notification route
router.post('/notification/send', NotificationController.sendNotification)
router.post('/notification/delete', NotificationController.deleteNotification)
router.get('/notification/list', NotificationController.notificationList)
router.get('/notification/user/list', NotificationController.getUserListForNotification)
router.get('/notification/types', NotificationController.getNotificationType)
router.put('/notification/type/change/status', NotificationController.changeNotificationTypeStatus);
router.post('/notification/notifiable/user', NotificationController.enableDisableNotification)


//sub admin
router.post('/subadmin/add', SubAdminController.addUser)
router.post('/subadmin/update', SubAdminController.updateUser)
router.get('/subadmin/list', SubAdminController.listUsers)
router.get('/subadmin/details', SubAdminController.getUser)
router.post('/subadmin/change/status', SubAdminController.updateUserStatus);
router.delete('/subadmin/delete/:id', SubAdminController.userDelete);

//bulk order
router.get('/bulk/order/sample', BulkOrderController.getBulkOrderSampleFile)
router.get('/bulk/order/list/excel', BulkOrderController.getOrderForBulkStatusUpdate)
router.post('/bulk/order/create', BulkOrderController.createBulkOrder)
router.post('/bulk/order/status/update', BulkOrderController.updateBulkOrderStatus)
router.post("/bulk/delete/order",BulkOrderController.deleteBulkOrder)
router.get('/dashboard', DashboardController.dashboard)

//Rate reconcilation route
router.get('/order/rate/reconcilation/list', OrderRateReconcilation.getRateReconcilationList)
router.get('/order/rate/reconcilation/dashboard', OrderRateReconcilation.getRateReconcilationDashboard)
router.post('/order/calculate/rate/reconcilation', OrderRateReconcilation.getRateReconcilation)
router.post('/order/calculate/rate/reconcilation/create', OrderRateReconcilation.createRateReconcilation)
router.post('/order/rate/reconcilation/accept/reject', OrderRateReconcilation.acceptRejectRateReconcilation)

module.exports = router;