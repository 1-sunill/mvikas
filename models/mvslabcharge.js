'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvSlabCharge extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  mvSlabCharge.init({
    addtionalChargesId: DataTypes.INTEGER,
    from: DataTypes.INTEGER,
    to: DataTypes.INTEGER,
    unit: DataTypes.STRING,
    amount: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'mvSlabCharge',
    paranoid: true
  });
  return mvSlabCharge;
};