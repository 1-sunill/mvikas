'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvPincode extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      mvPincode.hasMany(models.mvZonePinMap, {
        foreignKey: 'pincodeId',
        as: 'pinData'
      });
      mvPincode.hasMany(models.mvZonePinMap, {
        foreignKey: 'pincodeId',
        as: 'pincodeData'
      });

      mvPincode.hasOne(models.mvZoneServiceMap, {
        foreignKey: 'zonePinId',
        as: 'pinServiceData'
      });
    }
  }
  mvPincode.init({
    pincode: DataTypes.INTEGER,
    city: DataTypes.STRING,
    state: DataTypes.STRING,
    country: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'mvPincode'
  });
  return mvPincode;
};