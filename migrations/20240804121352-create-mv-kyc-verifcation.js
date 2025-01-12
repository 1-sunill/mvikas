'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mvKycVerifcations', {
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
      businessType: {
        type: Sequelize.STRING
      },
      photoIdentification: {
        type: Sequelize.STRING
      },
      isApprovedPhotoIdentification : {
        type: Sequelize.BOOLEAN
      },
      aadharNo : {
        type: Sequelize.INTEGER
      },
      aadharOtpClinetId : {
        type: Sequelize.INTEGER
      },
      isValidAadhar : {
        type: Sequelize.INTEGER
      },
      documentNumber:{
        type: Sequelize.INTEGER
      },
      document1Type:{
        type: Sequelize.STRING
      },
      document1FrontSide:{
        type: Sequelize.STRING
      },
      document1BackSide:{
        type: Sequelize.STRING
      },
      document2Type:{
        type: Sequelize.STRING
      },
      document2FrontSide:{
        type: Sequelize.STRING
      },
      document2BackSide:{
        type: Sequelize.STRING
      },
      companyType:{
        type: Sequelize.STRING
      },
      GSTNo:{
        type: Sequelize.STRING
      },
      tanNo:{
        type: Sequelize.STRING
      },
      isCompleted:{
        type: Sequelize.BOOLEAN
      },
      isApproved:{
        type: Sequelize.INTEGER
      },
      customerName:{
        type: Sequelize.STRING
      },
      documentNumber2:{
        type: Sequelize.STRING
      },
      note:{
        type: Sequelize.STRING
      },
      deletedAt: {
        type: Sequelize.DATE
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('mvKycVerifcations');
  }
};