const express = require('express');
const router = express.Router();

router.get('/is-first-friday', (req, res) => {
    //Check if today is the first Friday of the month using Moment.js
    const moment = require('moment');
    const today = moment();
    const isFirstFriday = today.date() <= 7 && today.day() === 5;

    res.json({ isFirstFriday });
});

module.exports = router;