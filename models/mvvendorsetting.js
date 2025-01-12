'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvVendorSetting extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  mvVendorSetting.init({
    name: DataTypes.STRING,
    value: DataTypes.STRING,
    userId: DataTypes.UUID,
    isActive:DataTypes.BOOLEAN,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,

  }, {
    sequelize,
    modelName: 'mvVendorSetting',
    paranoid: true
  });
  return mvVendorSetting;
};
