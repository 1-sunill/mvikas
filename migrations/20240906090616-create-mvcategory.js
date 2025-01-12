'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mvcategories', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.BOOLEAN
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
    await queryInterface.bulkInsert('mvcategories', [
      {
        name: 'Electronic',
        status: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Industrial Goods',
        status: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Chemicals',
        status: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Others',
        status: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('mvcategories');
  }
};