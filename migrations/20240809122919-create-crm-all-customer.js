"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("CrmAllCustomers", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      name: {
        type: Sequelize.STRING,
      },
      email: {
        type: Sequelize.STRING,
      },
      mobile: {
        type: Sequelize.STRING,
      },
      companyName: {
        type: Sequelize.STRING,
      },
      legelName: {
        type: Sequelize.STRING,
      },
      customerAddress: {
        type: Sequelize.STRING,
      },
      gstIn: {
        type: Sequelize.STRING,
      },
      pickupLocation: {
        type: Sequelize.STRING,
      },
      contactName: {
        type: Sequelize.STRING,
      },
      paymentTermId: {
        type: Sequelize.INTEGER,
        references: {
          model: "CrmPaymentTerms",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      type: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        comment: "1=>customer,2=>vendor",
      },
      status: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        comment: "0=>inactive,1=>active",
      },
      creditLimitstatus: {
        type: Sequelize.INTEGER,
        defaultValue: 'pending',
        comment: "pending,approved,declined",
      },
      creditLimit:{
        type: Sequelize.INTEGER,
      },
      msmeRegistered:{
        type: Sequelize.STRING,
        defaultValue: 'yes',
        comment: "yes,no",
      },
      cinNumber:{
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
    await queryInterface.dropTable("CrmAllCustomers");
  },
};
