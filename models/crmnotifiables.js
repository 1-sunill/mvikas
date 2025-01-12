"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmNotifiables extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  CrmNotifiables.init(
    {
      workspace_id: DataTypes.INTEGER,
      notification_type_id: DataTypes.INTEGER,
      notifiable_type: DataTypes.STRING,
      notifiable_id: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "CrmNotifiables",
    }
  );
  return CrmNotifiables;
};
