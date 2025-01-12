"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmTelesale extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      CrmTelesale.belongsTo(models.CrmCity, {
        foreignKey: "city_id",
        as: "city",
      });
      CrmTelesale.belongsTo(models.CrmState, {
        foreignKey: "state_id",
        as: "state",
      });
      CrmTelesale.belongsTo(models.CrmCountry, {
        foreignKey: "country_id",
        as: "country",
      });

      CrmTelesale.belongsTo(models.CrmAssign, {
        foreignKey: "id",
        targetKey: "assignable_id",
        as: "assignData",
      });

      CrmTelesale.belongsTo(models.crmworkspace, {
        foreignKey: "workspace_id",
        // targetKey: "assignable_id",
        as: "workspaceData",
      });
    }
  }
  CrmTelesale.init(
    {
      customer_id: DataTypes.INTEGER,
      created_by_id: DataTypes.INTEGER,
      workspace_id: DataTypes.INTEGER,
      company_name: DataTypes.STRING,
      email: DataTypes.STRING,
      customer_name: DataTypes.STRING,
      phone: DataTypes.STRING,
      potential_volume: DataTypes.STRING,
      feedback: DataTypes.STRING,
      rxil: DataTypes.STRING,
      country_id: DataTypes.INTEGER,
      state_id: DataTypes.INTEGER,
      city_id: DataTypes.INTEGER,
      address: DataTypes.STRING,
      pincode: DataTypes.STRING,
      status: {
        type: DataTypes.ENUM("1", "2", "3"),
        defaultValue: "1",
      },
      offline_sites: DataTypes.STRING,
      site_stage: DataTypes.STRING,
      type: {
        type: DataTypes.ENUM("0", "1"),
        defaultValue: "1",
      },
    },
    {
      sequelize,
      modelName: "CrmTelesale",
    }
  );
  return CrmTelesale;
};
