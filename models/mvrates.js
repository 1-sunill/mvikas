'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvRates extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      mvRates.belongsTo(models.mvCargoRates, {
        foreignKey: 'cargoId',  // The foreign key in mvRates that references mvCargoRates
        as: 'rateData'
      })
      mvRates.belongsTo(models.mvZone, {
        foreignKey: 'zoneIdFrom',  // The foreign key in mvRates that references mvCargoRates
        as: 'zoneFrom'
      })
      mvRates.belongsTo(models.mvZone, {
        foreignKey: 'zoneIdTo',  // The foreign key in mvRates that references mvCargoRates
        as: 'zoneTo'
      })

    }
  }
  mvRates.init({
    vendorId: DataTypes.UUID,
    cargoId: DataTypes.INTEGER,
    zoneIdTo: DataTypes.INTEGER,
    zoneIdFrom: DataTypes.INTEGER,
    rates: DataTypes.DECIMAL(10, 2),
    rateType: DataTypes.TINYINT
  }, {
    sequelize,
    modelName: 'mvRates',
    paranoid: true
  });
  return mvRates;
};