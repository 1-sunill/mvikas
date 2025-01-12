"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmDriver extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  CrmDriver.init(
    {
      transportId: DataTypes.INTEGER,
      name: DataTypes.STRING,
      contactNumber: DataTypes.STRING,
      vehicleNumber: DataTypes.STRING,
      status: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "CrmDriver",
    }
  );
  return CrmDriver;
};
