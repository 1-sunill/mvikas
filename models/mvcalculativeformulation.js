'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class mvCalculativeFormulation extends Model {
    static associate(models) {
      mvCalculativeFormulation.belongsTo(models.mvAdditionalCharges, {
        foreignKey: 'addtionalChargesId',
        as: 'formulaData'
      });

      mvCalculativeFormulation.hasOne(models.mvAdditionalCharges, {
        foreignKey: "id",
        sourceKey: "calculativeChargesId",
        as: "calculativeChargesIdData"
      });
      mvCalculativeFormulation.hasOne(models.mvAdditionalCharges, {
        foreignKey: "id",
        sourceKey: "calculativeCharges1Id",
        as: "calculativeCharges1IdData"
      });

    }

  }

  mvCalculativeFormulation.init({
    addtionalChargesId: DataTypes.INTEGER,
    calculativeChargesId: DataTypes.INTEGER,
    calculativeChargesValue: DataTypes.STRING,
    operator: DataTypes.STRING,
    calculativeCharges1Id: DataTypes.INTEGER,
    calculativeCharges1Value: DataTypes.STRING,
    endOperator: DataTypes.STRING,
    precedence: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'mvCalculativeFormulation',
    timestamps: true,
    paranoid: true,
  });

  return mvCalculativeFormulation;
};
