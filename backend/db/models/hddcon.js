'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class HDDCon extends Model {
    static associate(models) {
    }
  }
  HDDCon.init({
    date: { type: DataTypes.STRING, allowNull: false },
    HDDNumber: { type: DataTypes.INTEGER}
  }, {
    sequelize,
    modelName: 'HDDCon',
  });
  return HDDCon;
};