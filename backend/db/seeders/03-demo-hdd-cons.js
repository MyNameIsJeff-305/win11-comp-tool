'use strict';

const { HDDCon } = require('../models');


let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;
}
module.exports = {
  async up(queryInterface, Sequelize) {
    await HDDCon.bulkCreate([
      { date: 'November 2025', HDDNumber: 3 },
      { date: 'December 2025', HDDNumber: 4 },
      { date: 'January 2026', HDDNumber: 5 },
      { date: 'February 2026', HDDNumber: 1 },
      { date: 'March 2026', HDDNumber: 2 },
      { date: 'April 2026', HDDNumber: 3 },
      { date: 'May 2026', HDDNumber: 4 },
      { date: 'June 2026', HDDNumber: 5 },
      { date: 'July 2026', HDDNumber: 1 },
      { date: 'August 2026', HDDNumber: 2 },
      { date: 'September 2026', HDDNumber: 3 },
      { date: 'October 2026', HDDNumber: 4 },
      { date: 'November 2026', HDDNumber: 5 },
      { date: 'December 2026', HDDNumber: 1 },

      { date: 'January 2027', HDDNumber: 2 },
      { date: 'February 2027', HDDNumber: 3 },
      { date: 'March 2027', HDDNumber: 4 },
      { date: 'April 2027', HDDNumber: 5 },
      { date: 'May 2027', HDDNumber: 1 },
      { date: 'June 2027', HDDNumber: 2 },
      { date: 'July 2027', HDDNumber: 3 },
      { date: 'August 2027', HDDNumber: 4 },
      { date: 'September 2027', HDDNumber: 5 },
      { date: 'October 2027', HDDNumber: 1 },
      { date: 'November 2027', HDDNumber: 2 },
      { date: 'December 2027', HDDNumber: 3 },

      { date: 'January 2028', HDDNumber: 4 },
      { date: 'February 2028', HDDNumber: 5 },
      { date: 'March 2028', HDDNumber: 1 },
      { date: 'April 2028', HDDNumber: 2 },
      { date: 'May 2028', HDDNumber: 3 },
      { date: 'June 2028', HDDNumber: 4 },
      { date: 'July 2028', HDDNumber: 5 },
      { date: 'August 2028', HDDNumber: 1 },
      { date: 'September 2028', HDDNumber: 2 },
      { date: 'October 2028', HDDNumber: 3 },
      { date: 'November 2028', HDDNumber: 4 },
      { date: 'December 2028', HDDNumber: 5 },

      { date: 'January 2029', HDDNumber: 1 },
      { date: 'February 2029', HDDNumber: 2 },
      { date: 'March 2029', HDDNumber: 3 },
      { date: 'April 2029', HDDNumber: 4 },
      { date: 'May 2029', HDDNumber: 5 },
      { date: 'June 2029', HDDNumber: 1 },
      { date: 'July 2029', HDDNumber: 2 },
      { date: 'August 2029', HDDNumber: 3 },
      { date: 'September 2029', HDDNumber: 4 },
      { date: 'October 2029', HDDNumber: 5 },
      { date: 'November 2029', HDDNumber: 1 },
      { date: 'December 2029', HDDNumber: 2 },

      { date: 'January 2030', HDDNumber: 3 },
      { date: 'February 2030', HDDNumber: 4 },
      { date: 'March 2030', HDDNumber: 5 },
      { date: 'April 2030', HDDNumber: 1 },
      { date: 'May 2030', HDDNumber: 2 },
      { date: 'June 2030', HDDNumber: 3 },
      { date: 'July 2030', HDDNumber: 4 },
      { date: 'August 2030', HDDNumber: 5 },
      { date: 'September 2030', HDDNumber: 1 },
      { date: 'October 2030', HDDNumber: 2 },
      { date: 'November 2030', HDDNumber: 3 },
      { date: 'December 2030', HDDNumber: 4 }
    ], options);
  },

  async down(queryInterface, Sequelize) {
    options.tableName = 'HDDCons';
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(options, {
      date: {
        [Op.in]: [
          'November 2025', 'December 2025', 'January 2026', 'February 2026',
          'March 2026', 'April 2026', 'May 2026', 'June 2026',
          'July 2026', 'August 2026', 'September 2026', 'October 2026',
          'November 2026', 'December 2026', 'January 2027', 'February 2027',
          'March 2027', 'April 2027', 'May 2027', 'June 2027',
          'July 2027', 'August 2027', 'September 2027', 'October 2027',
          'November 2027', 'December 2027', 'January 2028', 'February 2028',
          'March 2028', 'April 2028', 'May 2028', 'June 2028',
          'July 2028', 'August 2028', 'September 2028', 'October 2028',
          'November 2028', 'December 2028', 'January 2029', 'February 2029',
          'March 2029', 'April 2029', 'May 2029', 'June 2029',
          'July 2029', 'August 2029', 'September 2029', 'October 2029',
          'November 2029', 'December 2029', 'January 2030', 'February 2030',
          'March 2030', 'April 2030', 'May 2030', 'June 2030',
          'July 2030', 'August 2030', 'September 2030', 'October 2030',
          'November 2030', 'December 2030'
        ]
      }
    }, {});
  }
};
