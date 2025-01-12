"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Adding foreign key to crmworkspaces
    await queryInterface.addColumn("crmworkspaces", "userId", {
      type: Sequelize.INTEGER,
      references: {
        model: "crmusers",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    // Adding foreign key to crmusers
    await queryInterface.addColumn("crmusers", "workspaceId", {
      type: Sequelize.INTEGER,
      references: {
        model: "crmworkspaces",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  },

  async down(queryInterface, Sequelize) {
    // Removing foreign key from crmworkspaces
    await queryInterface.removeColumn("crmworkspaces", "userId");

    // Removing foreign key from crmusers
    await queryInterface.removeColumn("crmusers", "workspaceId");
  },
};
