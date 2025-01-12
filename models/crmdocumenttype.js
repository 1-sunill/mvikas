"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmDocumentType extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  CrmDocumentType.init(
    {
      name: DataTypes.STRING,
      slug: DataTypes.STRING,
      status: {
        type: DataTypes.ENUM("0", "1"),
        defaultValue: "1",
      },
    },
    {
      sequelize,
      modelName: "CrmDocumentType",
    }
  );
  return CrmDocumentType;
};
