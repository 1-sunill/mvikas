'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvZoneServiceMap extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      mvZoneServiceMap.belongsTo(models.mvZone, {
        foreignKey: 'zoneId',
        as: 'zoneData'  // Ensure the alias matches this
      });
      mvZoneServiceMap.belongsTo(models.mvPincode, {
        foreignKey: 'zonePinId',
        as: 'PinData'  // Ensure the alias matches this
      });
      mvZoneServiceMap.belongsTo(models.mvService, {
        foreignKey: 'serviceId',
        as: 'service'  // Ensure the alias matches this
      });
      mvZoneServiceMap.hasMany(models.mvZonePinMap, {
        foreignKey: 'pincodeId',
        as: 'zoneMapData'
      });
    }
  }
  mvZoneServiceMap.init({
    zoneId: DataTypes.INTEGER,
    zonePinId: DataTypes.INTEGER,
    serviceId: DataTypes.INTEGER,
    vendorId: DataTypes.UUID,
    isActive: DataTypes.BOOLEAN,
    isODA: DataTypes.STRING,
    isTAT: DataTypes.STRING,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'mvZoneServiceMap',
    paranoid: true
  });
  return mvZoneServiceMap;
};