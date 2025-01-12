"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class attributeValueCombination extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      attributeValueCombination.belongsTo(models.productAttributeCombination, {
        foreignKey: "combinationId",
        targetKey: "id",
      });

      attributeValueCombination.belongsTo(models.CrmAttribute, {
        foreignKey: "attributeId",
        as: "productAttribute",
      });
      attributeValueCombination.belongsTo(models.CrmAttributeValue, {
        foreignKey: "attributeValueId",
        as: "productAttributeValue",
      });
    }
  }
  attributeValueCombination.init(
    {
      productId: DataTypes.INTEGER,
      combinationId: DataTypes.INTEGER,
      attributeId: DataTypes.INTEGER,
      attributeValueId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "attributeValueCombination",
    }
  );
  return attributeValueCombination;
};
