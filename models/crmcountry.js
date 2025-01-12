"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmCountry extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  CrmCountry.init(
    {
      name: DataTypes.STRING,
      phone_code: DataTypes.INTEGER,
      capital: DataTypes.STRING,
      currency: DataTypes.STRING,
      currency_name: DataTypes.STRING,
      currency_symbol: DataTypes.STRING,
      region: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "CrmCountry",
    }
  );
  return CrmCountry;
};
