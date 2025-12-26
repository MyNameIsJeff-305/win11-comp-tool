const express = require('express');
const bodyparser = require('body-parser');
const axios = require('axios');
const router = express.Router();

router.post('/', bodyparser.urlencoded({ extended: false }), async (req, res) => {
        try {
            const from = req.body.From;        // Client phone
            const body = req.body.Body?.trim(); // SMS text

            console.log('SMS FROM:', from);
            console.log('SMS BODY:', body);

            await processBackupReply({ from, body });

            res.status(200).send('<Response></Response>');
        } catch (err) {
            console.error(err);
            res.status(500).send();
        }
    }
);

module.exports = router;