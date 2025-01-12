"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Role extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Role.hasMany(models.RolePermission, {
        foreignKey: "roleId",
        sourceKey: "id",
        as: "rolePermissions",
      });
    }
  }
  Role.init(
    {
      name: DataTypes.STRING,
      slug: DataTypes.STRING,
      userId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Role",
    }
  );
  return Role;
};
