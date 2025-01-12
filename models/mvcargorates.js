'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvCargoRates extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      mvCargoRates.hasMany(models.mvRates, {
        foreignKey: 'cargoId',  // The foreign key in mvRates that references mvCargoRates
        as: 'rateData'
      });
    }
  }
  mvCargoRates.init({
    serviceId: DataTypes.INTEGER,
    rateFormula: DataTypes.INTEGER,
    vendorId: DataTypes.UUID,
    dividend: DataTypes.INTEGER,
    cwMax: DataTypes.DECIMAL(10, 2),
    cwMin: DataTypes.DECIMAL(10, 2),
    GST: DataTypes.DECIMAL(10, 2),
    minFreight: DataTypes.INTEGER,
    ODA1MinRate: DataTypes.INTEGER,
    ODA1PerKg: DataTypes.INTEGER,
    ODA2MinRate: DataTypes.INTEGER,
    ODA2PerKg: DataTypes.INTEGER,
    ODA3MinRate: DataTypes.INTEGER,
    ODA3PerKg: DataTypes.INTEGER,
    dateFrom: DataTypes.INTEGER,
    dateTo: DataTypes.INTEGER,
    dateTo: DataTypes.JSON,
    additionalCharge: DataTypes.JSON,
    rateType: DataTypes.TINYINT,
    mallCharge: DataTypes.DECIMAL(10, 2),
    sundayCharge: DataTypes.DECIMAL(10, 2),
    csdCharge: DataTypes.DECIMAL(10, 2),
    appointmentMin: DataTypes.DECIMAL(10, 2),
    appointmentPerKg: DataTypes.DECIMAL(10, 2),
    floorCharge: DataTypes.TEXT,

  }, {
    sequelize,
    modelName: 'mvCargoRates',
    paranoid: true
  });
  return mvCargoRates;
};
