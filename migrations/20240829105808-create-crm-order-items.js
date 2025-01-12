"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("CrmOrderItems", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      itemable_type: {
        type: Sequelize.STRING,
      },
      itemable_id: {
        type: Sequelize.STRING,
      },
      name: {
        type: Sequelize.STRING,
      },
      product_id: {
        type: Sequelize.INTEGER,
      },
      make_id: {
        type: Sequelize.INTEGER,
      },
      category_id: {
        type: Sequelize.INTEGER,
      },
      category_id: {
        type: Sequelize.INTEGER,
      },
      hsn: {
        type: Sequelize.STRING,
      },
      make: {
        type: Sequelize.STRING,
      },
      category_name: {
        type: Sequelize.STRING,
      },
      unit_name: {
        type: Sequelize.STRING,
      },
      quantity: {
        type: Sequelize.DOUBLE(10, 2),
      },
      length: {
        type: Sequelize.DOUBLE(10, 2),
      },
      width: {
        type: Sequelize.DOUBLE(10, 2),
      },
      grade: {
        type: Sequelize.DOUBLE(10, 2),
      },
      thickness: {
        type: Sequelize.DOUBLE(10, 2),
      },
      dia: {
        type: Sequelize.DOUBLE(10, 2),
      },
      unit_type_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "CrmUnitTypes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      price: {
        type: Sequelize.DOUBLE(16, 2),
      },
      gst_rate: {
        type: Sequelize.SMALLINT,
      },
      sales_price_range: {
        type: Sequelize.STRING,
      },
      tat: {
        type: Sequelize.DATE,
      },
      sales_tat: {
        type: Sequelize.DATE,
      },
      dispatch_tat: {
        type: Sequelize.DATE,
      },
      shortage_excess_value: {
        type: Sequelize.DOUBLE(10, 2),
      },
      shortage_excess_doc: {
        type: Sequelize.STRING,
      },
      shortage_excess_type: {
        type: Sequelize.TINYINT,
        comment: "1 => Shortage, 2 => excess",
      },
      shortage_excess_unit_type_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "CrmUnitTypes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      shortage_excess_action_by: {
        type: Sequelize.INTEGER,
        references: {
          model: "crmusers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      shortage_excess_status: {
        type: Sequelize.ENUM,
        values: ["pending", "approved", "revised", "declined"],
        allowNull: false,
        defaultValue: "pending",
        comment: "Status types: pending, approved, revised,declined",
      },
      shortage_excess_comment: {
        type: Sequelize.TEXT,
      },
      finance_user_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "crmusers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      status: {
        type: Sequelize.ENUM,
        values: ["pending", "approved", "revised", "declined"],
        allowNull: false,
        defaultValue: "pending",
        comment: "Status types: pending, approved, revised,declined",
      },
      comment: {
        type: Sequelize.TEXT,
      },
      remark: {
        type: Sequelize.STRING,
      },
      item_attributes: {
        type: Sequelize.JSON,
      },
      sales_remarks: {
        type: Sequelize.STRING,
      },
      scm_remarks: {
        type: Sequelize.STRING,
      },
      varientId: {
        type: Sequelize.INTEGER,
      },
      varientName: {
        type: Sequelize.STRING,
      },
      vendorId: {
        type: Sequelize.INTEGER,
        references: {
          model: "CrmVendors",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      dispatchIsPlanning: {
        type: Sequelize.INTEGER,
        comment: "1=>planning,2=>exceution",
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
    await queryInterface.dropTable("CrmOrderItems");
  },
};
