"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmOrderItemVendor extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      CrmOrderItemVendor.belongsTo(models.CrmVendor, {
        foreignKey: "vendor_id",
        sourceKey: "id",
        as: "vendor", // Changed to "attribute" for clarity
      });

      CrmOrderItemVendor.belongsTo(models.CrmOrderItems, {
        foreignKey: "order_item_id",
        // sourceKey: "id",
        as: "orderItemData",
      });
    }
  }
  CrmOrderItemVendor.init(
    {
      order_item_id: DataTypes.INTEGER,
      vendor_id: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "CrmOrderItemVendor",
    }
  );
  return CrmOrderItemVendor;
};
