'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvAddress extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  mvAddress.init({
    name: DataTypes.STRING,
    fullAddress: DataTypes.STRING,
    state: DataTypes.STRING,
    city: DataTypes.STRING,
    pincode: DataTypes.INTEGER,
    mobile: DataTypes.BIGINT,
    country: DataTypes.STRING,
    userId: DataTypes.UUID,
    deletedAt:DataTypes.DATE,
    createdAt:DataTypes.DATE,
    updatedAt:DataTypes.DATE
  }, {
    sequelize,
    modelName: 'mvAddress',
    paranoid: true
  });
  return mvAddress;
};