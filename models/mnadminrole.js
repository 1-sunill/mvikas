'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mnAdminRole extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  mnAdminRole.init({
    mnAdminRole: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'mnAdminRole',
  });
  return mnAdminRole;
};