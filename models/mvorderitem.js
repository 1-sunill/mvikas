'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvOrderItem extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      mvOrderItem.belongsTo(models.mvOrderDimension, {
        foreignKey: "OrderdimId"
      })
      mvOrderItem.hasMany(models.mvOrderedItemStatus, {
        foreignKey: "ItemId",
        as: 'itemStatus'
      })
      mvOrderItem.belongsTo(models.mvOrderStatusType, {
        foreignKey: "ItemStatus",
        as: 'Itemstatus'
      })

      // define association here
    }
  }
  mvOrderItem.init({
    Itemid: DataTypes.STRING,
    OrderdimId: DataTypes.INTEGER,
    ItemStatus: DataTypes.INTEGER,
    Orderid: DataTypes.STRING,
    Length: DataTypes.DECIMAL,
    Height: DataTypes.DECIMAL,
    Breadth: DataTypes.DECIMAL,
    BarCode: DataTypes.STRING,
    ItemUpdatedAt: DataTypes.DATE,
    labelURL: DataTypes.STRING,
    status: DataTypes.STRING,
    deletedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'mvOrderItem'

  });
  return mvOrderItem;
};