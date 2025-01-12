'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mvRates', {
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
      cargoId: {
        type: Sequelize.INTEGER,
        references: {
          model: "mvCargoRates",
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
      zoneIdFrom: {
        type: Sequelize.INTEGER,
        references: {
          model: "mvZones",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      rates: {
        type: Sequelize.DECIMAL(10, 2)
      },
      rateType: {
        type: Sequelize.TINYINT,
        defaultValue: 1,
        comment: "1=>per kg,2=>per box,3=>both"
      },
      Applygst: {
        type: Sequelize.INTEGER
      },
      Applyfsc: {
        type: Sequelize.INTEGER
      },
      WeightFrom: {
        type: Sequelize.DECIMAL(10, 2)
      },
      Weightto: {
        type: Sequelize.DECIMAL(10, 2)
      },
      packettype: {
        type: Sequelize.STRING
      },
      Fromtime: {
        type: Sequelize.STRING
      },
      Totime: {
        type: Sequelize.STRING
      },
      hint: {
        type: Sequelize.STRING
      },
      Channel: {
        type: Sequelize.STRING
      },
      Recordtime: {
        type: Sequelize.STRING
      },
      Isactive: {
        type: Sequelize.BOOLEAN
      },
      Deleted: {
        type: Sequelize.BOOLEAN
      },
      AdditionalCharges: {
        type: Sequelize.TEXT
      },
      CFT: {
        type: Sequelize.DECIMAL(10, 2)
      },
      Divisor: {
        type: Sequelize.DECIMAL(10, 2)
      },
      Max_Weight: {
        type: Sequelize.DECIMAL(10, 2)
      },
      Min_Weight: {
        type: Sequelize.DECIMAL(10, 2)
      },
      Gst: {
        type: Sequelize.DECIMAL(10, 2)
      },
      MinimumODA1: {
        type: Sequelize.DECIMAL(10, 2)
      },
      MinimumODA2: {
        type: Sequelize.DECIMAL(10, 2)
      },
      MinimumODA3: {
        type: Sequelize.DECIMAL(10, 2)
      },
      ODA1PerKg: {
        type: Sequelize.DECIMAL(10, 2)
      },
      ODA2PerKg: {
        type: Sequelize.DECIMAL(10, 2)
      },
      ODA3PerKg: {
        type: Sequelize.DECIMAL(10, 2)
      },
      Min_Freight: {
        type: Sequelize.DECIMAL(10, 2)
      },
      AppointmentCharges: {
        type: Sequelize.DECIMAL(10, 2)
      },
      AppointmentPerKg: {
        type: Sequelize.DECIMAL(10, 2)
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
    await queryInterface.dropTable('mvRates');
  }
};