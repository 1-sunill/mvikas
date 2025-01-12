'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvAdminNotificatuon extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  mvAdminNotificatuon.init({
    title: DataTypes.STRING,
    message: DataTypes.STRING,
    status: DataTypes.BOOLEAN,
    isScheduled: DataTypes.BOOLEAN,
    scheduleDate: DataTypes.DATE,
    userType: DataTypes.STRING,
    userCount: DataTypes.INTEGER,
    creatorId: DataTypes.UUID
  }, {
    sequelize,
    modelName: 'mvAdminNotificatuon',
  });
  return mvAdminNotificatuon;
};