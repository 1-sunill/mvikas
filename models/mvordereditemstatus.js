'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvOrderedItemStatus extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      mvOrderedItemStatus.belongsTo(models.mvOrderStatusType, {
        foreignKey: "StatusType",
        as:'statusType'
      })
      mvOrderedItemStatus.hasMany(models.mvOrderStatusRemark, {
        foreignKey: "orderItemStatusId",
        as:'statusRemark'
      })
    }
  }
  mvOrderedItemStatus.init({
    ItemId: DataTypes.STRING,
    OrderId: DataTypes.STRING,
    userId: DataTypes.UUID,
    StatusType: DataTypes.INTEGER,
    status: DataTypes.BOOLEAN,
    ExcelRemarks: DataTypes.STRING,
    DelayReason: DataTypes.STRING,
    DeliveredAt: DataTypes.DATE,
    PODUrl: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'mvOrderedItemStatus',
    tableNmae: 'mvOrderedItemStatuses'
  });
  return mvOrderedItemStatus;
};