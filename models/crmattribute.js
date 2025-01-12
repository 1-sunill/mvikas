"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmAttribute extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Define association here
      CrmAttribute.hasMany(models.CrmAttributeValue, {
        foreignKey: "attributeId",
        as: "attributeValues", // Changed to "attributeValues" for clarity
      });

      CrmAttribute.hasOne(models.Unit, {
        foreignKey: "id",
        sourceKey:"unitId",
        as: "unitData", // Changed to "attributeValues" for clarity
      });
    }
  }
  CrmAttribute.init(
    {
      unitId: DataTypes.INTEGER,
      slug: DataTypes.STRING,
      name: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "CrmAttribute",
    }
  );
  return CrmAttribute;
};
