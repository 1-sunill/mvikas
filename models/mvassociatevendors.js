'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvAssociateVendors extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      mvAssociateVendors.belongsTo(models.mvUser, {
        foreignKey: 'vendorId',
        as: 'lpData',
    });
      mvAssociateVendors.belongsTo(models.mvUser, {
        foreignKey: 'vendorId',
        as: 'AssciateVendor',
    });
      
    }
  }
  mvAssociateVendors.init({
    userId: DataTypes.UUID,
    vendorId: DataTypes.UUID,
    createdAt:DataTypes.DATE,
    updatedAt:DataTypes.DATE
  }, {
    sequelize,
    modelName: 'mvAssociateVendors',
    paranoid: true
  });
  return mvAssociateVendors;
};