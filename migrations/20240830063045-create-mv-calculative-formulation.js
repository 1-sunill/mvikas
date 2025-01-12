'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mvCalculativeFormulations', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      addtionalChargesId: {
        type: Sequelize.INTEGER,
        references: {
          model: "mvAdditionalCharges",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      calculativeChargesId: {
        type: Sequelize.INTEGER,
        references: {
          model: "mvAdditionalCharges",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      calculativeChargesValue: {
        type: Sequelize.STRING
      },
      operator: {
        type: Sequelize.STRING
      },
      calculativeCharges1Id: {
        type: Sequelize.INTEGER,
        references: {
          model: "mvAdditionalCharges",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      calculativeCharges1Value: {
        type: Sequelize.STRING
      },
      endOperator: {
        type: Sequelize.STRING
      },
      precedence: {
        type: Sequelize.INTEGER
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
    await queryInterface.dropTable('mvCalculativeFormulations');
  }
};
