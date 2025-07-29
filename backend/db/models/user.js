'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {

    static associate(models) {

    }
  }
  User.init({
    email: {
      type: DataTypes.STRING(256),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    stationName: {
      type: DataTypes.STRING(256),
      allowNull: false
    },
    clientName: {
      type: DataTypes.STRING(256),
      allowNull: false
    },
    hashedPassword: {
      type: DataTypes.STRING.BINARY,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'User',
    defaultScope: {
      attributes: { exclude: ['hashedPassword', 'createdAt', 'updatedAt'] } 
    },
  });
  return User;
};