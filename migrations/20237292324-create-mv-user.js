'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('mvUsers', {
            id: {
                allowNull: false,
                primaryKey: true,
                type: Sequelize.UUID, // Use UUID data type
                defaultValue: Sequelize.UUIDV4, // Generate a UUID on insert
            },
            name: {
                type: Sequelize.STRING
            },
            email: {
                type: Sequelize.STRING
            },
            mobile: {
                type: Sequelize.BIGINT
            },
            password: {
                type: Sequelize.STRING
            },
            otp: {
                allowNull: true,
                type: Sequelize.STRING
            },
            isUser: {
                type: Sequelize.BOOLEAN
            },
            roleName: {
                type: Sequelize.STRING
            },
            roleId: {
                type: Sequelize.INTEGER
            },
            createdBy: {
                type: Sequelize.UUID
            },
            userType: {
                type: Sequelize.STRING
            },
            isDummy: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            isVendor: {
                type: Sequelize.BOOLEAN
            },
            resetPasswordExpires: {
                type: Sequelize.DATE
            },
            resetPasswordToken: {
                type: Sequelize.STRING
            },
            isActive: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            },
            secondEmail: {
                type: Sequelize.STRING
            },
            GSTNo: {
                type: Sequelize.STRING
            },
            panNo: {
                type: Sequelize.STRING
            },
            dealItem: {
                type: Sequelize.STRING
            },
            isBlocked: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            },
            monthlyShipping: {
                type: Sequelize.INTEGER
            },
            avgShipmentWeight: {
                type: Sequelize.STRING
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            deletedAt: {
                type: Sequelize.DATE
            },
            rating: {
                type: Sequelize.DECIMAL(2, 1),
                defaultValue: 0.0
            },
            roleName: {
                type: Sequelize.STRING
            },
            roleId: {
                type: Sequelize.INTEGER
            },
            createdBy: {
                type: Sequelize.UUID
            },
            userType: {
                type: Sequelize.STRING
            },
            rateType: {
                type: Sequelize.TINYINT,
                defaultValue: 1,
                comment: "1=>per kg,2=>per box,3=>both"
            }

        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('mvUsers');
    }
};

