'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvOrderStatusRemark extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  mvOrderStatusRemark.init({
    orderItemStatusId: DataTypes.INTEGER,
    remark: DataTypes.TEXT,
    delayReason: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'mvOrderStatusRemark',
  });
  return mvOrderStatusRemark;
};