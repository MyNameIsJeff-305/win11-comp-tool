'use strict';

const { Report } = require('../models');


let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await Report.bulkCreate([
      {
        machineCode: 'ABC123',
        hostname: 'DESKTOP-01',
        cpu: 'Intel Core i7',
        ram: '16GB',
        storage: '512GB SSD',
        tpm: '1.0',
        secureBoot: 'Enabled',
        compatible: 'Yes',
        issues: "TPM not updated",
        userId: 1
      },
      {
        machineCode: 'XYZ456',
        hostname: 'LAPTOP-02',
        cpu: 'AMD Ryzen 5',
        ram: '8GB',
        storage: '256GB SSD',
        tpm: '2.0',
        secureBoot: 'Disabled',
        compatible: 'No',
        issues: "Secure Boot not enabled",
        userId: 1
      }
    ], options);
  },

  async down(queryInterface, Sequelize) {
    options.tableName = 'Reports';
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(options, {
      machineCode: { [Op.in]: ['ABC123', 'XYZ456'] }
    }, {});
  }
};
