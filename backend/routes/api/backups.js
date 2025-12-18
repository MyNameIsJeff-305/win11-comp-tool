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
    const { companies } = req.body;

    // Defensive logging (useful in prod)
    console.log('[filter-companies-with-backup-enabled]');
    console.log('Body received:', typeof companies, Array.isArray(companies));

    // Validation
    if (!Array.isArray(companies)) {
        return res.status(400).json({
            error: 'Invalid input',
            message: 'Expected "companies" to be an array',
            receivedType: typeof companies
        });
    }

    // Filtering logic (safe optional chaining)
    const filteredCompanies = companies.filter(company =>
        company?.custom_fields?.backup_service === 'Yes'
    );

    res.json({
        totalReceived: companies.length,
        totalWithBackupEnabled: filteredCompanies.length,
        filteredCompanies
    });
});

module.exports = router;