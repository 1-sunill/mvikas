const express = require("express");
const router = express.Router();
const ItemSpecigicationController = require("../../../../app/v1/crm/Controller/ItemSpecificationController");
const ProductController = require("../../../../app/v1/crm/Controller/ProductController");
const UserController = require("../../../../app/v1/crm/Controller/UserController");
const MenuController = require("../../../../app/v1/crm/Controller/MenuAccessController");
const auth = require("../../../../app/middleware/crmAuth");
const AuthController = require("../../../../app/v1/crm/Controller/AuthController");
const WorkSpaceController = require("../../../../app/v1/crm/Controller/WorkSpaceController");
const MasterController = require("../../../../app/v1/crm/Controller/MasterController");
const TelesaleController = require("../../../../app/v1/crm/Controller/TelesaleController");
const LeadController = require("../../../../app/v1/crm/Controller/LeadController");
const EstimateController = require("../../../../app/v1/crm/Controller/EstimateController");
const OrderController = require("../../../../app/v1/crm/Controller/OrderController");
const { Or } = require("typeorm");
const DashboardController = require("../../../../app/v1/crm/Controller/DashboardController");
const DispatchController = require("../../../../app/v1/crm/Controller/DispatchController");
const ReportController = require("../../../../app/v1/crm/Controller/ReportController");
const NotificationController = require("../../../../app/v1/crm/Controller/NotificationController");
const LedgerController = require("../../../../app/v1/crm/Controller/LedgerController");
router.use(auth);
/********************* Category *********************/
router.get("/category-list", ItemSpecigicationController.categoryList);
router.post("/add-category", ItemSpecigicationController.addCategories);
router.get("/get-category", ItemSpecigicationController.getCategories);
router.post("/update-category", ItemSpecigicationController.editCategory);

/********************* Unit *********************/
router.post("/add-unit", ItemSpecigicationController.addUnit);
router.get("/get-unit", ItemSpecigicationController.getUnit);
router.post("/update-unit", ItemSpecigicationController.editUnit);
router.get("/unit-list", ItemSpecigicationController.unitList);

/********************* Attribute *********************/
router.get("/attribute-list", ItemSpecigicationController.attributeList);

router.post("/add-attribute", ItemSpecigicationController.addAttribute);
router.post(
  "/add-attribute-value",
  ItemSpecigicationController.addAttributeValue
);
router.get("/get-attribute", ItemSpecigicationController.getAtrrValue);
router.post("/update-attribute", ItemSpecigicationController.updateAttribute);
router.post(
  "/update-attribute-values",
  ItemSpecigicationController.updateAttributeValue
);

/********************* Brand *********************/
router.get("/brand-list", ItemSpecigicationController.brandList);
router.post("/add-brand", ItemSpecigicationController.addBrand);
router.post("/update-brand", ItemSpecigicationController.updateBrand);
router.get("/get-brand", ItemSpecigicationController.getBrand);

/********************* Products *********************/
router.get("/product-list", ProductController.productList);
router.post("/add-product", ProductController.addProduct);
router.get("/get-product", ProductController.getProduct);
router.post("/update-product", ProductController.updateProduct);
router.post("/add-variant", ProductController.addVariant);
router.post("/update-variant", ProductController.updateVariant);
router.get("/variant-list", ProductController.variantList);

/********************* User management *********************/

router.get("/users-list", UserController.listUsers);
router.post("/add-users", UserController.addUser);
router.post("/update-users", UserController.updateUser);
router.post("/update-user-status", UserController.updateUserStatus);
router.post("/change-password", AuthController.changePassword);
router.get("/get-profile", AuthController.getProfile);
router.post("/update-user-profile", AuthController.updateUserProfile);
router.post("/switch-user", AuthController.switchUser);

router.get("/get-user", UserController.getUser);
router.get("/workspace-list", UserController.workspaceList);

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

/********************* Workspace management *********************/
router.post("/add-work-space", WorkSpaceController.addWorkSpace);
router.post("/update-work-space", WorkSpaceController.updateWorkSpace);
router.get("/get-workspace", WorkSpaceController.getWorkspace);
router.get("/list-workspace", WorkSpaceController.listWorkspace);
router.post("/workspace-status", WorkSpaceController.statusWorkspace);

/********************* Master module management *********************/
/******/
/*
 * Payment Term
 */
router.get("/list-payment-term", MasterController.listPaymentTerm);
router.post("/add-payment-term", MasterController.addPayementTerm);
router.post("/update-payment-term", MasterController.updatePaymentTerm);
router.post(
  "/update-status-payment-term",
  MasterController.updateStatusPaymentTerm
);
/*
 * Customer
 */
router.get("/list-customer", MasterController.listCustomer);
router.post("/add-customer", MasterController.addCustomer);
router.post("/update-customer", MasterController.updateCustomer);
router.post("/update-status-customer", MasterController.customerStatus);
router.post(
  "/update-credit-limit-status",
  MasterController.customerCreditLimitStatus
);

/*
 * Transport
 */
router.get("/list-transport", MasterController.listTransport);
router.post("/add-transport", MasterController.addTransport);
router.post("/update-transport", MasterController.updateTransport);
router.post("/update-status-transport", MasterController.transportStatus);
/*
 * Driver
 */
router.get("/list-driver", MasterController.listDriver);
router.post("/add-driver", MasterController.addDriver);
router.post("/update-driver", MasterController.updateDriver);

