"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("CrmDispatchEwayBills", {
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
      ebillno: {
        type: Sequelize.STRING,
      },
      from: {
        type: Sequelize.STRING,
      },
      ewayDate: {
        type: Sequelize.DATE,
      },
      ewayExpDate: {
        type: Sequelize.DATE,
      },
      ewayFile: {
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
    await queryInterface.dropTable("CrmDispatchEwayBills");
  },
};
