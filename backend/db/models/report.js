'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Reports extends Model {
        static associate(models) {

        }
    }
    Reports.init({
        reportURL: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isUrl: true // Ensures the reportURL is a valid URL
            }
        }
    }, {
        sequelize,
        modelName: 'Reports',
    });
    return Reports;
};