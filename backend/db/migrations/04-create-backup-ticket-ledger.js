'use strict';

const getTableName = () => {
  if (process.env.NODE_ENV === 'production' && process.env.SCHEMA) {
    return {
      tableName: 'BackupTicketLedgers',
      schema: process.env.SCHEMA
    };
  }

  return 'BackupTicketLedgers';
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = getTableName();

    await queryInterface.createTable(tableName, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      periodKey: {
        allowNull: false,
        type: Sequelize.STRING(7)
      },
      departmentId: {
        allowNull: false,
        type: Sequelize.STRING(64)
      },
      companyName: {
        allowNull: false,
        type: Sequelize.STRING
      },
      status: {
        allowNull: false,
        defaultValue: 'pending',
        type: Sequelize.STRING(20)
      },
      ticketId: {
        allowNull: true,
        type: Sequelize.STRING(64)
      },
      lastError: {
        allowNull: true,
        type: Sequelize.TEXT
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
    });

    await queryInterface.addIndex(
      tableName,
      ['periodKey', 'departmentId'],
      {
        unique: true,
        name: 'backup_ticket_ledgers_period_department_unique'
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable(getTableName());
  }
};
