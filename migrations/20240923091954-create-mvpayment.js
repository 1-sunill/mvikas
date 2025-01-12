'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mvpayments', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.UUID,
        references: {
          model: "mvUsers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      vendorId: {
        type: Sequelize.UUID,
        references: {
          model: "mvUsers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      vendorOldId: {
        type: Sequelize.UUID,
        references: {
          model: "mvUsers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      paymentType: {
        type: Sequelize.STRING,
        comment: 'Wallet,Paylater,Online'
      },
      billingType: {
        type: Sequelize.STRING,
        comment: 'Prepaid,Postpaid'
      },
      creditLimit: {
        type: Sequelize.DECIMAL(10, 2)
      },
      availableLimit: {
        type: Sequelize.DECIMAL(10, 2)
      },
      utilizedLimit: {
        type: Sequelize.DECIMAL(10, 2)
      },
      totalAmount: {
        type: Sequelize.DECIMAL(10, 2)
      },
      taxableAmount: {
        type: Sequelize.DECIMAL(10, 2)
      },
      transactionId: {
        type: Sequelize.STRING,
        comment: 'payment gateway transaction id'
      },
      orderId: {
        type: Sequelize.STRING,
        comment: 'payment gateway order id'
      },
      refundDate: {
        type: Sequelize.DATE
      },
      refundAmount: {
        type: Sequelize.DECIMAL(10, 2)
      },
      status: {
        type: Sequelize.STRING,
        comment: 'Initiated,Completed,Failed,Cancelled,Refunded'
      },
      isResetCredit: {
        type: Sequelize.BOOLEAN
      },
      deletedAt: {
        type: Sequelize.DATE
      },
      walletId: {
        type: Sequelize.BIGINT
      },
      walletTransactionId: {
        type: Sequelize.BIGINT
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      isWalletRecharge: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('mvpayments');
  }
};