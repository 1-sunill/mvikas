const express = require("express");
const router = express.Router();
const {
    sendOtp,
    login,
    mobileLogin,
    forgetPassword,
    changePassword,
    resetPassword,
    otpVerifyCreate,
    userDetails,
    editProfile,
    addBankDetails,
    fetchBankDetails,
    enableBankDetails,
    deleteBankDetails,
    createAddress,
    getAddress,
    updateAddress,
    deleteAddress,
    kycCreate,
    getKyc,
    updateBankDetails,
    getMvikasAccount,
    kycUpdate,
    switchUser,
    getRateType
} = require('../../../../app/v1/mvload/controller/userController');
const {
    getPincode,
    createZone,
    getZone,
    updateZone,
    deleteZone,
    getZoneByName,
    getState,
    getCity,
    createZoneMap,
    getZoneByService,
    getPincodeByService,
    editZoneMap,
    deleteZoneMap,
    uploadOda,
    dowloadODA,
    getPincodesbyCityandState,
    dowloadTAT,
    uploadTAT,
    downloadExcelPincode
} = require('../../../../app/v1/mvload/controller/pincodeController');
const {
    createService,
    getService,
    updateService,
    deleteService,
    getLp
} = require('../../../../app/v1/mvload/controller/serviceController');
const {
    createSetting,
    getSetting,
    updateSetting,
    deleteSetting
} = require('../../../../app/v1/mvload/controller/mvSettingController');
const {
    createAdditionalCharges,
    getAdditionalCharges,
    updateAdditionalCharges,
    createCargoRate,
    rateSheetDownload,
    getCargoRates
} = require('../../../../app/v1/mvload/controller/vendorCargoRatesController');
const {
    createCharges
} = require('../../../../app/v1/mvload/controller/cargoRateController');
const isAuthenticate = require('../../../../app/middleware/appAuth');
const MasterController = require("../../../../app/v1/mvload/controller/MasterController");
const VendorOrderController = require("../../../../app/v1/mvload/controller/Vendor/OrderController")
const UserOrderController = require("../../../../app/v1/mvload/controller/User/OrderController");
const InvoiceController = require("../../../../app/v1/mvload/controller/Vendor/InvoiceController");
const DashboardController = require("../../../../app/v1/mvload/controller/Vendor/DashboardController");
const StateChargeController = require("../../../../app/v1/mvload/controller/Vendor/StateChargeController");
const OrderRateReconcilation = require("../../../../app/v1/mvload/controller/Vendor/OrderRateReconcilation");
//otp send and update
router.post('/sendOtp', sendOtp);
router.post('/otpVerifyCreate', otpVerifyCreate);
router.post('/login', login);
router.post('/mobileLogin', mobileLogin);
router.get('/userDetails', isAuthenticate, userDetails);
router.put('/editProfile', isAuthenticate, editProfile);
router.post('/switch/user', isAuthenticate, switchUser);
router.get('/rate/type', isAuthenticate, getRateType);

//kyc 
router.post('/kycCreate', isAuthenticate, kycCreate);
router.put('/kycUpdate', isAuthenticate, kycUpdate);
router.get('/getKyc', isAuthenticate, getKyc);

//forget password
router.post('/forgetPassword', forgetPassword);
router.post('/resetPassword', resetPassword);

//change Passsword
router.post('/changePassword', isAuthenticate, changePassword);

// bank api's
router.post('/addBankDetails', isAuthenticate, addBankDetails);
router.get('/fetchBankDetails', isAuthenticate, fetchBankDetails);
router.put('/updateBankDetails', isAuthenticate, updateBankDetails);
router.put('/enableBankDetails/:id', isAuthenticate, enableBankDetails);
router.delete('/deleteBankDetails/:id', isAuthenticate, deleteBankDetails);


//pincode routes
router.get('/getPincode', isAuthenticate, getPincode);
router.get('/getState', getState);
router.get('/getCity', getCity);
router.get('/getPincodesbyCityandState', isAuthenticate, getPincodesbyCityandState);
router.get('/downloadExcelPincode', isAuthenticate, downloadExcelPincode);

//address routes
router.post('/createAddress', isAuthenticate, createAddress);
router.get('/getAddress', isAuthenticate, getAddress);
router.put('/updateAddress', isAuthenticate, updateAddress);
router.delete('/deleteAddress/:id', isAuthenticate, deleteAddress);

//service route
router.post('/createService', isAuthenticate, createService);
router.get('/getService', isAuthenticate, getService);
router.put('/updateService', isAuthenticate, updateService);
router.delete('/deleteService/:id', isAuthenticate, deleteService);


//zoneapi's
router.post('/createZone', isAuthenticate, createZone);
router.get('/getZone', isAuthenticate, getZone);
router.post('/getZoneByName', isAuthenticate, getZoneByName);
router.put('/updateZone', isAuthenticate, updateZone);
router.delete('/deleteZone/:id', isAuthenticate, deleteZone);


