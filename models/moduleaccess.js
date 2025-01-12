"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class moduleAccess extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      moduleAccess.belongsTo(models.Module, {
        foreignKey: "moduleId",
        sourceKey:"id",
        as: "modules",
      });
      moduleAccess.belongsTo(models.SubModule, {
        foreignKey: "subModuleId",
        sourceKey:"id",
        as: "submodules",
      });
      moduleAccess.belongsTo(models.Access, {
        foreignKey: "accessId",
        sourceKey:"id",
        as: "access",
      });
    }
  }
  moduleAccess.init(
    {
      moduleId: DataTypes.INTEGER,
      subModuleId: DataTypes.INTEGER,
      accessId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "moduleAccess",
    }
  );
  return moduleAccess;
};
