'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvModuleAccess extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      mvModuleAccess.belongsTo(models.mvModule, {
        foreignKey: "moduleId",
        sourceKey:"id",
        as: "modules",
      });
      mvModuleAccess.belongsTo(models.mvSubModule, {
        foreignKey: "subModuleId",
        sourceKey:"id",
        as: "submodules",
      });
      mvModuleAccess.belongsTo(models.mvAccess, {
        foreignKey: "accessId",
        sourceKey:"id",
        as: "access",
      });
    }
  }
  mvModuleAccess.init({
    moduleId: DataTypes.INTEGER,
    subModuleId: DataTypes.INTEGER,
    accessId: DataTypes.INTEGER,
    status: DataTypes.BOOLEAN,
    deletedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'mvModuleAccess',
  });
  return mvModuleAccess;
};