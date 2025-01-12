'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvpayment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      mvpayment.belongsTo(models.mvUser, {
        foreignKey: "userId",
        as: "User"
      })
      mvpayment.belongsTo(models.mvUser, {
        foreignKey: "vendorId",
        as: "Vendor"
      })
      mvpayment.belongsTo(models.mvUser, {
        foreignKey: 'vendorOldId',
        as: "vendorold"
      })
    }
  }
  mvpayment.init({
    userId: DataTypes.UUID,
    vendorId: DataTypes.UUID,
    vendorOldId: DataTypes.UUID,
    paymentType: DataTypes.STRING,
    billingType: DataTypes.STRING,
    creditLimit: DataTypes.DECIMAL,
    availableLimit: DataTypes.DECIMAL,
    utilizedLimit: DataTypes.DECIMAL,
    totalAmount: DataTypes.DECIMAL,
    transactionId: DataTypes.STRING,
    orderId: DataTypes.STRING,
    refundDate: DataTypes.DATE,
    refundAmount: DataTypes.DECIMAL,
    status: DataTypes.STRING,
    isResetCredit: DataTypes.BOOLEAN,
    deletedAt: DataTypes.DATE,
    walletId: DataTypes.BIGINT,
    walletTransactionId: DataTypes.BIGINT,
    taxableAmount: DataTypes.DECIMAL,
    isWalletRecharge: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
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
    modelName: 'mvpayment',
    paranoid: true
  });
  return mvpayment;
};