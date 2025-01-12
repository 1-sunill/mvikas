"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("CrmVendors", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
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
      assign_vendor_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "CrmAllCustomers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      name: {
        type: Sequelize.STRING,
      },
      address: {
        type: Sequelize.STRING,
      },
      payment_term_id: {
        type: Sequelize.INTEGER,
      },
      payment_term_text: {
        type: Sequelize.STRING,
      },
      pickup_address: {
        type: Sequelize.STRING,
      },
      quantity: {
        type: Sequelize.INTEGER,
      },
      email: {
        type: Sequelize.STRING,
      },
      contact_name: {
        type: Sequelize.STRING,
      },
      contact_number: {
        type: Sequelize.STRING,
      },
      gst_tin: {
        type: Sequelize.STRING,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
      },
      status: {
        type: Sequelize.ENUM,
        values: ["0", "1"],
        allowNull: false,
        defaultValue: "0",
        comment: "Status types: 0, 1",
      },

      unit_id: {
        type: Sequelize.INTEGER,
      },
      movement: {
        type: Sequelize.INTEGER,
      },
      freight_details: {
        type: Sequelize.STRING,
      },
      scm_tat: {
        type: Sequelize.DATE,
      },
      delivery_date: {
        type: Sequelize.DATE,
      },
      remark: {
        type: Sequelize.TEXT,
      },
      deletedAt: {
        type: Sequelize.DATE,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("CrmVendors");
  },
};
