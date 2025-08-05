'use strict';

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Reports', [
      {
        machineCode: 'ABC123',
        hostname: 'DESKTOP-01',
        cpu: 'Intel Core i7',
        ram: '16GB',
        storage: '512GB SSD',
        tpm: '2.0',
        secureBoot: 'Enabled',
        compatible: 'Yes',
        issues: null,
        userId: 1
      },
    ], options);
  },

  async down(queryInterface, Sequelize) {
    options.tableName = 'Reports';
    await queryInterface.bulkDelete(options, null, {});
  }
};
