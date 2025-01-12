'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvOdaTat extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      mvOdaTat.belongsTo(models.mvZone, { foreignKey: 'zoneIdFrom', as: 'fromZone' });
      mvOdaTat.belongsTo(models.mvZone, { foreignKey: 'zoneIdTo', as: 'toZone' });
    }
  }
  mvOdaTat.init({
    serviceId: DataTypes.INTEGER,
    zoneIdTo: DataTypes.INTEGER,
    zoneIdFrom: DataTypes.INTEGER,
    vendorId: DataTypes.UUID,
    ODATAT: DataTypes.DECIMAL(10, 2),
    STDTAT: DataTypes.DECIMAL(10, 2),
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'mvOdaTat',
    paranoid: true
  });
  return mvOdaTat;
};