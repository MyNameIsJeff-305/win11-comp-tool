'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Report extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
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
      type: DataTypes.STRING
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