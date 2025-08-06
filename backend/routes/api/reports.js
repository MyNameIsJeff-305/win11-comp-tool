const express = require('express');

const { Report } = require('../../db/models');

const router = express.Router();

//Get All Reports
router.get('/', async (req, res) => {
    try {
        const reports = await Report.findAll();
        return res.json(reports);
    } catch (error) {
        console.error("Error fetching reports:", error);
        return res.status(500).json({ error: "Internal server error" });
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