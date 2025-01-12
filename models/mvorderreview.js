'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvorderReview extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      mvorderReview.belongsTo(models.mvreviewType, {
        foreignKey: "ReviewType",
        as: "reviewtype"
      })
      mvorderReview.belongsTo(models.mvorder, {
        foreignKey: 'Orderid',
        targetKey: "Order_id",
        as: 'order'
      })
      mvorderReview.belongsTo(models.mvUser, {
        foreignKey: 'vendorId',
        as: 'vendor'
      })
      mvorderReview.belongsTo(models.mvUser, {
        foreignKey: 'userId',
        as: 'user'
      })
    }
  }
  mvorderReview.init({
    Orderid: DataTypes.STRING,
    OrderRating: DataTypes.TINYINT,
    ReviewDesc: DataTypes.STRING,
    ReviewType: DataTypes.INTEGER,
    userId: DataTypes.UUID,
    vendorId: DataTypes.UUID,
    isApproved: DataTypes.BOOLEAN,
    deletedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'mvorderReview',
    paranoid: true

  });
  return mvorderReview;
};