'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class bankDetails extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  bankDetails.init({
    accountNumber:DataTypes.BIGINT,
    userId:DataTypes.INTEGER,
    IFSCCode:DataTypes.STRING,
    bankName:DataTypes.STRING,
    beneficiaryName:DataTypes.STRING,
    isDefault:DataTypes.STRING,
    deletedAt:DataTypes.DATE,
    createdAt:DataTypes.DATE,
    updatedAt:DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'mvBankDetails',
    paranoid: true
  });
  return bankDetails;
};