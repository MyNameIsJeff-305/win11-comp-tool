const express = require('express');
const { Op } = require('sequelize');
const { Report, sequelize } = require('../../db/models');  // Adjust if needed

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const { search, compatible, createdAt } = req.query;

        let page = parseInt(req.query.page, 10);
        let size = parseInt(req.query.size, 10);

        if (!page || page < 1) page = 1;
        if (!size || size < 1) size = 12;

        // Decide which LIKE operator to use
        const likeOperator = sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;

        const where = {};

        if (search) {
            where[Op.or] = [
                { client: { [likeOperator]: `%${search}%` } },
                { stationName: { [likeOperator]: `%${search}%` } },
                { hostname: { [likeOperator]: `%${search}%` } },
                { machineCode: { [likeOperator]: `%${search}%` } },
                { publicIP: { [likeOperator]: `%${search}%` } },
                { email: { [likeOperator]: `%${search}%` } }
            ];
        }

        if (compatible !== undefined) {
            if (compatible.toLowerCase() === 'yes') {
                where.compatible = 'Yes';
            } else if (compatible.toLowerCase() === 'no') {
                where.compatible = 'No';
            }
        }

        if (createdAt) {
            const date = new Date(createdAt);
            if (!isNaN(date)) {
                where.createdAt = { [Op.gte]: date };
            }
        }

        const reports = await Report.findAll({
            where,
            limit: size,
            offset: (page - 1) * size,
            order: [['createdAt', 'DESC']]
        });

        const totalReports = await Report.count({ where });

        return res.json({ reports, totalReports });
    } catch (error) {
        console.error('Error fetching reports:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/total', async (req, res) => {
    try {
        const { searchTerm, compatibleParam } = req.query;

        const where = {};

        if (searchTerm) {
            const likeOperator = sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;
            where[Op.or] = [
                { client: { [likeOperator]: `%${searchTerm}%` } },
                { stationName: { [likeOperator]: `%${searchTerm}%` } },
                { hostname: { [likeOperator]: `%${searchTerm}%` } },
                { machineCode: { [likeOperator]: `%${searchTerm}%` } },
                { publicIP: { [likeOperator]: `%${searchTerm}%` } },
                { email: { [likeOperator]: `%${searchTerm}%` } }
            ];
        }

        if (compatibleParam !== undefined) {
            if (compatibleParam.toLowerCase() === 'yes') {
                where.compatible = 'Yes';
            } else if (compatibleParam.toLowerCase() === 'no') {
                where.compatible = 'No';
            }
        }

        const totalReports = await Report.count({ where });

        return res.json({ totalReports });
    } catch (error) {
        console.error('Error fetching total reports:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
