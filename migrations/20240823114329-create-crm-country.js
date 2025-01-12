"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("CrmCountries", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      name: {
        type: Sequelize.STRING,
      },
      iso3: {
        type: Sequelize.STRING,
      },
      iso2: {
        type: Sequelize.STRING,
      },
      numeric_code: {
        type: Sequelize.INTEGER,
      },
      phone_code: {
        type: Sequelize.STRING,
      },
      capital: {
        type: Sequelize.STRING,
      },
      currency: {
        type: Sequelize.STRING,
      },
      currency_name: {
        type: Sequelize.STRING,
      },
      currency_symbol: {
        type: Sequelize.STRING,
      },
      tld: {
        type: Sequelize.STRING,
      },
      region: {
        type: Sequelize.STRING,
      },
      subregion: {
        type: Sequelize.STRING,
      },
      latitude: {
        type: Sequelize.DECIMAL(12, 8),
      },
      longitude: {
        type: Sequelize.DECIMAL(12, 8),
      },
      emoji: {
        type: Sequelize.STRING,
      },
      emojiU: {
        type: Sequelize.STRING,
      },
      status: {
        type: Sequelize.STRING,
      },
      deletedAt: {
        type: Sequelize.DATE,
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
    await queryInterface.dropTable("CrmCountries");
  },
};
