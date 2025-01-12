"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("CrmDocuments", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      userId: {
        type: Sequelize.INTEGER,
        references: {
          model: "crmusers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      documentTypeId: {
        type: Sequelize.INTEGER,
        references: {
          model: "CrmDocumentTypes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      documentable_type: {
        type: Sequelize.STRING,
      },
      documentable_id: {
        type: Sequelize.INTEGER,
      },
      fileName: {
        type: Sequelize.STRING,
      },
      path: {
        type: Sequelize.STRING,
      },
      department: {
        type: Sequelize.ENUM,
        values: ["default", "scm", "sales"],
        allowNull: false,
        defaultValue: "default",
        comment: "Department types: default, scm, sales",
      },
      status: {
        type: Sequelize.ENUM,
        values: ["pending", "approved", "rejected"],
        allowNull: false,
        defaultValue: "pending",
        comment: "Status types: pending, approved, rejected",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      deletedAt: {
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("CrmDocuments");
  },
};
