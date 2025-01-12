"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmOrder extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      CrmOrder.hasMany(models.CrmDocument, {
        foreignKey: "documentable_id",
        as: "documentData", // Changed to "documentData" for clarity
      });
      CrmOrder.hasOne(models.CrmAllCustomer, {
        foreignKey: "id",
        sourceKey: "customerId",
        as: "customerData", // Changed to "documentData" for clarity
      });
      CrmOrder.hasMany(models.CrmOrderItems, {
        foreignKey: "itemable_id",
        as: "orderItems",
      });
      CrmOrder.belongsTo(models.CrmSubdispatch, {
        foreignKey: "id",
        targetKey: "orderId",
        as: "dispatchData",
      });

      CrmOrder.belongsTo(models.CrmAssign, {
        foreignKey: "id",
        targetKey: "assignable_id",
        as: "assignUser",
      });

      CrmOrder.hasMany(models.CrmStatusLog, {
        foreignKey: "status_loggable_id",
        // targetKey: "",
        as: "activityLog",
      });
    }
  }
  CrmOrder.init(
    {
      order_no: DataTypes.INTEGER,
      workspaceId: DataTypes.INTEGER,
      userId: DataTypes.INTEGER,
      estimate_id: DataTypes.INTEGER,
      sales_rep_name: DataTypes.STRING,
      name: DataTypes.STRING,
      customerId: DataTypes.INTEGER,
      payment_term_id: DataTypes.INTEGER,
      email: DataTypes.STRING,
      phone: DataTypes.STRING,
      shipping_address: DataTypes.STRING,
      billing_address: DataTypes.STRING,
      billing_gst_tin: DataTypes.STRING,
      shipping_gst_tin: DataTypes.STRING,
      customer_po_no: DataTypes.STRING,
      po_date: DataTypes.STRING,
      deletedAt: DataTypes.DATE,
      term_and_condition: DataTypes.STRING,
      action_by: DataTypes.INTEGER,
      finance_user_id: DataTypes.INTEGER,
      status: DataTypes.INTEGER,
      comment: DataTypes.STRING,
      status_by_finance: DataTypes.INTEGER,
      comment_by_finance: DataTypes.STRING,
      status_by_scm: DataTypes.INTEGER,
      comment_by_scm: DataTypes.STRING,
      status_by_sales: DataTypes.INTEGER,
      comment_by_sales: DataTypes.STRING,
      customer_payment_method: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "CrmOrder",
      paranoid: true,
    }
  );
  return CrmOrder;
};
