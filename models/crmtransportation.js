"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmTransportation extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      CrmTransportation.hasMany(models.CrmDocument, {
        foreignKey: "documentable_id",
        as: "transporterDocumentData",
      });
      
      CrmTransportation.hasOne(models.CrmDriver, {
        foreignKey: "id",
        sourceKey:"driver_id",
        as: "driverData",
      });
    }
  }
  CrmTransportation.init(
    {
      sub_dispatch_id: DataTypes.INTEGER,
      transporter_id: DataTypes.INTEGER,
      driver_id: DataTypes.INTEGER,
      name: DataTypes.STRING,
      phone: DataTypes.STRING,
      address: DataTypes.STRING,
      email: DataTypes.STRING,
      payment_term_id: DataTypes.INTEGER,
      payment_terms: DataTypes.STRING,
      freight: DataTypes.STRING,
      gst_tin: DataTypes.STRING,
      driver_name: DataTypes.STRING,
      driver_phone: DataTypes.STRING,
      vehicle_number: DataTypes.STRING,
      vehicle_type_id: DataTypes.INTEGER,
      quantity: DataTypes.INTEGER,
      builty_no_lr_no: DataTypes.STRING,
      terms_of_delivery: DataTypes.STRING,
      test_certificate_no: DataTypes.STRING,
      tracking_url: DataTypes.STRING,
      capacity: DataTypes.STRING,
      payment_term_method: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "CrmTransportation",
    }
  );
  return CrmTransportation;
};
