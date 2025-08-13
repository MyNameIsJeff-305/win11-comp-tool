'use strict';

const { User } = require('../models');
const bcrypt = require("bcryptjs");

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await User.bulkCreate([
      {
        email: 'alex.hernandez@thesmartsolution.net',
        stationName: 'CEO-MAC',
        clientName: 'SMART Solutions',
        hashedPassword: bcrypt.hashSync('Smart0502!', 10),
      },
      {
        email: 'media@thesmartsolution.net',
        stationName: 'Media-MAC',
        clientName: 'SMART Solutions',
        hashedPassword: bcrypt.hashSync('MM4ever.12395', 10),
      },
      {
        email: 'c.hernandez@thesmartsolution.net',
        stationName: 'Helpdesk-Station',
        clientName: 'SMART Solutions',
        hashedPassword: bcrypt.hashSync('Smart0502!', 10),
      }
    ], options);
  },

  async down(queryInterface, Sequelize) {
    options.tableName = 'Users';
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(options, {
      username: { [Op.in]: ['SMART Solutions'] }
    }, {});
  }
};
