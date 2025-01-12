'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvAccountDetails extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {

      mvAccountDetails.belongsTo(models.mvUser, {
        foreignKey: 'userId',
        as: 'account',
      });
    }
  }
  mvAccountDetails.init({
    
    billingType: DataTypes.STRING,
    creditLimit: DataTypes.BIGINT,
    billingCycle: DataTypes.STRING,
    billingDay: DataTypes.INTEGER,
    markup: DataTypes.INTEGER,
    paymentCycle: DataTypes.STRING,
    paymentDay: DataTypes.INTEGER,
    userId: DataTypes.UUID,
    remark: DataTypes.STRING,
    availableAmount: DataTypes.BIGINT,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    totalWalletAmount: DataTypes.STRING,
    availableWalletAmount: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'mvAccountDetails',
    paranoid: true
  });
  return mvAccountDetails;
};