'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('mvUsers', 'billingType', {
            type: Sequelize.STRING,
            allowNull: true // You can adjust this based on your requirement
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('mvUsers', 'billingType');
    }
};
