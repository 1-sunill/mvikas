"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmCity extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  CrmCity.init(
    {
      name: DataTypes.STRING,
      state_id: DataTypes.INTEGER,
      country_id: DataTypes.INTEGER,
      state_name: DataTypes.STRING,
      country_name: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "CrmCity",
    }
  );
  return CrmCity;
};
