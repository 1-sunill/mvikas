'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvKycVerifcation extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      mvKycVerifcation.belongsTo(models.mvUser, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }
  mvKycVerifcation.init({
    userId: DataTypes.UUID,
    businessType: DataTypes.STRING,
    companyType: DataTypes.STRING,
    photoIdentification: DataTypes.STRING,
    isApprovedPhotoIdentification: DataTypes.STRING,
    aadharNo: DataTypes.INTEGER,
    document1Type: DataTypes.STRING,
    document2Type: DataTypes.STRING,
    document1FrontSide: DataTypes.STRING,
    document2FrontSide: DataTypes.STRING,
    document1BackSide: DataTypes.STRING,
    document2BackSide: DataTypes.STRING,
    customerName: DataTypes.STRING,
    tanNo: DataTypes.STRING,
    GSTNo: DataTypes.STRING,
    isApproved: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,

  }, {
    sequelize,
    modelName: 'mvKycVerifcation',
    paranoid:true
  });
  return mvKycVerifcation;
};