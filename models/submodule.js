"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class SubModule extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  SubModule.init(
    {
      name: DataTypes.STRING,
      slug: DataTypes.STRING,
      moduleId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "SubModule",
    }
  );
  return SubModule;
};
