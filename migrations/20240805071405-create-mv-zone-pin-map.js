'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mvZonePinMaps', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      zoneId: {
        type: Sequelize.INTEGER,
        references: {
          model: "mvZones",
          key: "id",
        },
        onUpdate: "CASCADE", 
        onDelete: "CASCADE",
      },
      pincodeId: {
        type: Sequelize.INTEGER,
        references: {
          model: "mvPincodes",
          key: "id",
        },
        onUpdate: "CASCADE", 
        onDelete: "CASCADE",
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
      isActive:{
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
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('mvZonePinMaps');
  }
};