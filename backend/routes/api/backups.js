const express = require('express');
const router = express.Router();

router.get('/is-first-friday', (req, res) => {
    //Check if today is the first Friday of the month using Moment.js
    const moment = require('moment');
    const today = moment();
    const isFirstFriday = today.date() <= 7 && today.day() === 5;

    res.json({ isFirstFriday });
});

router.post('/filter-companies-with-backup-enabled', (req, res) => {
    console.log('[filter-companies-with-backup-enabled]');
    console.log('Raw body:', req.body);

    let parsedBody;

    try {
        parsedBody = typeof req.body.response?.body === 'string'
            ? JSON.parse(req.body.response.body)
            : req.body.response?.body;
    } catch (err) {
        return res.status(400).json({
            error: 'Invalid JSON',
            message: 'Failed to parse Freshservice response body'
        });
    }

    const departments = parsedBody?.departments;

    if (!Array.isArray(departments)) {
        return res.status(400).json({
            error: 'Invalid input',
            message: 'Expected departments array',
            received: typeof departments
        });
    }

    const filteredDepartments = departments.filter(dep =>
        dep?.custom_fields?.backup_service === 'Yes'
    );

    res.json({
        totalReceived: departments.length,
        totalWithBackupEnabled: filteredDepartments.length,
        filteredDepartments
    });
});

module.exports = router;