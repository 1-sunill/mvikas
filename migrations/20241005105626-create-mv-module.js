'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mvModules', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      slug: {
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
    await queryInterface.bulkInsert('mvModules', [
      {
        name: 'Dashboard',
        slug: 'dashboard',
        status: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Customer Management',
        slug: 'customer-management',
        status: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Vendor Management',
        slug: 'vendor-management',
        status: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Sales Report',
        slug: 'sales-report',
        status: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Purchase Report',
        slug: 'purchase-report',
        status: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Sales Invoice',
        slug: 'sales-invoice',
        status: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Purchase Invoice',
        slug: 'purchase-invoice',
        status: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Bulk Order Update',
        slug: 'bulk-order-update',
        status: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Review List',
        slug: 'review-list',
        status: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Sub Admin Management',
        slug: 'sub-admin-management',
        status: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Role & Permission',
        slug: 'Role-Permission',
        status: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Notification Management',
        slug: 'notification-management',
        status: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

    ]);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('mvModules');
  }
};