'use strict';
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mvAdmins', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID, // Use UUID data type
        defaultValue: Sequelize.UUIDV4, // Generate a UUID on insert
      },
      name: {
        type: Sequelize.STRING
      },
      email: {
        type: Sequelize.STRING
      },
      mobile: {
        type: Sequelize.BIGINT
      },
      roleType: {
        type: Sequelize.INTEGER,
        comment: '1- admin, 2- subAdmin, 3- KAM, 4- TL, 5- Manager, 6- level-emplyee'
      },
      password: {
        type: Sequelize.STRING
      },
      role: {
        type: Sequelize.STRING
      },
      roleId: {
        type: Sequelize.STRING
      },
      isActive: {
        type: Sequelize.BOOLEAN
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      deletedAt: {
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    const updatedPassword = await bcrypt.hash('Admin@123', parseInt(process.env.BCRYPTSALT, 10));

    const id = uuidv4();
    // Insert an admin user
    await queryInterface.bulkInsert('mvAdmins', [{
      id,
      name: 'Admin',
      email: 'admin@mvikas.com',
      mobile: 9756300654,
      roleType: 1, // Admin
      password: updatedPassword, // Ideally, hash this password before storing it
      role: 'admin',
      roleId: 'admin123',
      isActive: true,
      createdAt: new Date(),  // Add createdAt
      updatedAt: new Date()
    }]);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('mvAdmins');
  }
};