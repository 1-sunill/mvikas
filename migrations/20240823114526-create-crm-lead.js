"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("CrmLeads", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      customer_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "CrmAllCustomers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      created_by_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "crmusers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      workspace_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "crmworkspaces",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      telesale_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "CrmTelesales",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      name: {
        type: Sequelize.STRING,
      },
      email: {
        type: Sequelize.STRING,
      },
      phone: {
        type: Sequelize.STRING,
      },
      gst_tin: {
        type: Sequelize.STRING,
      },
      company_name: {
        type: Sequelize.STRING,
      },
      purchase_officer_name: {
        type: Sequelize.STRING,
      },
      purchase_officer_phone: {
        type: Sequelize.STRING,
      },
      lead_source: {
        type: Sequelize.TINYINT,
        defaultValue: 0,
        comment:
          "0 => Social Media, 1 => Digital Marketing, 2 => Email Marketing	",
      },
      address: {
        type: Sequelize.STRING,
      },
      country_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "CrmCountries",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      state_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "CrmStates",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      city_id: {
        type: Sequelize.INTEGER,
      },
      pincode: {
        type: Sequelize.STRING,
      },
      shipping_address: {
        type: Sequelize.STRING,
      },
      shipping_country_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "CrmCountries",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      shipping_state_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "CrmStates",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      shipping_city_id: {
        type: Sequelize.INTEGER,
      },
      shipping_pincode: {
        type: Sequelize.STRING,
      },
      estimated_order_value: {
        type: Sequelize.STRING,
      },
      lead_priority: {
        type: Sequelize.TINYINT,
        defaultValue: 0,
        comment: "0 => Low, 1 => Medium, 2 => High	",
      },
      sales_remarks: {
        type: Sequelize.STRING,
      },
      destination_frieght_cost: {
        type: Sequelize.STRING,
      },
      vehicle_capacity: {
        type: Sequelize.STRING,
      },
      scm_remarks: {
        type: Sequelize.STRING,
      },
      status: {
        type: Sequelize.ENUM(
          "new",
          "open",
          "in-process",
          "unqualified",
          "converted",
          "order-lost",
          "order-received"
        ),
        allowNull: false,
        defaultValue: "new",
        comment: 'Possible values: "new", "open", "in-process", "unqualified", "converted", "order-lost", "order-received"',
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
    await queryInterface.dropTable("CrmLeads");
  },
};
