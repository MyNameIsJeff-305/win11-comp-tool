'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Report extends Model {

    static associate(models) {

    }
  }
  Report.init({
    machineCode: { 
      type: DataTypes.STRING,
      allowNull: false
    },
    hostname: { 
      type: DataTypes.STRING,
      allowNull: false
    },
    cpu: { 
      type: DataTypes.STRING,
      allowNull: false
    },
    ram: { 
      type: DataTypes.STRING,
      allowNull: false
    },
    storage: { 
      type: DataTypes.STRING,
      allowNull: false
    },
    tpm: { 
      type: DataTypes.STRING,
      allowNull: false
    },
    secureBoot: { 
      type: DataTypes.STRING,
      allowNull: false
    },
    compatible: { 
      type: DataTypes.STRING,
      allowNull: false
    },
    issues: { 
      type: DataTypes.STRING,
      allowNull: true
    },
    userId: { 
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Report',
  });
  return Report;
};