const express = require('express');
const { Op } = require('sequelize');
const { Report } = require('../../db/models');

const router = express.Router();

// GET /api/reports?limit=10&page=2&compatible=Yes&machineCode=XYZ123
router.get('/', async (req, res) => {
    const { page = 1, limit = 10, search = "" } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (search) {
        where[Op.or] = [
            { machineCode: { [Op.iLike]: `%${search}%` } },
            { hostname: { [Op.iLike]: `%${search}%` } },
            { compatible: { [Op.iLike]: `%${search}%` } }
        ];
    }

    const { count, rows } = await Report.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
    });

    res.json({
        reports: rows,
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalReports: count
    });
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