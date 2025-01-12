'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CrmVehicleType extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  CrmVehicleType.init({
    name: DataTypes.STRING,
    slug: DataTypes.STRING,
    carrying_capacity: DataTypes.INTEGER,
    status: DataTypes.INTEGER,



  }, {
    sequelize,
    modelName: 'CrmVehicleType',
  });
  return CrmVehicleType;
};