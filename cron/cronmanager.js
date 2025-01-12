const mongoose = require("mongoose");
const moment = require("moment");
const db = require("../models");
const Order = db.CrmOrder;
const CrmDispatchEwayBills = db.CrmDispatchEwayBill;
const CrmSubdispatch = db.CrmSubdispatch;
const User = db.crmuser;
const Workspace = db.crmworkspace;
const CrmAllCustomer = db.CrmAllCustomer;
const ejs = require("ejs");
const fs = require("fs");
const { Op, Sequelize } = require("sequelize");
const { sendNotificationEmail } = require("../app/helper/sendSms");
module.exports = {
  ewayExpiry: async () => {
    try {
      const dispatchEwayBills = await CrmDispatchEwayBills.findAll();

      let htmlContent;

      try {
        htmlContent = fs.readFileSync("views/emails/eway_expiry.ejs", "utf-8");
      } catch (err) {
        console.error("Error reading EJS template file:", err);
        // return serverError(res, "Failed to read template file");
      }

      //   const addEightDays = moment().add(8, "days").utc().format("YYYY-MM-DD");
      const currentDate = moment().utc().format("YYYY-MM-DD");

      for (const element of dispatchEwayBills) {
        console.log("element.ewayExpDate", element.ewayExpDate);
        const ewayExpDateFormatted = moment(element.ewayExpDate)
          .utc()
          .format("YYYY-MM-DD");

        const dispatch = await CrmSubdispatch.findOne({
          where: { id: element.sub_dispatch_id },
        });

        if (!dispatch) {
          console.warn(
            `Dispatch not found for sub_dispatch_id: ${element.sub_dispatch_id}`
          );
          continue;
        }

        const order = await Order.findOne({ where: { id: dispatch.orderId } });
        if (!order) {
          console.warn(`Order not found for orderId: ${dispatch.orderId}`);
          continue;
        }

        const workspace = await Workspace.findOne({
          where: { id: order.workspaceId },
        });

        if (!workspace) {
          console.warn(
            `Workspace not found for workspaceId: ${order.workspaceId}`
          );
          continue;
        }

        const users = await User.findAll({
          where: { department: { [Sequelize.Op.in]: ["finance", "sales"] } },
          attributes: ["email", "id"],
        });
        const emails = users.map((user) => user.email);
        const Ids = users.map((user) => user.id);

        console.log(ewayExpDateFormatted);
        console.log(currentDate);
        if (ewayExpDateFormatted === currentDate) {
          console.log("Here is the data............");
          const dynamicData = {
            billNo: element.ebillno,
            order_no: element.order_no,
            url: "https://crm.mvikas.in/",
            team: workspace.name,
            legal_name: workspace.legal_name,
            address: workspace.address,
            phone: workspace.phone,
            email: workspace.email,
            banner: workspace.banner_path,
            imageUrl: workspace.logo_path,
          };

          const compiledHtml = ejs.render(htmlContent, dynamicData);

          let entities = [
            {
              email: emails,
              ids: Ids,
              subject: `Renew Your eWay Bill No. ${element.ebillno}`,
              html: compiledHtml,
            },
          ];
          if (entities.length > 0) {
            // console.log({ entities });
            await sendNotificationEmail(
              entities,
              "salesgo_eway_expiry",
              "user",
              workspace.id
            );
          }
        }
      }
    } catch (error) {
      console.error("Error in ewayExpiry:", error);
    }
  },
  orderApprovalPending: async () => {
    try {
      const orders = await Order.findAll({
        where: { status_by_sales: "pending", status_by_finance: "pending" },
      });

      let htmlContent;
      try {
        htmlContent = fs.readFileSync(
          "views/emails/order_approval_pending.ejs",
          "utf-8"
        );
      } catch (err) {
        console.error("Error reading EJS template file:", err);
        return;
      }

      for (const order of orders) {
        const workspace = await Workspace.findOne({
          where: { id: order.workspaceId },
        });

        if (!workspace) {
          console.warn(
            `Workspace not found for workspaceId: ${order.workspaceId}`
          );
          continue;
        }
        const customer = await CrmAllCustomer.findOne({
          where: { id: order.customerId },
        });
        const users = await User.findAll({
          where: { department: { [Sequelize.Op.in]: ["finance", "sales"] } },
          attributes: ["email", "name"],
        });

        for (const user of users) {
          const dynamicData = {
            order_no: order.order_no,
            name: user.name,
            customerName: customer.name,
            url: "https://crm.mvikas.in/",
            team: workspace.name,
            legal_name: workspace.legal_name,
            address: workspace.address,
            phone: workspace.phone,
            email: workspace.email,
            banner: workspace.banner_path,
            imageUrl: workspace.logo_path,
          };

          const compiledHtml = ejs.render(htmlContent, dynamicData);

          const entity = {
            email: user.email,
            ids: user.id,
            subject: `SalesGo Order No. ${order.order_no} Approval`,
            html: compiledHtml,
          };

          await sendNotificationEmail(
            [entity],
            "salesgo_order_approval",
            "user",
            workspace.id
          );
        }
      }
    } catch (error) {
      console.error("Error in orderApprovalPending:", error);
    }
  },
  generatePoApproval: async () => {
    try {
      // Fetch all required data in bulk to minimize database calls within the loop
      const dispatchEwayBills = await CrmDispatchEwayBills.findAll({
        include: [
          {
            model: CrmSubdispatch,
            as: "subDispatch",
            include: [
              {
                model: Order,
                as: "singleOrder",
                required: false,
                // where: {
                //   status_by_finance: "pending",
                //   status_by_scm: "pending",
                // },
                // include: [{ model: Workspace, as: 'workspace' }],
              },
            ],
          },
        ],
      });

      let htmlContent;
      try {
        htmlContent = fs.readFileSync(
          "views/emails/generate_po_approval.ejs",
          "utf-8"
        );
      } catch (err) {
        console.error("Error reading EJS template file:", err);
        return;
      }

      // Get users outside the loop as their selection criteria are the same for all dispatches
      const users = await User.findAll({
        where: {
          department: { [Sequelize.Op.in]: ["finance", "scm"] },
        },
        attributes: ["email", "id"],
      });

      const emails = users.map((user) => user.email);
      const Ids = users.map((user) => user.id);

      for (const element of dispatchEwayBills) {
        const dispatch = element.subDispatch;
        // console.log({ element });
        if (!dispatch) {
          console.warn(
            `Dispatch not found for sub_dispatch_id: ${element.sub_dispatch_id}`
          );
          continue;
        }

        const order = dispatch.singleOrder.dataValues;
        // console.log("order.status_by_finance", order);
        if (
          !order ||
          order.status_by_finance !== "pending" ||
          order.status_by_scm !== "pending"
        ) {
          console.warn(
            `Order not pending for finance and SCM for orderId: ${dispatch.orderId}`
          );
          continue;
        }

        // Proceed with email sending
        const workspace = await Workspace.findOne({
          where: { id: order.workspaceId },
        });
        if (!workspace) {
          console.warn(
            `Workspace not found for workspaceId: ${order.workspaceId}`
          );
          continue;
        }

        // Generate PO Send emails when status is pending in finance and SCM
        const dynamicData = {
          order_no: order.order_no,
          url: "https://crm.mvikas.in/",
          team: workspace.name,
          legal_name: workspace.legal_name,
          address: workspace.address,
          phone: workspace.phone,
          email: workspace.email,
          banner: workspace.banner_path,
          imageUrl: workspace.logo_path,
          po_no: order.customer_po_no,
          dispatchId: dispatch.id,
        };

        const compiledHtmlGPO = ejs.render(htmlContent, dynamicData);

        let entities = [
          {
            email: emails,
            ids: Ids,
            subject: `SalesGo MVIKAS PO No. ${order.customer_po_no} Approval`,
            html: compiledHtmlGPO,
          },
        ];
        // console.log({ entities });
        if (entities.length > 0) {
          await sendNotificationEmail(
            entities,
            "salesgo_po_approval",
            "user",
            workspace.id
          );
        }
      }
    } catch (error) {
      console.error("Error in generatePoApproval:", error);
    }
  },
};
