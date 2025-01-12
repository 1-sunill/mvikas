"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmDispatchEwayBill extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      CrmDispatchEwayBill.hasMany(models.CrmStatusLog, {
        foreignKey: "status_loggable_id",
        as: "ewaybillstatusLog",
      });
      CrmDispatchEwayBill.belongsTo(models.CrmSubdispatch, {
        foreignKey: "sub_dispatch_id", // Foreign key in CrmDispatchEwayBill
        as: "subDispatch",             // Alias for the association
      });
    }
  }
    CrmDispatchEwayBill.init(
      {
        sub_dispatch_id: DataTypes.INTEGER,
        ebillno: DataTypes.STRING,
        from: DataTypes.STRING,
        ewayDate: DataTypes.DATE,
        ewayExpDate: DataTypes.DATE,
        ewayFile: DataTypes.STRING,
      },
      {
        sequelize,
        modelName: "CrmDispatchEwayBill",
      }
    );
  return CrmDispatchEwayBill;
};
