"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmStatusLog extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      CrmStatusLog.hasOne(models.Role, {
        foreignKey: "id",
        sourceKey: "role_id",
        as: "role",
      });
      CrmStatusLog.hasOne(models.crmuser, {
        foreignKey: "id",
        sourceKey: "userId",
        as: "userDetail",
      });
    }
  }
  CrmStatusLog.init(
    {
      userId: DataTypes.INTEGER,
      role_id: DataTypes.STRING,
      status_loggable_type: DataTypes.STRING,
      status_loggable_id: DataTypes.INTEGER,
      status: DataTypes.STRING,
      comment: DataTypes.STRING,
      data: DataTypes.JSON
    },
    {
      sequelize,
      modelName: "CrmStatusLog",
    }
  );
  return CrmStatusLog;
};
