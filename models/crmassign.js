"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmAssign extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      CrmAssign.belongsTo(models.crmuser, {
        foreignKey: "assign_to_id",
        as: "user", // Changed to "user" for clarity
      });
    }
  }
  CrmAssign.init(
    {
      assign_reason_id: DataTypes.INTEGER,
      assignable_id: DataTypes.INTEGER,
      assign_by_id: DataTypes.INTEGER,
      assign_to_id: DataTypes.INTEGER,
      documentable_type: DataTypes.STRING,
      comment: DataTypes.STRING,
      deletedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "CrmAssign",
      paranoid: true,
      timestamps: true,
    }
  );
  return CrmAssign;
};
