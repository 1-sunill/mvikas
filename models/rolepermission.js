"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class RolePermission extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      RolePermission.hasMany(models.Module, {
        foreignKey: "id",
        sourceKey: "moduleId",
        as: "modules",
      });
    }
  }
  RolePermission.init(
    {
      roleId: DataTypes.INTEGER,
      moduleId: DataTypes.INTEGER,
      subModuleId: DataTypes.INTEGER,
      accessId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "RolePermission",
    }
  );
  return RolePermission;
};