/********************************* Lead Management *******************************/
router.get("/country-list", TelesaleController.countryList);
router.get("/state-list", TelesaleController.stateList);
router.get("/city-list", TelesaleController.cityList);
/*
 * Pre lead
 */
router.post("/add-pre-lead", TelesaleController.addPreLead);
router.post("/update-pre-lead", TelesaleController.updatePreLead);
router.get("/list-pre-lead", TelesaleController.listPreLead);
router.get("/get-pre-lead", TelesaleController.getPreLeads);
router.get("/get-lead-history", TelesaleController.getHistory);
router.post("/pre-lead-pdf", TelesaleController.preLeadPdf);
router.post("/assign-user", TelesaleController.assignUser);

router.get("/get-document-type", LeadController.getDocumentType);
router.get("/unit-type", LeadController.getUnitype);
router.post("/upload-image", LeadController.imageUpload);
router.post("/create-lead", LeadController.createLead);
router.post("/update-lead", LeadController.updateLead);
router.get("/get-my-lead", LeadController.getLead);
router.get("/lead-list", LeadController.leadList);
router.post("/change-lead-status", LeadController.changeLeadStatus);
router.get("/reason-list", LeadController.reasonList);
router.post("/lead-pdf", LeadController.leadPdf);

/********************************* Estimate Management *******************************/
router.post("/create-estimate", EstimateController.addEstimate);
router.post("/update-estimate", EstimateController.updateEstimate);
router.get("/get-estimate", EstimateController.getEstimate);
router.get("/list-estimate", EstimateController.listEstimate);
router.get("/all-estimate", EstimateController.allEstimate);
router.post("/send-estimate-email", EstimateController.sendEstimateEmail);
router.post("/send-whatsapp-msg", EstimateController.sendEstimateWhatsapp);
router.post("/upload-po", EstimateController.uploadPo);
router.post("/delete-estimate", EstimateController.deleteEstimate);
router.post("/change-estimate-status", EstimateController.changeEstimateStatus);
router.post("/estimate-pdf", EstimateController.estimatePdf);
/********************************* Order Management *******************************/

router.post("/create-order", OrderController.createOrder);
router.post("/update-order", OrderController.updateOrder);
router.get("/get-order", OrderController.getOrder);
router.get("/list-order", OrderController.listOrder);
router.post("/order-pdf", OrderController.orderPdf);
router.get("/dashboard", DashboardController.dashboard);
router.get("/export-order", OrderController.exportOrderList);

/********************************* Dispatch Management *******************************/
router.get("/get-dispatch-order", DispatchController.getDispatchOrder);
router.post("/add-sub-dispatch", DispatchController.addSubdispatch);
router.get("/list-dispatch", DispatchController.listSubdispatch);
router.get(
  "/get-single-dispatch-order",
  DispatchController.getSingleDispatchOrder
);
router.post("/update-dispatch-order", DispatchController.updateSubdispatch);
router.post("/update-dept-status", DispatchController.updateDeptStatus);
router.post("/upload-customer-po", DispatchController.uploadPo);
router.post(
  "/add-subdispatch-payment-request",
  DispatchController.addSubdispatchPaymentRequest
);
router.post("/report-access-excess", DispatchController.reportShortageExcess);
router.post(
  "/update-report-shortage-excess",
  DispatchController.updateReportShortageExcess
);
router.post("/update-payment-doc", DispatchController.updatePaymentDoc);
router.get(
  "/single-order-item-detail",
  DispatchController.singleOrderItemDetail
);
router.post("/upload-document", DispatchController.uploadDocuent);
router.post("/update-payment-status", DispatchController.updatePaymentStatus);
router.post("/update-order-status", DispatchController.updateOrderStatus);
router.post("/payment-reminder", DispatchController.paymentReminder);
router.post("/generate-po", DispatchController.generatePo);
router.post(
  "/dispatch-item-delete",
  DispatchController.dispatchOrderItemDelete
);
router.post("/update-transporter", DispatchController.updateTransprter);
router.get("/scm-users-list", DispatchController.scmUsersList);
router.get("/vehicle-type-list", DispatchController.vehicleTypeList);
router.post("/add-eway-bill", DispatchController.addEwayBill);
router.post(
  "/update-dispatch-status",
  DispatchController.updateSubdispatchStatus
);
router.get("/export-dispatch", DispatchController.exportSubdispatchList);
router.post("/delete-doc", DispatchController.deleteDoc);
router.post("/generate-invoice", DispatchController.generateInvoice);
router.post("/send-dispatch-mail", DispatchController.sendEmailsOnButton);
router.post("/update-generate-po-status", DispatchController.generatePoStatus);
router.get("/generate-po-history", DispatchController.generatePoHistory);
router.post("/share-vendor-payment", DispatchController.shareVendorPayment);
/********************************* Report Management *******************************/

router.get("/report-list", ReportController.reportList);
router.post(
  "/send-schedule-report-email",
  ReportController.sendScheduleReportEmail
);
/********************************* Notification Management *******************************/

router.get("/notification-types", NotificationController.notificationType);
router.post(
  "/update-notification-type-status",
  NotificationController.updateStatus
);
router.get(
  "/notification-user-list",
  NotificationController.notificationUserList
);
router.post(
  "/update-notifiable-list",
  NotificationController.updateNotifiableList
);
router.post("/send-emails", NotificationController.sendUserTypeEmail);
router.get("/notification-list", NotificationController.notificationList);

/*************************** Ledger ******************************************/
router.get("/ledger", LedgerController.ledger);
module.exports = router;
