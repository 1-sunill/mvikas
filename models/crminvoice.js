"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmInvoice extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  CrmInvoice.init(
    {
      userId: DataTypes.INTEGER,
      invoiceable_type: DataTypes.STRING,
      invoiceable_id: DataTypes.INTEGER,
      path: DataTypes.STRING,
      vendorId: DataTypes.INTEGER,
      type: DataTypes.STRING,
      invoice_number: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "CrmInvoice",
    }
  );
  return CrmInvoice;
};
