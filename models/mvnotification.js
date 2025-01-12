'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvnotification extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  mvnotification.init({
    title: DataTypes.STRING,
    message: DataTypes.STRING,
    senderId: DataTypes.UUID,
    receiverId: DataTypes.UUID,
    userType: DataTypes.STRING,
    adminNotificationId: DataTypes.INTEGER,
    scheduleDate: {
      type: DataTypes.DATE,
      defaultValue: null
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: 0
    },
    deletedAt: {
      type: DataTypes.DATE
    },
  }, {
    sequelize,
    modelName: 'mvnotification'
  });
  return mvnotification;
};