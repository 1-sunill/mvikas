"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmActivityLogs extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      CrmActivityLogs.belongsTo(models.crmuser, {
        foreignKey: "performed_by_id",
        as: "userDetails",
      });  
      CrmActivityLogs.belongsTo(models.CrmAssign, {
        foreignKey: "entity_id",
        sourceKey: "assignable_id",
        as: "assignTo",
      });
    }
  }
  CrmActivityLogs.init(
    {
      entity_id: DataTypes.INTEGER,
      entity_type: DataTypes.STRING,
      operation_type: DataTypes.ENUM("CREATE", "UPDATE", "DELETE", "SEND"),
      performed_by_id: DataTypes.INTEGER,
      changes: DataTypes.JSON,
      comment: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: "CrmActivityLogs",
    }
  );
  return CrmActivityLogs;
};
