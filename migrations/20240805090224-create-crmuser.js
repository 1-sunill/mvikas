"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("crmusers", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      contact_number: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      roleName: {
        type: Sequelize.STRING,
      },
      workspace: {
        type: Sequelize.STRING,
      },
      profileImage: {
        type: Sequelize.STRING,
      },
      signature: {
        type: Sequelize.STRING,
      },
      status: {
        type: Sequelize.TINYINT,
        defaultValue: 1,
        comment: "0=>Inactive,1=>Active",
      },
      userType: {
        type: Sequelize.TINYINT,
        defaultValue: 1,
        comment: "0=>Global,1=>Admin",
      },
      // roleId: {
      //   type: Sequelize.TINYINT,
      // },
      department: {
        type: Sequelize.ENUM,
        values: ["scm", "sale", "finance"],
        allowNull: false,
        defaultValue: "scm",
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
    await queryInterface.dropTable("crmusers");
  },
};
