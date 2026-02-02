const express = require('express');
const router = express.Router();

router.post('/export-to-freshservice', (req, res) => {
    console.log('Received assessment data:', req.body);
    // Process the assessment data and export to Freshservice
    res.json({ message: 'Assessment data exported to Freshservice successfully' });
});

module.exports = router;