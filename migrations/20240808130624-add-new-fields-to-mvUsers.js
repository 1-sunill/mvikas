'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('mvUsers', 'companyAddressLine1', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('mvUsers', 'companyAddressLine2', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('mvUsers', 'companyAddressPincode', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('mvUsers', 'companyAddressState', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('mvUsers', 'companyAddressCity', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('mvUsers', 'companyAddressCountry', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('mvUsers', 'companyDescription', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('mvUsers', 'billingAddressLine1', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('mvUsers', 'billingAddressLine2', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('mvUsers', 'billingAddressPincode', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('mvUsers', 'billingAddressState', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('mvUsers', 'billingAddressCity', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('mvUsers', 'billingAddressCountry', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // Add more fields as needed
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('mvUsers', 'companyAddressLine1');
    await queryInterface.removeColumn('mvUsers', 'companyAddressLine2');
    await queryInterface.removeColumn('mvUsers', 'companyAddressPincode');
    await queryInterface.removeColumn('mvUsers', 'companyAddressState');
    await queryInterface.removeColumn('mvUsers', 'companyAddressCity');
    await queryInterface.removeColumn('mvUsers', 'companyAddressCountry');
    await queryInterface.removeColumn('mvUsers', 'companyDescription');
    await queryInterface.removeColumn('mvUsers', 'billingAddressLine1');
    await queryInterface.removeColumn('mvUsers', 'billingAddressLine2');
    await queryInterface.removeColumn('mvUsers', 'billingAddressPincode');
    await queryInterface.removeColumn('mvUsers', 'billingAddressState');
    await queryInterface.removeColumn('mvUsers', 'billingAddressCity');
    await queryInterface.removeColumn('mvUsers', 'billingAddressCountry');

    // Remove other fields if you added more
  }
};
