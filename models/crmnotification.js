"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmNotification extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      CrmNotification.belongsTo(models.crmworkspace, {
        foreignKey: "workspace_id",
        // targetKey: "assignable_id",
        as: "workspaceData",
      });
    }
  }
  CrmNotification.init(
    {
      type: DataTypes.STRING,
      notifiable_type: DataTypes.STRING,
      notifiable_id: DataTypes.INTEGER,
      title: DataTypes.STRING,
      description: DataTypes.STRING,
      scheduleDate: DataTypes.DATE,
      workspace_id:DataTypes.INTEGER,
      usersCount:DataTypes.INTEGER,

    },
    {
      sequelize,
      modelName: "CrmNotification",
    }
  );
  return CrmNotification;
};