//zoneMapping
router.post('/createZoneMap', isAuthenticate, createZoneMap);
router.get('/getZoneByService', isAuthenticate, getZoneByService);
router.get('/getPincodeByService', isAuthenticate, getPincodeByService);
router.put('/editZoneMap', isAuthenticate, editZoneMap);
router.delete('/deleteZoneMap/:serviceId', isAuthenticate, deleteZoneMap);

//upload oda
router.put('/uploadODA', isAuthenticate, uploadOda);
router.get('/dowloadODA', isAuthenticate, dowloadODA);

//upload tat
router.post('/uploadTAT', isAuthenticate, uploadTAT);
router.get('/dowloadTAT', isAuthenticate, dowloadTAT);


//rulesapi's
router.post('/createRule', isAuthenticate, createSetting);
router.get('/getRule', isAuthenticate, getSetting);
router.put('/updateRule', isAuthenticate, updateSetting);
router.delete('/deleteRule', isAuthenticate, deleteSetting);


//picupslotapi's
router.post('/createPicupSlot', isAuthenticate, createSetting);
router.get('/getPicupSlot', isAuthenticate, getSetting);
router.put('/updatePicupSlot', isAuthenticate, updateSetting);
router.delete('/deletePicupSlot', isAuthenticate, deleteSetting);

//deliveryslotapi's
router.post('/createDeliverySlot', isAuthenticate, createSetting);
router.get('/getDeliverySlot', isAuthenticate, getSetting);
router.put('/updateDeliverySlot', isAuthenticate, updateSetting);
router.delete('/deleteDeliverySlot', isAuthenticate, deleteSetting);

//get-mvikaas account
router.get('/getMvikasAccount', isAuthenticate, getMvikasAccount);

//get lp
router.get('/getLp', isAuthenticate, getLp);

//cargo rates
router.get('/createCharges', isAuthenticate, createCharges);

//additionalCharges
router.post('/createAdditionalCharges', isAuthenticate, createAdditionalCharges);
router.get('/getAdditionalCharges', isAuthenticate, getAdditionalCharges);
router.put('/updateAdditionalCharges', isAuthenticate, updateAdditionalCharges);

//cargoratesRates
router.post('/createCargoRate', isAuthenticate, createCargoRate);
router.get('/rateSheetDownload/:id', isAuthenticate, rateSheetDownload);
router.get('/getCargoRates/:id', isAuthenticate, getCargoRates);
router.get('/getCargoRates', isAuthenticate, getCargoRates);
//vendor order apis
router.get('/order/list', isAuthenticate, VendorOrderController.getOrders)
router.get('/order/export', isAuthenticate, VendorOrderController.exportOrder)
router.get('/order/details', isAuthenticate, VendorOrderController.getOrderDetails)
router.post('/order/update/item/status', isAuthenticate, VendorOrderController.updateOrderItemStatus)
router.post('/order/upload/pod', isAuthenticate, VendorOrderController.uploadPOD)
router.post('/order/special/charge/create', isAuthenticate, VendorOrderController.createSpecialCharge)
router.get('/order/master/docket/download', UserOrderController.downloadMasterDocket)
router.get('/order/docket/download', UserOrderController.downloadDocket)
router.get('/order/label/download', UserOrderController.downloadOrderItemLabel)
//master data api
router.get('/category', isAuthenticate, MasterController.getCategory)
router.get('/order/review/type', isAuthenticate, MasterController.getOrderReviewType)
router.get('/subcategory', isAuthenticate, MasterController.getSubCategory)
router.get('/item/type', isAuthenticate, MasterController.getItemType)
router.get('/pickup/slot', isAuthenticate, MasterController.getPickupSlot)
router.get('/delivery/slot', isAuthenticate, MasterController.getDeliverySlot)
router.get('/order/status/type', MasterController.getOrderStatusType)
router.get('/master/vendor/service/list', MasterController.getServiceListByVendorId)

//invoice routes
router.get('/invoice/list', isAuthenticate, InvoiceController.getInvoiceList)
router.get('/invoice/export', isAuthenticate, InvoiceController.exportInvoice)
router.get('/invoice/download', isAuthenticate, InvoiceController.invoiceDownload)
router.get('/dashboard', isAuthenticate, DashboardController.dashboard)
router.get('/notification/list', isAuthenticate, DashboardController.notificationList)

//state charge
router.get("/state/charge/list", isAuthenticate, StateChargeController.getStateCharge)
router.post("/state/charge/add/update/delete", isAuthenticate, StateChargeController.createOrUpdateOrDeleteStateCharge)
router.get("/state/charge/change/status", isAuthenticate, StateChargeController.changeStateChargeStatus)

//Rate reconcilation route
router.post('/order/calculate/rate/reconcilation', isAuthenticate, OrderRateReconcilation.getRateReconcilation)
router.post('/order/calculate/rate/reconcilation/create',isAuthenticate, OrderRateReconcilation.createRateReconcilation)
router.get('/order/rate/reconcilation/list',isAuthenticate, OrderRateReconcilation.getRateReconcilationList)
router.get('/order/rate/reconcilation/dashboard',isAuthenticate, OrderRateReconcilation.getRateReconcilationDashboard)

module.exports = router;