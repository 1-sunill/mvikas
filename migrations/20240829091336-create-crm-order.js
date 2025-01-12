"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("CrmOrders", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      order_no: {
        type: Sequelize.BIGINT,
      },
      workspaceId: {
        type: Sequelize.INTEGER,
        references: {
          model: "crmworkspaces",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      userId: {
        type: Sequelize.INTEGER,
        references: {
          model: "crmusers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      estimate_id: {
        type: Sequelize.INTEGER,
      },
      sales_rep_name: {
        type: Sequelize.STRING,
      },
      customerId: {
        type: Sequelize.INTEGER,
        references: {
          model: "CrmAllCustomers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      payment_term_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "CrmPaymentTerms",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      name: {
        type: Sequelize.STRING,
      },
      phone: {
        type: Sequelize.STRING,
      },
      email: {
        type: Sequelize.STRING,
      },
      billing_address: {
        type: Sequelize.TEXT,
      },
      shipping_address: {
        type: Sequelize.TEXT,
      },
      billing_gst_tin: {
        type: Sequelize.STRING,
      },
      shipping_gst_tin: {
        type: Sequelize.STRING,
      },
      customer_po_no: {
        type: Sequelize.STRING,
      },
      customer_payment_method: {
        type: Sequelize.STRING,
      },
      po_date: {
        type: Sequelize.DATE,
      },
      customer_payment_term: {
        type: Sequelize.STRING,
      },
      note: {
        type: Sequelize.STRING,
      },
      term_and_condition: {
        type: Sequelize.TEXT,
      },
      action_by: {
        type: Sequelize.INTEGER,
        references: {
          model: "crmusers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      finance_user_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "crmusers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      status: {
        type: Sequelize.ENUM,
        values: ["pending", "approved", "revised", "declined"],
        allowNull: false,
        defaultValue: "pending",
        comment: "Status types: pending, approved, revised,declined",
      },
      comment: {
        type: Sequelize.TEXT,
      },
      status_by_finance: {
        type: Sequelize.ENUM,
        values: ["pending", "approved", "revised", "declined"],
        allowNull: false,
        defaultValue: "pending",
        comment: "Status types: pending, approved, revised,declined",
      },
      comment_by_finance: {
        type: Sequelize.TEXT,
      },
      status_by_scm: {
        type: Sequelize.ENUM,
        values: ["pending", "approved", "revised", "declined"],
        allowNull: false,
        defaultValue: "pending",
        comment: "Status types: pending, approved, revised,declined",
      },
      comment_by_scm: {
        type: Sequelize.TEXT,
      },
      status_by_sales: {
        type: Sequelize.ENUM,
        values: ["pending", "approved", "revised", "declined"],
        allowNull: false,
        defaultValue: "pending",
        comment: "Status types: pending, approved, revised,declined",
      },
      comment_by_sales: {
        type: Sequelize.TEXT,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      deletedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("CrmOrders");
  },
};
