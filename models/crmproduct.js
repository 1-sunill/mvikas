"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class crmProduct extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here

      //Product attributes value data
      crmProduct.hasMany(models.crmProductAttributeValue, {
        foreignKey: "productId",
        as: "productAttributeValues",
      });

      //Category Data
      crmProduct.hasOne(models.Categories, {
        foreignKey: "id",
        sourceKey: "categoryId",
        as: "categoryData",
      });

      //Brand (Make) data
      crmProduct.hasOne(models.CrmMake, {
        foreignKey: "id",
        sourceKey: "makeId",
        as: "brandData",
      });

      crmProduct.hasOne(models.productAttributeCombination, {
        foreignKey: "productId",
        // sourceKey: "makeId",
        as: "combinationData",
      });

      crmProduct.hasMany(models.productAttributeCombination, {
        foreignKey: "productId",
        // sourceKey: "makeId",
        as: "combinationDatas",
      });
    }
  }
  crmProduct.init(
    {
      name: DataTypes.STRING,
      hsn: DataTypes.STRING,
      makeId: DataTypes.INTEGER,
      categoryId: DataTypes.INTEGER,
      workspaceId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "crmProduct",
    }
  );
  return crmProduct;
};
