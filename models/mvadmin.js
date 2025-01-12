'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvAdmin extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      mvAdmin.belongsTo(models.mvCustomerAssign, {
        foreignKey: 'id',
        sourceKey: 'assignTo',
        as: 'assignedEmail',
    });
    
    }
  }
  mvAdmin.init({
    id: {
      type: DataTypes.UUID, // Use UUID data type
      defaultValue: DataTypes.UUIDV4, // Generate a UUID on insert
      primaryKey: true,
    },
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    mobile: DataTypes.BIGINT,
    password: DataTypes.STRING,
    role: DataTypes.STRING,
    roleType: DataTypes.INTEGER,
    roleId: DataTypes.STRING,
    isActive: DataTypes.BOOLEAN,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'mvAdmin',
    paranoid:true
  });
  return mvAdmin;
};