"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmAllCustomer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here

      CrmAllCustomer.belongsTo(models.CrmPaymentTerm, {
        foreignKey: "paymentTermId",
        as: "paymentData",
      });
      CrmAllCustomer.hasMany(models.CrmActivityLogs, {
        foreignKey: "entity_id",
        // targetKey:"entity_id",
        as: "customerStatusActivityLog",
      });
      CrmAllCustomer.hasMany(models.CrmActivityLogs, {
        foreignKey: "entity_id",
        // targetKey:"entity_id",
        as: "customerHistoryActivityLog",
      });
    }
  }
  CrmAllCustomer.init(
    {
      name: DataTypes.STRING,
      email: DataTypes.STRING,
      mobile: DataTypes.STRING,
      companyName: DataTypes.STRING,
      legelName: DataTypes.STRING,
      customerAddress: DataTypes.STRING,
      gstIn: DataTypes.STRING,
      paymentTermId: DataTypes.INTEGER,
      status: DataTypes.INTEGER,
      type: DataTypes.INTEGER,
      pickupLocation: DataTypes.STRING,
      contactName: DataTypes.STRING,
      workspaceId: DataTypes.INTEGER,
      creditLimit: DataTypes.INTEGER,
      msmeRegistered: DataTypes.STRING,
      cinNumber: DataTypes.INTEGER,
      creditLimitstatus: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "CrmAllCustomer",
    }
  );
  return CrmAllCustomer;
};
