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
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        reportURL: 'https://example.com/report2',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        reportURL: 'https://example.com/report3',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], options);
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  }
};
