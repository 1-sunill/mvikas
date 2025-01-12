'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvRole extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      mvRole.hasMany(models.mvRolePermission, {
        foreignKey: "roleId",
        sourceKey: "id",
        as: "rolePermissions",
      });
    }
  }
  mvRole.init({
    createdBy: DataTypes.UUID,
    name: DataTypes.STRING,
    slug: DataTypes.STRING,
    status: DataTypes.BOOLEAN,
    deletedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'mvRole',
  });
  return mvRole;
};