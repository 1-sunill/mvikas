'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvZonePinMap extends Model {

    static associate(models) {
      mvZonePinMap.belongsTo(models.mvZone, {
        foreignKey: 'zoneId', 
        as: 'zoneData'
      });
      mvZonePinMap.hasOne(models.mvPincode, {
        foreignKey: 'id',
        sourceKey: 'pincodeId',
        as: 'pincodeData'
      });
      mvZonePinMap.belongsTo(models.mvPincode, {
        foreignKey: 'pincodeId',
        as: 'pincode'
      });
    }
  }
  mvZonePinMap.init({
    zoneId: DataTypes.INTEGER,
    pincodeId: DataTypes.INTEGER,
    vendorId: DataTypes.UUID,
    isActive: DataTypes.STRING,
    createdAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'mvZonePinMap',
    paranoid: true
  });
  return mvZonePinMap;
};