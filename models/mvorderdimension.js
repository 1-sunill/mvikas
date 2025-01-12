'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvOrderDimension extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  mvOrderDimension.init({
    Orderid: DataTypes.STRING,
    Length: DataTypes.DECIMAL,
    Height: DataTypes.DECIMAL,
    Breadth: DataTypes.DECIMAL,
    Volume_weight: DataTypes.DECIMAL,
    boxes: DataTypes.INTEGER,
    Unit: DataTypes.STRING,
    Actual_Weight: DataTypes.DECIMAL,
    status: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'mvOrderDimension',
  });
  return mvOrderDimension;
};