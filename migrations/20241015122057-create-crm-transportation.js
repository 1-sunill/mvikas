"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("CrmTransportations", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      sub_dispatch_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "CrmSubdispatches",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      transporter_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "CrmTransports",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      driver_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "CrmDrivers",
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
      address: {
        type: Sequelize.STRING,
      },
      email: {
        type: Sequelize.STRING,
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
      payment_terms: {
        type: Sequelize.STRING,
      },
      freight: {
        type: Sequelize.DECIMAL(19, 14),
      },
      gst_tin: {
        type: Sequelize.STRING,
      },
      driver_name: {
        type: Sequelize.STRING,
      },
      driver_phone: {
        type: Sequelize.STRING,
      },
      vehicle_number: {
        type: Sequelize.STRING,
      },
      vehicle_type_id: {
        type: Sequelize.INTEGER,
      },
      quantity: {
        type: Sequelize.INTEGER,
      },
      builty_no_lr_no: {
        type: Sequelize.STRING,
      },
      terms_of_delivery: {
        type: Sequelize.STRING,
      },
      test_certificate_no: {
        type: Sequelize.STRING,
      },
      tracking_url: {
        type: Sequelize.STRING,
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
    await queryInterface.dropTable("CrmTransportations");
  },
};
