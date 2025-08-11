'use strict';

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Reports', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      machineCode: {
        type: Sequelize.STRING,
        allowNull: false
      },
      hostname: {
        type: Sequelize.STRING,
        allowNull: false
      },
      client: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false
      },
      stationName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      cpu: {
        type: Sequelize.STRING,
        allowNull: false
      },
      ram: {
        type: Sequelize.STRING,
        allowNull: false
      },
      storage: {
        type: Sequelize.STRING,
        allowNull: false
      },
      tpm: {
        type: Sequelize.STRING,
        allowNull: false
      },
      secureBoot: {
        type: Sequelize.STRING,
        allowNull: false
      },
      publicIP: {
        type: Sequelize.STRING,
        allowNull: false
      },
      compatible: {
        type: Sequelize.STRING,
        allowNull: false
      },
      issues: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }, options);
  },
  async down(queryInterface, Sequelize) {
    options.tableName = 'Reports';
    await queryInterface.dropTable(options);
  }
};