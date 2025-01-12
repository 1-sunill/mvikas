'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mvCustomerAssigns', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.UUID,
        comment:"lpid",
        references: {
          model: "mvUsers",
          key: "id",
        },
        onUpdate: "CASCADE", 
        onDelete: "CASCADE",
      },
      assignTo: {
        type: Sequelize.UUID,
        references: {
          model: "mvUsers",
          key: "id",
        },
        onUpdate: "CASCADE", 
        onDelete: "CASCADE",
      },
      assignBy: {
        type: Sequelize.UUID,
        comment: 'admin',
        references: {
          model: "mvUsers",
          key: "id",
        },
        onUpdate: "CASCADE", 
        onDelete: "CASCADE",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      deletedAt:{
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('mvCustomerAssigns');
  }
};