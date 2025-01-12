'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvVendorRates extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  mvVendorRates.init({
    vendorId: {
      type: DataTypes.INTEGER     
    },
    serviceId: {
      type: DataTypes.INTEGER      
    },
    zoneIdFrom: {
      type: DataTypes.INTEGER     
    },
    zoneIdTo: {
      type: DataTypes.INTEGER      
    },
    lpRates: {
      type:  DataTypes.DECIMAL(10,2)
    },
    applyGst: {
      type: DataTypes.INTEGER
    },
    weightFrom: {
      type:  DataTypes.DECIMAL(10,2)
    },
    weightTo: {
      type:  DataTypes.DECIMAL(10,2)
    },
    fromTime: {
      type: DataTypes.STRING
    },
    toTime: {
      type: DataTypes.STRING
    },
    channel: {
      type: DataTypes.STRING
    },
    isActive: {
      type: DataTypes.BOOLEAN
    },
    additionalCharges: {
      type: DataTypes.STRING
    },
    CFA: {
      type: DataTypes.STRING
    },
    divisor: {
      type: DataTypes.INTEGER
    },
    maxWeight: {
      type:  DataTypes.DECIMAL(10,2)
    },
    minWeight: {
      type:  DataTypes.DECIMAL(10,2)
    },
    GST: {
      type:  DataTypes.DECIMAL(10,2)
    },
    minimumODA1: {
      type: DataTypes.INTEGER
    },
    maximumODA2: {
      type: DataTypes.INTEGER
    },
    maximumODA3: {
      type: DataTypes.INTEGER
    },
    ODA1Kg: {
      type:  DataTypes.DECIMAL(10,2)
    },
    ODA2Kg: {
      type:  DataTypes.DECIMAL(10,2)
    },
    ODA3Kg: {
      type:  DataTypes.DECIMAL(10,2)
    },
    minFreight: {
      type:  DataTypes.DECIMAL(10,2)
    },
    createdAt: {
      type: DataTypes.DATE
    },
    updatedAt: {
      type: DataTypes.DATE
    },
    deletedAt: {
      type: DataTypes.DATE
    }
  }, {
    sequelize,
    modelName: 'mvVendorRates',
  });
  return mvVendorRates;
};