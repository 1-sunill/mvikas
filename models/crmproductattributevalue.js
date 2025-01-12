"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class crmProductAttributeValue extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      crmProductAttributeValue.belongsTo(models.crmProduct, {
        foreignKey: "productId",
        as: "product",
      });

      crmProductAttributeValue.belongsTo(models.CrmAttribute, {
        foreignKey: "productAttributeId",
        as: "productAttributeData",
      });

      crmProductAttributeValue.belongsTo(models.CrmAttributeValue, {
        foreignKey: "productAttributeValueId",
        as: "productAttributeValueData",
      });

      
    }
  }
  crmProductAttributeValue.init(
    {
      productId: DataTypes.INTEGER,
      productAttributeId: DataTypes.INTEGER,
      productAttributeValueId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "crmProductAttributeValue",
    }
  );
  return crmProductAttributeValue;
};
