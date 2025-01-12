
'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvZone extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      mvZone.hasMany(models.mvZonePinMap, {
        foreignKey: 'zoneId',
        as: 'zoneMapData'
      });

      mvZone.hasMany(models.mvZoneServiceMap, {
        foreignKey: 'zoneId',
        as: 'serviceMapData'
      });

      mvZone.hasMany(models.mvOdaTat, { foreignKey: 'zoneIdFrom', as: 'fromZone' });
      mvZone.hasMany(models.mvOdaTat, { foreignKey: 'zoneIdTo', as: 'toZone' });
    }
  }
  mvZone.init({
    name: DataTypes.STRING,
    vendorId: DataTypes.UUID,
    uniqueId: DataTypes.STRING,
    isActive: DataTypes.BOOLEAN,
  }, {
    sequelize,
    modelName: 'mvZone',
    paranoid: true
  });
  return mvZone;
};