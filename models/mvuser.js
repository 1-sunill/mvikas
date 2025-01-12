'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvUser extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      mvUser.hasOne(models.mvKycVerifcation, {
        foreignKey: 'userId',
        as: 'kycVerification',
      });

      mvUser.hasMany(models.mvAssociateVendors, {
        foreignKey: 'vendorId',
        as: 'lpData',
      });

      mvUser.hasOne(models.mvAccountDetails, {
        foreignKey: 'userId',
        as: 'account',
      });

      mvUser.hasOne(models.mvCustomerAssign, {
        foreignKey: 'userId',
        as: 'assignedKAM',
      });
      mvUser.hasOne(models.mvAssociateVendors, {
        foreignKey: 'vendorId',
        as: 'AssciateVendor',
      });
      mvUser.hasOne(models.mvNotifiableUser, {
        foreignKey: 'userId',
        as: 'notifiable',
      });
      mvUser.belongsTo(models.mvRole, {
        foreignKey: "roleId",
        as: "role",
      });

    }
  }
  mvUser.init({
    id: {
      type: DataTypes.UUID, // Use UUID data type
      defaultValue: DataTypes.UUIDV4, // Generate a UUID on insert
      primaryKey: true,
    },
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    mobile: DataTypes.INTEGER,
    password: DataTypes.STRING,
    otp: DataTypes.STRING,
    isDummy: DataTypes.BOOLEAN,
    isUser: DataTypes.BOOLEAN,
    isVendor: DataTypes.BOOLEAN,
    roleName: DataTypes.STRING,
    roleId: DataTypes.INTEGER,
    createdBy: DataTypes.UUID,
    userType: DataTypes.STRING,
    resetPasswordExpires: DataTypes.DATE,
    resetPasswordToken: DataTypes.STRING,
    isActive: DataTypes.BOOLEAN,
    secondEmail: DataTypes.STRING,
    GSTNo: DataTypes.STRING,
    panNo: DataTypes.STRING,
    dealItem: DataTypes.STRING,
    image: DataTypes.STRING,
    isBlocked: DataTypes.BOOLEAN,
    avgShipmentWeight: DataTypes.STRING,
    companyAddressLine1: DataTypes.STRING,
    companyAddressLine2: DataTypes.STRING,
    companyAddressPincode: DataTypes.INTEGER,
    companyAddressState: DataTypes.STRING,
    companyAddressCity: DataTypes.STRING,
    companyAddressCountry: DataTypes.STRING,
    companyDescription: DataTypes.STRING,
    monthlyShipping: DataTypes.INTEGER,
    billingAddressLine1: DataTypes.STRING,
    billingAddressLine1: DataTypes.STRING,
    billingAddressLine2: DataTypes.STRING,
    billingAddressPincode: DataTypes.INTEGER,
    billingAddressCity: DataTypes.STRING,
    billingAddressState: DataTypes.STRING,
    billingAddressCountry: DataTypes.STRING,
    billingType: DataTypes.STRING,
    noOfShipment: DataTypes.INTEGER,
    lastLoginAt: DataTypes.DATE,
    rating: DataTypes.DECIMAL(2, 1),
    rateType: DataTypes.INTEGER

  }, {
    sequelize,
    modelName: 'mvUser',
    paranoid: true
  });
  return mvUser;
};