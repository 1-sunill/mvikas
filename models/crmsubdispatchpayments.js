"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmSubDispatchPayments extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      CrmSubDispatchPayments.hasMany(models.CrmDocument, {
        foreignKey: "documentable_id",
        as: "documentData", // Changed to "documentData" for clarity
      });
      CrmSubDispatchPayments.hasMany(models.CrmStatusLog, {
        foreignKey: "status_loggable_id",
        as: "statusLog", // Changed to "documentData" for clarity
      });
      CrmSubDispatchPayments.hasMany(models.CrmStatusLog, {
        foreignKey: "status_loggable_id",
        as: "attachmentStatusLog",
      });
    }
  }
  CrmSubDispatchPayments.init(
    {
      userId: DataTypes.INTEGER,
      sub_dispatch_id: DataTypes.INTEGER,
      amount: DataTypes.INTEGER,
      type: DataTypes.STRING,
      vendorId: DataTypes.INTEGER,
      transportationId: DataTypes.INTEGER,
      comment: DataTypes.TEXT,
      attachmentName: DataTypes.STRING,
      supportingDocument: DataTypes.STRING,
      balanceAmount: {
        type: DataTypes.DOUBLE(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
    },
    {
      sequelize,
      modelName: "CrmSubDispatchPayments",
    }
  );
  return CrmSubDispatchPayments;
};
