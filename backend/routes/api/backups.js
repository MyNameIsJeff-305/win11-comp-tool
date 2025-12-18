const express = require('express');
const router = express.Router();

router.get('/is-first-friday', (req, res) => {
    //Check if today is the first Friday of the month using Moment.js
    const moment = require('moment');
    const today = moment();
    const isFirstFriday = today.date() <= 7 && today.day() === 5;

    res.json({ isFirstFriday });
});

router.get('/filter-companies-with-backup-enabled', async (req, res) => { 
    const {companies} = req.body;
    console.log("Companies is an array: ", Array.isArray(companies));
    //Need to filter companies array ton only include those with backup_service key set to "Yes"
    if (!Array.isArray(companies)) {
        return res.status(400).json({ error: 'Invalid input, expected an array of companies' });
    }

    const filteredCompanies = companies.filter(company => company.custom_fields.backup_service === "Yes");

    res.json({ filteredCompanies });
})

module.exports = router;