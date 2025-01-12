'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mvOrderedItemStatuses', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      ItemId: {
        type: Sequelize.STRING
      },
      OrderId: {
        type: Sequelize.STRING
      },
      userId: {
        type: Sequelize.UUID
      },
      StatusType: {
        type: Sequelize.INTEGER
      },
      status: {
        type: Sequelize.BOOLEAN
      },
      ExcelRemarks: {
        type: Sequelize.STRING
      },
      DelayReason: {
        type: Sequelize.STRING
      },
      DeliveredAt: {
        type: Sequelize.DATE
      },
      PODUrl: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('mvOrderedItemStatus');
  }
};