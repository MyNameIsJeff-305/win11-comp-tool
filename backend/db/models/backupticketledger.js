'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BackupTicketLedger extends Model {
    static associate(_models) {}
  }

  BackupTicketLedger.init(
    {
      periodKey: {
        type: DataTypes.STRING(7),
        allowNull: false
      },
      departmentId: {
        type: DataTypes.STRING(64),
        allowNull: false
      },
      companyName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
        validate: {
          isIn: [['pending', 'created', 'failed']]
        }
      },
      ticketId: {
        type: DataTypes.STRING(64),
        allowNull: true
      },
      lastError: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'BackupTicketLedger',
      indexes: [
        {
          unique: true,
          fields: ['periodKey', 'departmentId'],
          name: 'backup_ticket_ledgers_period_department_unique'
        }
      ]
    }
  );

  return BackupTicketLedger;
};
