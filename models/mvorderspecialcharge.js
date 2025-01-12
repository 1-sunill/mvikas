'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvOrderSpecialCharge extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  mvOrderSpecialCharge.init({
    orderId: DataTypes.INTEGER,
    type: DataTypes.STRING,
    chargeFrom: DataTypes.TINYINT,
    amount: DataTypes.DECIMAL(10, 2),
    status: DataTypes.INTEGER,
    remark: DataTypes.TEXT,
    attachment: {
      type: DataTypes.STRING
    },
    deletedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'mvOrderSpecialCharge',
    paranoid: true
  });
  return mvOrderSpecialCharge;
};