'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CrmCities', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      state_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "CrmStates",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      country_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "CrmCountries",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      state_code: {
        type: Sequelize.STRING
      },
      state_name: {
        type: Sequelize.STRING
      },
      country_code: {
        type: Sequelize.STRING
      },
      country_name: {
        type: Sequelize.STRING
      },
      latitude: {
        type: Sequelize.DECIMAL(12, 8),
      },
      longitude: {
        type: Sequelize.DECIMAL(12, 8),
      },
      wikiDataId: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.STRING
      },
      deletedAt: {
        type: Sequelize.DATE,
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
    await queryInterface.dropTable('CrmCities');
  }
};