"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmState extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  CrmState.init(
    {
      name: DataTypes.STRING,
      country_id: DataTypes.INTEGER,
      country_code: DataTypes.STRING,
      country_name: DataTypes.STRING,
      state_code: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "CrmState",
    }
  );
  return CrmState;
};
