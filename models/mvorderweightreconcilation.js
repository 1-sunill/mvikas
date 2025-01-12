'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class mvOrderWeightReconcilation extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      mvOrderWeightReconcilation.belongsTo(models.mvUser, {
        foreignKey: 'userId',
        as: "user"
      })
      mvOrderWeightReconcilation.belongsTo(models.mvUser, {
        foreignKey: 'vendorId',
        as: "vendor"
      })
      mvOrderWeightReconcilation.belongsTo(models.mvService, {
        foreignKey: 'Serviceid',
        as: "serviceNew"
      })
      mvOrderWeightReconcilation.belongsTo(models.mvService, {
        foreignKey: 'serviceOldId',
        as: "service"
      })
      mvOrderWeightReconcilation.belongsTo(models.mvorder, {
        foreignKey: 'orderId',
        as: "order"
      })
    }
  }
  mvOrderWeightReconcilation.init({
    orderId: {
      type: DataTypes.INTEGER
    },
    Order_id: {
      type: DataTypes.STRING
    },
    vendorId: {
      type: DataTypes.UUID, // Use UUID data type,     
    },
    Serviceid: {
      type: DataTypes.INTEGER
    },
    serviceOldId: {
      type: DataTypes.INTEGER
    },
    Shipment_weight: {
      type: DataTypes.DECIMAL(19, 2)
    },
    chargable_weight: {
      type: DataTypes.DECIMAL(10, 2)
    },
    Shipment_value: {
      type: DataTypes.DECIMAL(10, 2)
    },
    Cft: {
      type: DataTypes.DECIMAL(10, 2)
    },
    Divisor: {
      type: DataTypes.DECIMAL(10, 2)
    },
    rate: {
      type: DataTypes.DECIMAL(10, 2)
    },
    totalAdditionalAmount: {
      type: DataTypes.DECIMAL(10, 2)
    },
    VtotalAdditionalAmount: {
      type: DataTypes.DECIMAL(10, 2)
    },
    additionalCharges: {
      type: DataTypes.TEXT
    },
    min_Chargable_weight: {
      type: DataTypes.DECIMAL(4, 2)
    },
    minFreight: {
      type: DataTypes.DECIMAL(10, 2)
    },
    minODA: {
      type: DataTypes.DECIMAL(10, 2)
    },
    odaPerKG: {
      type: DataTypes.DECIMAL(10, 2)
    },
    oda_amount: {
      type: DataTypes.DECIMAL(10, 2)
    },
    taxableAmount: {
      type: DataTypes.DECIMAL(10, 2)
    },
    V_taxableAmount: {
      type: DataTypes.DECIMAL(10, 2)
    },
    gst: {
      type: DataTypes.DECIMAL(10, 2)
    },
    gst_Amount: {
      type: DataTypes.DECIMAL(10, 2)
    },
    V_gst_Amount: {
      type: DataTypes.DECIMAL(10, 2)
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2)
    },
    V_totalAmount: {
      type: DataTypes.DECIMAL(10, 2)
    },
    userId: {
      type: DataTypes.UUID, // Use UUID data type,     
    },
    servicetype: {
      type: DataTypes.STRING
    },
    ExpectedDelivery: {
      type: DataTypes.DATE
    },
    VGst: {
      type: DataTypes.DECIMAL(10, 2)
    },
    VMinChargableWeight: {
      type: DataTypes.DECIMAL(10, 2)
    },
    VMinFreight: {
      type: DataTypes.DECIMAL(10, 2)
    },
    VMinODA: {
      type: DataTypes.DECIMAL(10, 2)
    },
    VOdaAmount: {
      type: DataTypes.DECIMAL(10, 2)
    },
    VOdaPerKG: {
      type: DataTypes.DECIMAL(10, 2)
    },
    VDocketCharge: {
      type: DataTypes.DECIMAL(10, 2)
    },
    VRate: {
      type: DataTypes.DECIMAL(10, 2)
    },
    latestStatus: {
      type: DataTypes.INTEGER,
    },
    VadditionalCharges: {
      type: DataTypes.TEXT
    },
    Vchargable_weight: {
      type: DataTypes.DECIMAL(10, 2)
    },
    specialCharge: {
      type: DataTypes.DECIMAL(10, 2)
    },
    VspecialCharge: {
      type: DataTypes.DECIMAL(10, 2)
    },
    excess_weight: {
      type: DataTypes.DECIMAL(10, 2)
    },
    new_weight: {
      type: DataTypes.DECIMAL(10, 2)
    },
    excess_amount: {
      type: DataTypes.DECIMAL(10, 2)
    },
    new_amount: {
      type: DataTypes.DECIMAL(10, 2)
    },
    rateType: {
      type: DataTypes.TINYINT
    },
    status: {
      type: DataTypes.TINYINT
    },
    remark: {
      type: DataTypes.TEXT
    }
  }, {
    sequelize,
    modelName: 'mvOrderWeightReconcilation',
  });
  return mvOrderWeightReconcilation;
};