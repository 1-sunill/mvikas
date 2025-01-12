"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("CrmMrsLeads", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      lead_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "CrmLeads",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      customer_designation: {
        type: Sequelize.STRING,
      },

      customer_department: {
        type: Sequelize.STRING,
      },
      model_no: {
        type: Sequelize.STRING,
      },
      job_no: {
        type: Sequelize.STRING,
      },
      requirement: {
        type: Sequelize.TEXT,
      },
      date_formal_enquiry_received: {
        type: Sequelize.DATE,
      },
      competitor_details: {
        type: Sequelize.STRING,
      },
      setup_for_3_quotes: {
        type: Sequelize.STRING,
      },
      offer_received_date: {
        type: Sequelize.DATE,
      },
      offer_submitted_client: {
        type: Sequelize.STRING,
      },
      date_of_budgetary_submission: {
        type: Sequelize.DATE,
      },
      budgetary_quote_price: {
        type: Sequelize.DOUBLE,
      },
      source_of_firm_enquiry: {
        type: Sequelize.STRING,
      },
      enquiry_date: {
        type: Sequelize.DATE,
      },
      firm_enquiry_due_date: {
        type: Sequelize.DATE,
      },
      firm_enquiry_submission_date: {
        type: Sequelize.DATE,
      },
      final_price_submission: {
        type: Sequelize.DOUBLE,
      },
      firm_enquiry_participated_by: {
        type: Sequelize.STRING,
      },
      reverse_auction: {
        type: Sequelize.STRING,
      },
      purchase_order: {
        type: Sequelize.STRING,
      },
      remarks: {
        type: Sequelize.TEXT,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      deletedAt: {
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("CrmMrsLeads");
  },
};
