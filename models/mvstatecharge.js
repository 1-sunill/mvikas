'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvStateCharge extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  mvStateCharge.init({
    vendorId: DataTypes.UUID,
    chargeName: DataTypes.STRING,
    stateName: DataTypes.STRING,
    type: DataTypes.STRING,
    amount: DataTypes.DECIMAL(10, 2),
    deletedAt: DataTypes.DATE,
    status: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'mvStateCharge',
    paranoid:true
  });
  return mvStateCharge;
};