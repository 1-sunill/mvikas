'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mvOrderDimensions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
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
      Volume_weight: {
        type: Sequelize.DECIMAL
      },
      boxes: {
        type: Sequelize.INTEGER
      },
      Unit: {
        type: Sequelize.STRING
      },
      Actual_Weight: {
        type: Sequelize.DECIMAL
      },
      status: {
        type: Sequelize.BOOLEAN
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
    await queryInterface.dropTable('mvOrderDimensions');
  }
};