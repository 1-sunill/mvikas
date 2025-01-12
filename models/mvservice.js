'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvService extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      mvService.belongsTo(models.mvUser, {
        foreignKey: "userId",
        as: "Vendor"
      })
    }
  }
  mvService.init({
    name: DataTypes.STRING,
    userId: DataTypes.UUID,
    isActive: DataTypes.BOOLEAN,
    serviceType: DataTypes.STRING,
    deletedAt: DataTypes.DATE,
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'mvService',
    paranoid: true
  });
  return mvService;
};