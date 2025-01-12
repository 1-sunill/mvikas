"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("CrmTelesales", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      customer_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "CrmAllCustomers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      created_by_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "crmusers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      workspace_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "crmworkspaces",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      company_name: {
        type: Sequelize.STRING,
      },
      email: {
        type: Sequelize.STRING,
      },
      customer_name: {
        type: Sequelize.STRING,
      },
      phone: {
        type: Sequelize.STRING,
      },
      potential_volume: {
        type: Sequelize.STRING,
      },
      feedback: {
        type: Sequelize.STRING,
      },
      rxil: {
        type: Sequelize.STRING,
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
      state_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "CrmStates",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      city_id: {
        type: Sequelize.INTEGER,
        
      },
      address: {
        type: Sequelize.STRING,
      },
      pincode: {
        type: Sequelize.STRING,
      },
      status: {
        type: Sequelize.ENUM,
        values: ['1', '2', '3'], 
        allowNull: false,
        defaultValue: '1',
        comment: "1 => 'New', 2 => 'Pending', 3 => 'Closed'",
      },
      offline_sites: {
        type: Sequelize.STRING,
      },
      site_stage: {
        type: Sequelize.STRING,
      },
      type: {
        type: Sequelize.ENUM,
        values: ['1', '2'],
        allowNull: false,
        defaultValue: '1',
        comment: "1 => 'Telesales', 2 => 'Field Visit'",
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
    await queryInterface.dropTable("CrmTelesales");
  },
};
