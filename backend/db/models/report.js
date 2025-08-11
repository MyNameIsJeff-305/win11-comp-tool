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
    client: { 
      type: DataTypes.STRING,
      allowNull: false
    },
    email: { 
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    stationName: { 
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
    publicIP: { 
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
    }
  }, {
    sequelize,
    modelName: 'Report',
  });
  return Report;
};