'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('mvAccountDetails', 'markup', {
      type: Sequelize.INTEGER,
      allowNull: true, // Set to true or false depending on whether this field is required
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('mvAccountDetails', 'markup');
  }
};
