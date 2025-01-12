"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class crmworkspace extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  crmworkspace.init(
    {
      name: DataTypes.STRING,
      legal_name: DataTypes.STRING,
      slug: DataTypes.STRING,
      email: DataTypes.STRING,
      phone: DataTypes.STRING,
      gst_tin: DataTypes.STRING,
      cin: DataTypes.STRING,
      address: DataTypes.STRING,
      bank_name: DataTypes.STRING,
      bank_ifsc: DataTypes.STRING,
      bank_ac_number: DataTypes.STRING,
      logo_path: DataTypes.STRING,
      banner_path: DataTypes.STRING,
      status: DataTypes.STRING,
      userId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "crmworkspace",
    }
  );
  return crmworkspace;
};
