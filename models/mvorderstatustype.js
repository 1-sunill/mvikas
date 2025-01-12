'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvOrderStatusType extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  mvOrderStatusType.init({
    name: DataTypes.STRING,
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    deletedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'mvOrderStatusType',
    paranoid: true
  });
  return mvOrderStatusType;
};