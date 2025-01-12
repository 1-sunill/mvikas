'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvCustomerAssign extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      mvCustomerAssign.belongsTo(models.mvUser, {
        foreignKey: 'userId',
        as: 'assignedKAM',
      });
      mvCustomerAssign.belongsTo(models.mvAdmin, {
        foreignKey: 'assignTo',
        as: 'assignedEmail',
    });
    mvCustomerAssign.belongsTo(models.mvUser, {
      foreignKey: 'assignTo',
      as: 'assigned',
  });
    }
  }
  mvCustomerAssign.init({
    userId: DataTypes.UUID,
    assignTo: DataTypes.UUID,
    assignBy: DataTypes.UUID,
    createdAt: DataTypes.DATE

  }, {
    sequelize,
    modelName: 'mvCustomerAssign',
    paranoid: true
  });
  return mvCustomerAssign;
};