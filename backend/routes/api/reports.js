const express = require('express');
const { Op } = require('sequelize');
const { Report } = require('../../db/models');

const router = express.Router();

// GET /api/reports?limit=10&page=1&search=...&compatible=yes
router.get('/', async (req, res) => {
    try {
        const { client, compatible, createdAt } = req.query;

        const page = parseInt(req.query.page) || null;
        const size = parseInt(req.query.size) || null;

        const where = {};

        if(client) {
            where.client = client;
        }
        if(compatible) {
            where.compatible = compatible;
        }
        if(createdAt) {
            where.createdAt = {
                [Op.gte]: new Date(createdAt)
            };
        }

        const reports = await Report.findAll({
            where,
            limit: size,
            offset: (page - 1) * size
        });

        return res.json(reports);

    } catch (error) {
        next(error);
    }
});

//Get A Report by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const report = await Report.findByPk(id);
        if (!report) {
            return res.status(404).json({ error: "Report not found" });
        }
        return res.json(report);
    } catch (error) {
        console.error("Error fetching report:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;