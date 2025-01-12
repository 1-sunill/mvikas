'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvRolePermission extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  mvRolePermission.init({
    roleId: DataTypes.INTEGER,
    moduleId: DataTypes.INTEGER,
    subModuleId: DataTypes.INTEGER,
    accessId: DataTypes.INTEGER,
    status: DataTypes.BOOLEAN,
    deletedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'mvRolePermission',
  });
  return mvRolePermission;
};