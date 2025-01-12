"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmLead extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      CrmLead.hasMany(models.CrmOrderItems, {
        foreignKey: "itemable_id",
        as: "orderItems",
      });
      CrmLead.hasMany(models.CrmDocument, {
        foreignKey: "documentable_id",
        as: "documentData", // Changed to "documentData" for clarity
      });
      CrmLead.belongsTo(models.CrmMrsLead, {
        foreignKey: "id",
        targetKey: "lead_id",
        as: "documentDetails", // Changed to "documentDetails" for clarity
      });

      CrmLead.belongsTo(models.CrmAssign, {
        foreignKey: "id",
        targetKey: "assignable_id",
        as: "assignUser", // Changed to "assignUser" for clarity
      });
      CrmLead.belongsTo(models.CrmState, {
        foreignKey: "state_id",
        as: "stateData",
      });
      CrmLead.belongsTo(models.CrmCity, {
        foreignKey: "city_id",
        as: "cityData",
      });

      CrmLead.belongsTo(models.CrmState, {
        foreignKey: "shipping_state_id",
        as: "shippingStateData",
      });
      CrmLead.belongsTo(models.CrmCity, {
        foreignKey: "shipping_city_id",
        as: "shippingCityData",
      });
      CrmLead.belongsTo(models.CrmAllCustomer, {
        foreignKey: "customer_id",
        as: "customerData",
      });

      CrmLead.belongsTo(models.CrmEstimate, {
        foreignKey: "id",
        targetKey: "lead_id",
        as: "estimateData",
      });
     
     
    }
  }
  CrmLead.init(
    {
      customer_id: DataTypes.INTEGER,
      created_by_id: DataTypes.INTEGER,
      workspace_id: DataTypes.INTEGER,
      telesale_id: DataTypes.INTEGER,
      name: DataTypes.STRING,
      email: DataTypes.STRING,
      phone: DataTypes.STRING,
      gst_tin: DataTypes.STRING,
      company_name: DataTypes.STRING,
      purchase_officer_name: DataTypes.STRING,
      purchase_officer_phone: DataTypes.STRING,
      lead_source: DataTypes.STRING,
      address: DataTypes.STRING,
      state_id: DataTypes.INTEGER,
      city_id: DataTypes.INTEGER,
      pincode: DataTypes.INTEGER,
      shipping_address: DataTypes.STRING,
      shipping_state_id: DataTypes.INTEGER,
      shipping_city_id: DataTypes.INTEGER,
      shipping_pincode: DataTypes.STRING,
      estimated_order_value: DataTypes.STRING,
      lead_priority: DataTypes.INTEGER,
      sales_remarks: DataTypes.STRING,
      destination_frieght_cost: DataTypes.STRING,
      vehicle_capacity: DataTypes.STRING,
      scm_remarks: DataTypes.STRING,
      comment: DataTypes.STRING,
      status: {
        type: DataTypes.ENUM(
          "new",
          "open",
          "in-process",
          "unqualified",
          "converted",
          "order-lost",
          "order-received"
        ),
        defaultValue: "new",
      },
    },
    {
      sequelize,
      modelName: "CrmLead",
    }
  );
  return CrmLead;
};
