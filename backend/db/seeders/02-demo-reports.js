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
        machineCode: 'T3ST1',
        hostname: 'DESKTOP-45',
        client: "T3st Client",
        email: 'test@test.com',
        stationName: 'T3st Station',
        cpu: 'Intel Core i5',
        ram: '12GB',
        storage: '1TB HDD',
        tpm: '2.0',
        secureBoot: 'Enabled',
        publicIP: '192.168.1.1',
        compatible: 'Yes',
        issues: "None"
      },
      {
        machineCode: 'T3ST2',
        hostname: 'OFFICE-PC',
        client: "T3st2 Client",
        email: 'test2@test.com',
        stationName: 'T3st2 Station',
        cpu: 'AMD Ryzen 7',
        ram: '32GB',
        storage: '512GB NVMe',
        tpm: '1.2',
        secureBoot: 'Disabled',
        publicIP: '192.168.1.2',
        compatible: 'No',
        issues: "Secure Boot disabled"
      }
    ], options);
  },

  async down(queryInterface, Sequelize) {
    options.tableName = 'Reports';
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(options, {
      machineCode: { [Op.in]: ['T3ST1', 'T3ST2'] }
    }, {});
  }
};
