const express = require('express');
const router = express.Router();

router.get('/is-first-friday', (req, res) => {
    //Check if the entered date is the first Friday of the month using Moment.js
    const moment = require('moment');
    const date = req.body.date; // Expecting date in 'YYYY-MM-DD' format
    const mDate = moment(date, 'YYYY-MM-DD');

    if (!mDate.isValid()) {
        return res.status(400).json({ error: 'Invalid date format. Please use YYYY-MM-DD.' });
    }

    const isFirstFriday = mDate.date() <= 7 && mDate.day() === 5;

    res.json({ isFirstFriday });
});

module.exports = router;