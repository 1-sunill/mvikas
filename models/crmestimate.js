"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmEstimate extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      CrmEstimate.belongsTo(models.CrmLead, {
        foreignKey: "lead_id",
        targetKey: "id",
        as: "leadData", // Changed to "leadData" for clarity
      });
      CrmEstimate.belongsTo(models.crmworkspace, {
        foreignKey: "workspace_id",
        targetKey: "id",
        as: "workspaceData", // Changed to "workspaceData" for clarity
      });
      CrmEstimate.belongsTo(models.crmuser, {
        foreignKey: "created_by_id",
        targetKey: "id",
        as: "createdBy",
      });
      CrmEstimate.hasMany(models.CrmOrderItems, {
        foreignKey: "itemable_id",
        as: "orderItems",
      });
    }
  }
  CrmEstimate.init(
    {
      lead_id: DataTypes.INTEGER,
      created_by_id: DataTypes.INTEGER,
      workspace_id: DataTypes.INTEGER,
      estimate_no: DataTypes.STRING,
      kind_attention: DataTypes.STRING,
      issued_for_address: DataTypes.STRING,
      issued_by_mobile_no: DataTypes.STRING,
      issued_by_email_id: DataTypes.STRING,
      is_registered: DataTypes.INTEGER,
      estimate_created_at: DataTypes.DATE,
      support_doc: DataTypes.STRING,
      support_doc_name: DataTypes.STRING,
      signature_stamp: DataTypes.STRING,
      signature_stamp_name: DataTypes.STRING,
      company_logo: DataTypes.STRING,
      company_logo_name: DataTypes.STRING,
      amount: DataTypes.INTEGER,
      gst_rate: DataTypes.INTEGER,
      sub_total: DataTypes.INTEGER,
      status: DataTypes.INTEGER,
      terms_and_conditions: DataTypes.STRING,
      pdf_path: DataTypes.STRING,
      amount_in_words: DataTypes.STRING,
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "CrmEstimate",
      paranoid: true, // Enable soft deletes

    }
  );
  return CrmEstimate;
};
