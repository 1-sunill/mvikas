'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mvVendorRates', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
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
      serviceId: {
        type: Sequelize.INTEGER,
        references: {
          model: "mvServices",
          key: "id",
        },
        onUpdate: "CASCADE", 
        onDelete: "CASCADE",
      },
      zoneIdFrom: {
        type: Sequelize.INTEGER,
        references: {
          model: "mvZones",
          key: "id",
        },
        onUpdate: "CASCADE", 
        onDelete: "CASCADE",
      },
      zoneIdTo: {
        type: Sequelize.INTEGER,
        references: {
          model: "mvZones",
          key: "id",
        },
        onUpdate: "CASCADE", 
        onDelete: "CASCADE",
      },
      lpRates: {
        type: Sequelize.DECIMAL(10,2)
      },
      applyGst: {
        type: Sequelize.INTEGER
      },
      weightFrom: {
        type: Sequelize.DECIMAL(10,2)
      },
      weightTo: {
        type: Sequelize.DECIMAL(10,2)
      },
      fromTime: {
        type: Sequelize.STRING
      },
      toTime: {
        type: Sequelize.STRING
      },
      channel: {
        type: Sequelize.STRING
      },
      isActive: {
        type: Sequelize.BOOLEAN
      },
      additionalCharges: {
        type: Sequelize.STRING
      },
      CFA: {
        type: Sequelize.STRING
      },
      divisor: {
        type: Sequelize.INTEGER
      },
      maxWeight: {
        type: Sequelize.DECIMAL(10,2)
      },
      minWeight: {
        type: Sequelize.DECIMAL(10,2)
      },
      GST: {
        type: Sequelize.DECIMAL(10,2)
      },
      minimumODA1: {
        type: Sequelize.INTEGER
      },
      maximumODA2: {
        type: Sequelize.INTEGER
      },
      maximumODA3: {
        type: Sequelize.INTEGER
      },
      ODA1Kg: {
        type: Sequelize.DECIMAL(10,2)
      },
      ODA2Kg: {
        type: Sequelize.DECIMAL(10,2)
      },
      ODA3Kg: {
        type: Sequelize.DECIMAL(10,2)
      },
      minFreight: {
        type: Sequelize.DECIMAL(10,2)
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
    await queryInterface.dropTable('mvVendorRates');
  }
};