'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvAdditionalCharges extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      mvAdditionalCharges.hasMany(models.mvCalculativeFormulation, {
        foreignKey: "addtionalChargesId",
        as: "formulaData"
      });
      mvAdditionalCharges.hasMany(models.mvSlabCharge, {
        foreignKey: "addtionalChargesId"
      })
    }
  }
  mvAdditionalCharges.init({
    type: DataTypes.INTEGER,
    vendorId: DataTypes.UUID,
    chargesType: DataTypes.INTEGER,
    isMin: DataTypes.BOOLEAN,
    minPlaceholder: DataTypes.STRING,
    minUnit: DataTypes.STRING,
    minValue: DataTypes.DECIMAL(10, 2),
    labelText: DataTypes.DECIMAL(10, 2),
    unitType: DataTypes.STRING,
    placeholder: DataTypes.STRING,
    amount: DataTypes.DECIMAL(10, 2),
    hasDependency: DataTypes.BOOLEAN,
    isDefault: DataTypes.BOOLEAN,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,

  }, {
    sequelize,
    modelName: 'mvAdditionalCharges',
    paranoid: true
  });
  return mvAdditionalCharges;
};