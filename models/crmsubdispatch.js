"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmSubdispatch extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      CrmSubdispatch.hasMany(models.CrmOrderItems, {
        foreignKey: "itemable_id",
        sourceKey: "id",
        as: "orderItems",
      });

      CrmSubdispatch.hasMany(models.CrmOrder, {
        foreignKey: "id",
        sourceKey: "orderId",
        as: "order",
      });
      CrmSubdispatch.hasOne(models.CrmOrder, {
        foreignKey: "id",
        sourceKey: "orderId",
        as: "singleOrder",
      });
      CrmSubdispatch.belongsTo(models.CrmAssign, {
        foreignKey: "id",
        targetKey: "assignable_id",
        as: "assignUser", // Changed to "assignUser" for clarity
      });
      CrmSubdispatch.hasMany(models.CrmSubDispatchPayments, {
        foreignKey: "sub_dispatch_id",
        targetKey: "id",
        as: "paymentReqData",
      });
      CrmSubdispatch.belongsTo(models.CrmTransportation, {
        foreignKey: "id",
        targetKey: "sub_dispatch_id",
        as: "crmTransportationsData",
      });
      CrmSubdispatch.hasMany(models.CrmDocument, {
        foreignKey: "documentable_id",
        as: "freezDocument",
      });
      CrmSubdispatch.hasMany(models.CrmDocument, {
        foreignKey: "documentable_id",
        as: "acknowledgePo",
      });
      CrmSubdispatch.hasMany(models.CrmDocument, {
        foreignKey: "documentable_id",
        as: "documentData",
      });
      CrmSubdispatch.hasOne(models.CrmTransportation, {
        foreignKey: "sub_dispatch_id",
        as: "transportationDetail",
      });
      CrmSubdispatch.hasOne(models.CrmDispatchEwayBill, {
        foreignKey: "sub_dispatch_id",
        as: "ewaybilldetail",
      });
      CrmSubdispatch.hasMany(models.CrmStatusLog, {
        foreignKey: "status_loggable_id",
        as: "statusLog", // Changed to "documentData" for clarity
      });
      CrmSubdispatch.hasMany(models.CrmActivityLogs, {
        foreignKey: "entity_id",
        as: "transitStatusLog",
      });

      CrmSubdispatch.hasOne(models.CrmDispatchEwayBill, {
        foreignKey: "sub_dispatch_id",
        sourceKey: "id",
        as: "dispatchEwayBill",
      });
    }
  }
  CrmSubdispatch.init(
    {
      orderId: DataTypes.INTEGER,
      workspaceId: DataTypes.INTEGER,
      userId: DataTypes.INTEGER,
      priceBasis: DataTypes.STRING,
      frightCharges: DataTypes.INTEGER,
      tat: DataTypes.DATE,
      tat_approved_by: DataTypes.INTEGER,
      actionBy: DataTypes.INTEGER,
      isPlanning: DataTypes.INTEGER,
      status: DataTypes.INTEGER,
      remark: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "CrmSubdispatch",
    }
  );
  return CrmSubdispatch;
};
