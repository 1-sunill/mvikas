const express = require("express");
const router = express.Router();
const AuthController = require("../../../../app/v1/crm/Controller/AuthController");
const OrderController = require("../../../../app/v1/crm/Controller/OrderController");

router.post("/login", AuthController.login);
router.get("/export-order", OrderController.exportOrderList);

module.exports = router;
