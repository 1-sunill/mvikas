'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mvOrderItems', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      Itemid: {
        type: Sequelize.STRING
      },
      OrderdimId: {
        type: Sequelize.INTEGER
      },
      ItemStatus: {
        type: Sequelize.INTEGER
      },
      Orderid: {
        type: Sequelize.STRING
      },
      Length: {
        type: Sequelize.DECIMAL
      },
      Height: {
        type: Sequelize.DECIMAL
      },
      Breadth: {
        type: Sequelize.DECIMAL
      },
      BarCode: {
        type: Sequelize.STRING
      },
      ItemUpdatedAt: {
        type: Sequelize.DATE
      },
      labelURL: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.STRING
      },
      deletedAt: {
        type: Sequelize.DATE
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
    await queryInterface.dropTable('mvOrderItems');
  }
};