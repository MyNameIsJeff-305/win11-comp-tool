'use strict';

const { Reports } = require('../models');

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;  // define your schema in options object
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await Reports.bulkCreate([
      {
        reportURL: 'https://example.com/report1',
      },
      {
        reportURL: 'https://example.com/report2',
      },
      {
        reportURL: 'https://example.com/report3',
      }
    ], options);
  },

  async down (queryInterface, Sequelize) {
    options.tableName = 'Reports';
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(options, {
      reportURL: { [Op.in]: ['https://example.com/report1', 'https://example.com/report2', 'https://example.com/report3'] }
    }, {});
  }
};
