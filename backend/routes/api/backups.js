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
    // console.log('BODY:', req.body);
    const { departments } = req.body;

    console.log('TYPE OF DEPARTMENTS:', typeof departments);

    // Validation
    if (!Array.isArray(departments)) {
        return res.status(400).json({
            error: 'Invalid input',
            message: 'Expected "departments" to be an array',
            receivedType: typeof departments
        });
    }

    // Filtering logic (safe optional chaining)
    const filteredDepartments = departments.filter(department =>
        department?.custom_fields?.backup_service === 'Yes'
    );

    res.json({
        totalReceived: departments.length,
        totalWithBackupEnabled: filteredDepartments.length,
        filteredDepartments
    });
});

module.exports = router;