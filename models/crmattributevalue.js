"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmAttributeValue extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Define association here
      CrmAttributeValue.belongsTo(models.CrmAttribute, {
        foreignKey: "attributeId",
        as: "attribute", // Changed to "attribute" for clarity
      });
    }
  }
  CrmAttributeValue.init(
    {
      value: DataTypes.STRING,
      attributeId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "CrmAttributeValue",
    }
  );
  return CrmAttributeValue;
};
