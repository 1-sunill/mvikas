const { Validator } = require("node-input-validator");
const {
  serverError,
  success,
  validateFail,
  failed,
} = require("../../../helper/response");
const db = require("../../../../models");
const { Op, Sequelize } = require("sequelize");
const {
  USER_CONSTANTS,
  SYSTEM_FAILURE,
  ADMIN_CONSTANTS,
} = require("../../../helper/message");
const TeleSale = db.CrmTelesale;
const Lead = db.CrmLead;
const Estimate = db.CrmEstimate;
const Order = db.CrmOrder;
const CrmSubdispatch = db.CrmSubdispatch;

let baseUrl = process.env.APP_URL;
module.exports = {
  dashboard: async (req, res) => {
    try {
      const request = req.query;
      let whereCondition = {}; // Initialize as an empty object

      // Add workspace condition if workspaceId is present
      if (request.workspaceId > 1) {
        whereCondition.workspace_id = request.workspaceId;
      }

      // Count for TeleSales based on whereCondition
      const teleSaleCount = await TeleSale.count({
        where: whereCondition,
      });

      // Estimate count without specific conditions
      const estimateCount = await Estimate.count({
        where:  whereCondition ,
      });

      // Count leads by specific statuses
      const leadCounts = await Lead.findOne({
        where: whereCondition, // Use the same condition for leads
        attributes: [
          [Sequelize.fn("COUNT", Sequelize.col("id")), "totalLeadCount"],
          [
            Sequelize.fn(
              "COUNT",
              Sequelize.literal(`CASE WHEN status = 'new' THEN 1 END`)
            ),
            "newLeadCount",
          ],
          [
            Sequelize.fn(
              "COUNT",
              Sequelize.literal(`CASE WHEN status = 'open' THEN 1 END`)
            ),
            "openLeadCount",
          ],
          [
            Sequelize.fn(
              "COUNT",
              Sequelize.literal(`CASE WHEN status = 'in-process' THEN 1 END`)
            ),
            "inprogressLeadCount",
          ],
          [
            Sequelize.fn(
              "COUNT",
              Sequelize.literal(
                `CASE WHEN status = 'order-received' THEN 1 END`
              )
            ),
            "orderRecievedCount",
          ],
          [
            Sequelize.fn(
              "COUNT",
              Sequelize.literal(`CASE WHEN status = 'unqualified' THEN 1 END`)
            ),
            "unqualifiedRecievedCount",
          ],
          [
            Sequelize.fn(
              "COUNT",
              Sequelize.literal(`CASE WHEN status = 'converted' THEN 1 END`)
            ),
            "convertedRecievedCount",
          ],
        ],
        raw: true,
      });

      // Count orders by specific statuses
      const orderCounts = await Order.findOne({
        where: { workspaceId: request.workspaceId }, // Reused whereCondition if applicable
        attributes: [
          [Sequelize.fn("COUNT", Sequelize.col("id")), "totalOrderCount"],
          [
            Sequelize.fn(
              "COUNT",
              Sequelize.literal(`CASE WHEN status = 'pending' THEN 1 END`)
            ),
            "pendingOrderCount",
          ],
          [
            Sequelize.fn(
              "COUNT",
              Sequelize.literal(`CASE WHEN status = 'approved' THEN 1 END`)
            ),
            "approvedOrderCount",
          ],
          [
            Sequelize.fn(
              "COUNT",
              Sequelize.literal(`CASE WHEN status = 'cancel' THEN 1 END`)
            ),
            "cancelOrderCount",
          ],
          [
            Sequelize.fn(
              "COUNT",
              Sequelize.literal(`CASE WHEN status = 'revised' THEN 1 END`)
            ),
            "revisedOrderCount",
          ],
          [
            Sequelize.fn(
              "COUNT",
              Sequelize.literal(`CASE WHEN status = 'declined' THEN 1 END`)
            ),
            "declinedOrderCount",
          ],
          [
            Sequelize.fn(
              "COUNT",
              Sequelize.literal(
                `CASE WHEN status_by_scm = 'declined' THEN 1 END`
              )
            ),
            "cancelSubdispatch",
          ],
        ],
        raw: true,
      });

      // Fetch recent orders
      const recentOrders = await Order.findAll({
        where: { workspaceId: request.workspaceId },
        order: [["id", "DESC"]],
        limit: 5,
      });

      // Fetch the 5 most recent sub-dispatches
      const recentSubdispatch = await Order.findAll({
        where: {
          status_by_finance: "approved",
          status_by_sales: "approved",
          workspaceId: request.workspaceId,
        },
        order: [["id", "DESC"]],
        limit: 5,
      });

      // Fetch counts for different dispatch and sub-dispatch statuses
      const [
        totalDispatch,
        totalSubDispatch,
        pendingDispatch,
        progressSubdispatch,
        completeSubdispatch,
        cancelSubdispatch,
        completedispatch,
        pendingSubDispatch,
      ] = await Promise.all([
        Order.count({
          where: {
            status_by_finance: "approved",
            status_by_sales: "approved",
            workspaceId: request.workspaceId,
          },
        }),
        Order.count({
          where: {
            status_by_scm: "approved",
            workspaceId: request.workspaceId,
          },
        }),
        Order.count({
          where: {
            status_by_scm: "pending",
            workspaceId: request.workspaceId,
          },
        }),
        CrmSubdispatch.count(),
        CrmSubdispatch.count({
          where: {
            status: "complete",
          },
        }),
        Order.count({
          where: {
            status_by_scm: "declined",
            workspaceId: request.workspaceId,
          },
        }),
        Order.count({
          where: {
            status_by_scm: "approved",
            workspaceId: request.workspaceId,
          },
        }),
        CrmSubdispatch.count({
          where: {
            status: "pending",
          },
        }),
      ]);

      const newData = {
        preOrderOverView: { teleSaleCount, estimateCount, ...leadCounts },
        ordersOverView: { ...orderCounts },
        recentOrders: recentOrders,
        dispatchOverView: {
          totalDispatch,
          totalSubDispatch,
          pendingDispatch,
          pendingSubDispatch,
          progressSubdispatch,
          completeSubdispatch,
          cancelSubdispatch,
          completedispatch,
        },
        recentSubdispatch: recentSubdispatch,
      };

      return success(res, "Data fetched successfully", newData);
    } catch (error) {
      console.error({ error });
      return serverError(res, SYSTEM_FAILURE);
    }
  },
};
