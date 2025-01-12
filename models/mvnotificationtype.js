'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvNotificationType extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  mvNotificationType.init({
    title: DataTypes.STRING,
    templateId: DataTypes.STRING,
    description: DataTypes.STRING,
    notificationRoute: DataTypes.STRING,
    status: DataTypes.BOOLEAN,
    deletedAt: {
      type: DataTypes.DATE
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  }, {
    sequelize,
    modelName: 'mvNotificationType',
    paranoid: true
  });
  return mvNotificationType;
};