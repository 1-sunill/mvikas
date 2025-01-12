const { Validator } = require("node-input-validator");
const {
  serverError,
  failed,
  success,
  validateFail,
} = require("../../../helper/response");
const db = require("../../../../models");
const { Op } = require("sequelize");
const CrmAllCustomer = db.CrmAllCustomer;
const TeleSale = db.CrmTelesale;
const Lead = db.CrmLead;
const Estimate = db.CrmEstimate;
const Order = db.CrmOrder;
const CrmSubdispatch = db.CrmSubdispatch;
const OrderItem = db.CrmOrderItems;
const Payment = db.CrmPaymentTerm;
const AssignUser = db.CrmAssign;
const User = db.crmuser;

module.exports = {
  ledger: async (req, res) => {
    try {
      const requests = req.query;
      const v = new Validator(requests, {
        userId: "required",
        userType: "required",
      });
      const matched = await v.check();
      if (!matched) {
        return validateFail(res, v);
      }

      const user = await CrmAllCustomer.findOne({
        where: { id: requests.userId },
        include: { model: Payment, as: "paymentData", attributes: ["name"] },
      });
      if (!user) {
        return failed(res, "User not found.");
      }
      const preLead = await TeleSale.findAll({
        where: { customer_id: requests.userId },
        include: [
          {
            model: AssignUser,
            as: "assignData",
            where: { documentable_type: "Telesales" },
            required: false,
            include: [
              {
                model: User,
                as: "user",
                attributes: ["name"],
              },
            ],
          },
        ],
        order: [["id", "desc"]],
      });
      const lead = await Lead.findAll({
        where: { customer_id: requests.userId },
        include: [
          {
            model: AssignUser,
            as: "assignUser",
            where: {
              documentable_type: "Lead",
            },
            attributes: [
              "id",
              "assignable_id",
              "assign_by_id",
              "assign_to_id",
              "assign_reason_id",
              "comment",
            ],
            include: [
              {
                model: User,
                as: "user",
                attributes: ["name"],
              },
            ],
          },
        ],
        order: [["id", "DESC"]],
      });
      const estimate = [];

      for (let i = 0; i < lead.length; i++) {
        const element = lead[i];
        const estimatesForLead = await Estimate.findAll({
          where: { lead_id: element.id },
          include: {
            model: Lead,
            as: "leadData",
            attributes: ["id", "name", "status"],
            include: [
              {
                model: AssignUser,
                as: "assignUser",
                attributes: [
                  "id",
                  "assign_by_id",
                  "assign_to_id",
                  "assign_reason_id",
                  "comment",
                ],
                include: [
                  {
                    model: User,
                    as: "user",
                    attributes: ["name"],
                  },
                ],
              },
            ],
          },
        });
        console.log("element.id", element.id);
        estimate.push(...estimatesForLead);
      }

      const orders = await Order.findAll({
        where: { customerId: requests.userId },
        include: {
          model: AssignUser,
          as: "assignUser",
          required: false,
          where: { documentable_type: "CrmDispatch" },
          attributes: [
            "id",
            "assignable_id",
            "assign_by_id",
            "assign_to_id",
            "assign_reason_id",
            "comment",
          ],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["name"],
            },
          ],
        },
      });
      const orderIds = orders.map((order) => order.id);

      const dispatches = await CrmSubdispatch.findAll({
        where: { isPlanning: 1, id: { [Op.in]: orderIds } },
        include: [
          {
            model: OrderItem,
            as: "orderItems",
            required: false,
            where: { itemable_type: "dispatch" },
          },
        ],
      });

      let totalProfit = 0;
      let grandTotalAmount = 0;

      // Iterate over each dispatch to calculate totals
      dispatches.forEach((dispatch) => {
        if (dispatch.orderItems && dispatch.orderItems.length > 0) {
          dispatch.orderItems.forEach((item) => {
            const price = parseFloat(item.price);
            const salesPriceRange = parseFloat(item.sales_price_range);
            const quantity = parseFloat(item.quantity);

            if (!isNaN(price) && !isNaN(salesPriceRange) && !isNaN(quantity)) {
              totalProfit += (price - salesPriceRange) * quantity;
            }

            const taxableAmount = price * quantity;
            const totalAmount =
              taxableAmount * (item.gst_rate / 100) + taxableAmount;
            grandTotalAmount += totalAmount;
            dispatch.dataValues.poAmount = grandTotalAmount;
            // Remove orderItems from the response
            delete dispatch.dataValues.orderItems;
          });
        }
      });

      // console.log("Total Profit:", totalProfit);
      // console.log("Grand Total Amount:", grandTotalAmount);

      console.log({ orderIds });
      const details = {
        // overView: user,
        // preLead,
        // lead,
        // estimate,
        // orders,
        dispatches,
      };

      return success(res, "Data fetched successfully.", details);
    } catch (error) {
      console.log({ error });
      return serverError(res, "Internal server error.");
    }
  },
};
