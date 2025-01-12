"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmDocument extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      CrmDocument.hasMany(models.CrmStatusLog, {
        foreignKey: "status_loggable_id",
        as: "dispatchFreezLog",
      });
      CrmDocument.hasMany(models.CrmStatusLog, {
        foreignKey: "status_loggable_id",
        as: "acknowledgeStatusLog",
      });
      CrmDocument.hasMany(models.CrmStatusLog, {
        foreignKey: "status_loggable_id",
        as: "dispatchFinancelog",
      });
      CrmDocument.hasMany(models.CrmStatusLog, {
        foreignKey: "status_loggable_id",
        as: "docLog",
      });
      
    }
  }
  CrmDocument.init(
    {
      userId: DataTypes.INTEGER,
      documentTypeId: DataTypes.INTEGER,
      documentable_type: DataTypes.STRING,
      documentable_id: DataTypes.INTEGER,
      fileName: DataTypes.STRING,
      path: DataTypes.STRING,
      department: DataTypes.STRING,
      comment: DataTypes.STRING,
      status: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "CrmDocument",
    }
  );
  return CrmDocument;
};
