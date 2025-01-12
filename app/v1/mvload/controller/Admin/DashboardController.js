const {
  success,
  failed,
  serverError,
  validateFail,
  response,
} = require("../../../../helper/response");

const {
  SYSTEM_FAILURE,
  ORDER_CONSTANTS,
} = require("../../../../helper/message");
const db = require("../../../../../models");
const _ = require("lodash");
const Service = db.mvService;
const Associate = db.mvAssociateVendors;
const User = db.mvUser;
const Pincode = db.mvPincode;
const ZonePinMap = db.mvZonePinMap;
const ZoneServiceMap = db.mvZoneServiceMap;
const VendorRate = db.mvVendorRates;
const Order = db.mvorder;
const OrderItemDimension = db.mvOrderDimension;
const OrderItem = db.mvOrderItem;
const OrderItemStatus = db.mvOrderedItemStatus;
const OrderedItemsStatus = db.mvOrderedItemStatus;
const OrderStatusType = db.mvOrderStatusType;
const AccountDetails = db.mvAccountDetails;
const Notification = db.mvnotification;
const moment = require("moment");
const ExcelJS = require("exceljs");

const { Validator } = require("node-input-validator");
const { fn, col, Op, where, literal } = require("sequelize");
module.exports = {
  dashboard: async (req, res) => {
    try {
      // Get the current month's start and end dates
      let startOfMonth = moment().startOf("month").toDate();
      let endOfMonth = moment().endOf("month").toDate();

      let order = await Order.findAll({
        where: {
          paymentStatus: {
            [Op.ne]: "Initiated",
          },
          userId: req.decodedData.id,
        },
        attributes: [
          [fn("MONTH", col("createdAt")), "month"],
          [fn("count", "*"), "count"],
        ],
        group: ["month"],
      });
      let reportCount = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (let i = 0; i < order.length; i++) {
        reportCount.splice(
          order[i].dataValues.month - 1,
          0,
          order[i].dataValues.count
        );
      }
      let totalUser = await User.count({
        where: {
          isUser: true,
        },
      });

      // Get the number of users who joined this month
      let monthlyUser = await User.count({
        where: {
          isUser: true,
          createdAt: {
            [Op.between]: [startOfMonth, endOfMonth],
          },
        },
      });

      // Calculate the percentage
      let totalUserPercentage =
        totalUser > 0 ? (monthlyUser / totalUser) * 100 : 0;
      let totalVendor = await User.count({
        where: {
          isVendor: true,
        },
      });
      let monthlyVednor = await User.count({
        where: {
          isVendor: true,
          createdAt: {
            [Op.between]: [startOfMonth, endOfMonth],
          },
        },
      });

      // Calculate the percentage
      let totalVendorPercentage =
        totalVendor > 0 ? (monthlyVednor / totalVendor) * 100 : 0;
      let orderCount = await Order.count({
        where: {
          paymentStatus: {
            [Op.ne]: "Initiated",
          },
        },
      });
      // Get the number of users who joined this month
      let monthlyOrder = await Order.count({
        where: {
          paymentStatus: {
            [Op.ne]: "Initiated",
          },
          createdAt: {
            [Op.between]: [startOfMonth, endOfMonth],
          },
        },
      });
      let totalOrderPercentage =
        orderCount > 0 ? (monthlyOrder / orderCount) * 100 : 0;

      let totalPaylaterAmount = await Order.sum("totalAmount", {
        where: {
          paymentMode: "Paylater",
          paymentStatus: {
            [Op.ne]: "Initiated",
          },
        },
      });

      let monthlyPaylater = await Order.sum("totalAmount", {
        where: {
          paymentMode: "Paylater",
          paymentStatus: {
            [Op.ne]: "Initiated",
          },
          createdAt: {
            [Op.between]: [startOfMonth, endOfMonth],
          },
        },
      });
      let monthlyPayLaterPercentage =
        totalPaylaterAmount > 0
          ? (monthlyPaylater / totalPaylaterAmount) * 100
          : 0;
      let booked = await Order.count({
        where: {
          latestStatus: 1,
          paymentStatus: {
            [Op.ne]: "Initiated",
          },
        },
      });
      let pickedUp = await Order.count({
        where: {
          latestStatus: 2,
          paymentStatus: {
            [Op.ne]: "Initiated",
          },
        },
      });
      let transit = await Order.count({
        where: {
          latestStatus: 3,
          paymentStatus: {
            [Op.ne]: "Initiated",
          },
        },
      });
      let rto = await Order.count({
        where: {
          latestStatus: 6,
          paymentStatus: {
            [Op.ne]: "Initiated",
          },
        },
      });
      let delivered = await Order.count({
        where: {
          latestStatus: 4,
          paymentStatus: {
            [Op.ne]: "Initiated",
          },
        },
      });
      let cancelled = await Order.count({
        where: {
          latestStatus: 5,
          paymentStatus: {
            [Op.ne]: "Initiated",
          },
        },
      });
      const totalOrders = await Order.findAll({
        where: {
          paymentStatus: {
            [Op.ne]: "Initiated",
          },
        },
        attributes: ["totalAmount", "V_totalAmount"],
      });

      let totalAmountSum = await Order.sum("totalAmount", {
        where: {
          paymentStatus: {
            [Op.ne]: "Initiated",
          },
        },
      });

      let monthlyProfit = await Order.sum("totalAmount", {
        where: {
          paymentStatus: {
            [Op.ne]: "Initiated",
          },
          createdAt: {
            [Op.between]: [startOfMonth, endOfMonth],
          },
        },
      });
      let monthlyProfitPercentage =
        totalAmountSum > 0 ? (monthlyProfit / totalAmountSum) * 100 : 0;

      let totalAmountSumPurchase = await Order.sum("V_totalAmount", {
        where: {
          paymentStatus: {
            [Op.ne]: "Initiated",
          },
        },
      });
      let monthlyVProfit = await Order.sum("totalAmount", {
        where: {
          paymentStatus: {
            [Op.ne]: "Initiated",
          },
          createdAt: {
            [Op.between]: [startOfMonth, endOfMonth],
          },
        },
      });
      let monthlyVProfitPercentage =
        totalAmountSumPurchase > 0
          ? (monthlyVProfit / totalAmountSumPurchase) * 100
          : 0;
      let orderProfit = [];
      let orderLoss = [];
      for (let i = 0; i < totalOrders.length; i++) {
        if (
          parseFloat(totalOrders[i].totalAmount).toFixed(2) >
          parseFloat(totalOrders[i].V_totalAmount).toFixed(2)
        ) {
          orderProfit.push(
            parseFloat(totalOrders[i].totalAmount).toFixed(2) -
              parseFloat(totalOrders[i].V_totalAmount).toFixed(2)
          );
        } else {
          orderLoss.push(
            parseFloat(totalOrders[i].V_totalAmount).toFixed(2) -
              parseFloat(totalOrders[i].totalAmount).toFixed(2)
          );
        }
      }
      // Calculate netPL
      let netPL = parseFloat(totalAmountSum - totalAmountSumPurchase).toFixed(
        2
      );

      // Calculate percentage of netPL in relation to totalAmountSum
      let netPLPercentage =
        totalAmountSum > 0 ? (netPL / totalAmountSum) * 100 : 0;
      let data = {
        totalOrderPercentage: totalOrderPercentage.toFixed(2),
        totalUserPercentage: parseFloat(totalUserPercentage).toFixed(2),
        monthlyProfitPercentage: monthlyProfitPercentage.toFixed(2),
        totalVendorPercentage: totalVendorPercentage.toFixed(2),
        orderInvoicePercentage: totalOrderPercentage.toFixed(2),
        monthlyVProfitPercentage: monthlyVProfitPercentage.toFixed(2),
        monthlyPayLaterPercentage: monthlyPayLaterPercentage.toFixed(2),
        netPLPercentage:netPLPercentage.toFixed(2),
        avgProfitPerOrderPercentage:0.00,
        avgLossPerOrderPercentage:0.00,
        totalUser: totalUser,
        totalVendor: totalVendor,
        noOfOrder: orderCount,
        totalOrderValue: totalAmountSum
          ? parseFloat(totalAmountSum).toFixed(2)
          : 0,
        totalPaymentPending: totalPaylaterAmount
          ? parseFloat(totalPaylaterAmount).toFixed(2)
          : 0,
        noOfInvoice: orderCount,
        booked: booked,
        pickedUp: pickedUp,
        transit: transit,
        rto: rto,
        delivered: delivered,
        cancelled: cancelled,
        reportChart: reportCount,
        orderChart: [booked, pickedUp, transit, delivered, cancelled, rto],
        averageProfitPerOrder: parseFloat(
          orderProfit.reduce((acc, currentValue) => acc + currentValue, 0) /
            orderProfit.length
        ).toFixed(2),
        averageLossPerOrder: parseFloat(
          orderLoss.reduce((acc, currentValue) => acc + currentValue, 0) /
            orderLoss.length
        ).toFixed(2),
        totalSalesValue: parseFloat(totalAmountSum).toFixed(2),
        totalPurchaseValue: parseFloat(totalAmountSumPurchase).toFixed(2),
        netPL: parseFloat(totalAmountSum - totalAmountSumPurchase).toFixed(2),
      };
      return success(res, "Admin Dashboard", data);
    } catch (error) {
      console.error(SYSTEM_FAILURE, error);
      return failed(res, SYSTEM_FAILURE);
    }
  },
};
