"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CrmMrsLead extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  CrmMrsLead.init(
    {
      lead_id: DataTypes.INTEGER,
      customer_designation: DataTypes.STRING,
      customer_department: DataTypes.STRING,
      model_no: DataTypes.STRING,
      job_no: DataTypes.STRING,
      requirement: DataTypes.STRING,
      date_formal_enquiry_received: DataTypes.DATE,
      competitor_details: DataTypes.STRING,
      setup_for_3_quotes: DataTypes.STRING,
      offer_received_date: DataTypes.DATE,
      offer_submitted_client: DataTypes.STRING,
      date_of_budgetary_submission: DataTypes.DATE,
      budgetary_quote_price: {
        type: DataTypes.DOUBLE(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      source_of_firm_enquiry: DataTypes.STRING,
      enquiry_date: DataTypes.DATE,
      firm_enquiry_due_date: DataTypes.DATE,
      firm_enquiry_submission_date: DataTypes.DATE,
      final_price_submission: {
        type: DataTypes.DOUBLE(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      firm_enquiry_participated_by: DataTypes.STRING,
      reverse_auction: DataTypes.STRING,
      purchase_order: DataTypes.STRING,
      remarks: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: "CrmMrsLead",
    }
  );
  return CrmMrsLead;
};
