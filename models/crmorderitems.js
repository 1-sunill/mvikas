"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmOrderItems extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      CrmOrderItems.belongsTo(models.CrmLead, {
        foreignKey: "itemable_id",
        as: "lead",
      });

      // Define the association with the crmProduct model
      CrmOrderItems.belongsTo(models.crmProduct, {
        foreignKey: "product_id",
        as: "product",
      });

      // Define the association with the CrmMake model
      CrmOrderItems.belongsTo(models.CrmMake, {
        foreignKey: "make_id",
        as: "makeData",
      });
      CrmOrderItems.hasMany(models.CrmOrderItemVendor, {
        foreignKey: "order_item_id",
        as: "orderVendorItem",
      });
      CrmOrderItems.belongsTo(models.CrmUnitType, {
        foreignKey: "unit_type_id",
        as: "unitTypeData",
      });
      CrmOrderItems.belongsTo(models.Unit, {
        foreignKey: "unit_type_id",
        as: "unitData",
      });

      CrmOrderItems.hasOne(models.CrmAllCustomer, {
        foreignKey: "id",
        sourceKey: "vendorId",
        as: "vendorData",
      });
      CrmOrderItems.hasMany(models.CrmDocument, {
        foreignKey: "documentable_id",
        as: "documentData", // Changed to "documentData" for clarity
      });
      CrmOrderItems.hasOne(models.CrmDocument, {
        foreignKey: "documentable_id",
        as: "documentSingleData", // Changed to "documentData" for clarity
      });

      CrmOrderItems.hasMany(models.CrmActivityLogs, {
        foreignKey: "entity_id",
        as: "activityLog",
      });
      CrmOrderItems.hasMany(models.CrmStatusLog, {
        foreignKey: "status_loggable_id",
        as: "statusLog",
      });
      CrmOrderItems.hasMany(models.CrmStatusLog, {
        foreignKey: "status_loggable_id",
        as: "statusLogDispatchInvoice",
      });

      CrmOrderItems.hasOne(models.CrmSubdispatch, {
        foreignKey: "id",
        sourceKey: "itemable_id",
        as: "SubdispacthData",
      });
      CrmOrderItems.hasOne(models.CrmOrderItems, {
        foreignKey: "id",
        sourceKey: "itemable_id",
        as: "orderItem",
      });
      CrmOrderItems.belongsTo(models.CrmVendor, {
        foreignKey: "vendorId",
        sourceKey: "id",
        as: "vendor", // Changed to "attribute" for clarity
      });
    }
  }
  CrmOrderItems.init(
    {
      itemable_type: DataTypes.STRING,
      itemable_id: DataTypes.INTEGER,
      product_id: DataTypes.INTEGER,
      name: DataTypes.STRING,
      make_id: DataTypes.INTEGER,
      hsn: DataTypes.STRING,
      make: DataTypes.STRING,
      quantity: {
        type: DataTypes.DOUBLE(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      unit_type_id: DataTypes.INTEGER,
      dispatchIsPlanning: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      price: {
        type: DataTypes.DOUBLE(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      tat: DataTypes.DATE,
      sales_price_range: DataTypes.STRING,
      remark: DataTypes.STRING,
      scm_remarks: DataTypes.STRING,
      sales_remarks: DataTypes.STRING,
      gst_rate: DataTypes.INTEGER,
      dispatch_tat: DataTypes.DATE,
      sales_tat: DataTypes.DATE,
      length: {
        type: DataTypes.DOUBLE(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      width: {
        type: DataTypes.DOUBLE(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      grade: DataTypes.STRING,
      thickness: {
        type: DataTypes.DOUBLE(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      dia: {
        type: DataTypes.DOUBLE(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      vendorId: DataTypes.INTEGER,
      comment: DataTypes.STRING,
      // shortage_excess: {
      //   type: DataTypes.DOUBLE(10, 2),
      //   allowNull: false,
      //   validate: {
      //     min: 0,
      //   },
      // },
      shortage_excess_type: DataTypes.INTEGER,
      shortage_excess_unit_type_id: DataTypes.INTEGER,
      shortage_excess_action_by: DataTypes.INTEGER,
      shortage_excess_comment: DataTypes.TEXT,
      shortage_excess_doc: DataTypes.STRING,
      shortage_excess_status: DataTypes.STRING,
      shortage_excess_value: {
        type: DataTypes.DOUBLE(10, 2),
        // allowNull: false,
        validate: {
          min: 0,
        },
      },
      item_attributes: DataTypes.JSON,
      varientId: DataTypes.INTEGER,
      varientName: DataTypes.STRING,
      finance_comment: DataTypes.STRING,
      scm_comment: DataTypes.STRING,
      sales_comment: DataTypes.STRING,
      sales_status: DataTypes.STRING,
      scm_status: DataTypes.STRING,
      finance_status: DataTypes.STRING,
      poSeries: DataTypes.STRING,
      itemId: DataTypes.STRING,
      label: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "CrmOrderItems",
    }
  );
  return CrmOrderItems;
};
