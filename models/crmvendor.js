"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmVendor extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      CrmVendor.belongsTo(models.Unit, {
        foreignKey: "unit_id",
        as: "unitData",
      });
    }
  }
  CrmVendor.init(
    {
      workspaceId: DataTypes.INTEGER,
      lead_id: DataTypes.INTEGER,
      assign_vendor_id: DataTypes.INTEGER,
      product_id: DataTypes.INTEGER,
      name: DataTypes.STRING,
      address: DataTypes.STRING,
      payment_term_id: DataTypes.INTEGER,
      payment_term_text: DataTypes.STRING,
      pickup_address: DataTypes.STRING,
      quantity: DataTypes.INTEGER,
      email: DataTypes.STRING,
      contact_name: DataTypes.STRING,
      contact_number: DataTypes.STRING,
      gst_tin: DataTypes.STRING,
      price: {
        type: DataTypes.DOUBLE(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      status: {
        type: DataTypes.ENUM("0", "1"),
        allowNull: false,
        defaultValue: "1",
      },
      unit_id: DataTypes.INTEGER,
      movement: DataTypes.INTEGER,
      freight_details: DataTypes.STRING,
      scm_tat: DataTypes.DATE,
      delivery_date: DataTypes.DATE,
      remark: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "CrmVendor",
    }
  );
  return CrmVendor;
};
