"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("CrmNotifiables", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      workspace_id: {
        type: Sequelize.INTEGER,
      },
      notification_type_id: {
        type: Sequelize.INTEGER,
      },
      notifiable_type: {
        type: Sequelize.STRING,
      },
      notifiable_id: {
        type: Sequelize.INTEGER,
        comment: "Customer,Vendor,Transporter & User Id",
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
    await queryInterface.dropTable("CrmNotifiables");
  },
};
