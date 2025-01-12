'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mvAdditionalCharges', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      type: {
        comment: "0-default, 1-userAdded",
        type: Sequelize.INTEGER
      },
      vendorId: {
        type: Sequelize.UUID,
        references: {
          model: "mvUsers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      chargesType: {
        comment: "0-default, 1-per-unit, 2-slabBased, 3-calculative",
        type: Sequelize.INTEGER
      },
      isMin: {
        type: Sequelize.BOOLEAN
      },
      minPlaceholder: {
        type: Sequelize.STRING
      },
      minUnit: {
        type: Sequelize.STRING
      },
      minValue: {
        type: Sequelize.DECIMAL(10, 2)
      },
      labelText: {
        comment: "name",
        type: Sequelize.STRING
      },
      unitType: {
        type: Sequelize.STRING
      },
      placeholder: {
        type: Sequelize.STRING
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2)
      },
      hasDependency: {
        type: Sequelize.BOOLEAN
      },
      isDefault: {
        type: Sequelize.BOOLEAN,
        defaultValue: 0
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      deletedAt: {
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('mvAdditionalCharges');
  }
};