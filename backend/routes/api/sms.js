const express = require('express');
const bodyparser = require('body-parser');
const axios = require('axios');
const router = express.Router();

function parseBackupReply(message) {
    const match = message.match(/^CONNECTED(\d+)$/i);
    console.log("ENTERED PARSE FUNCTION");
    console.log('Parsed backup reply:', match);
    if (!match) return null;

    return {
        status: 'CONNECTED',
        hddNumber: match[1]
    };
}

const fs = axios.create({
    baseURL: `https://${process.env.FRESHSERVICE_DOMAIN}.freshservice.com/api/v2`,
    auth: {
        username: process.env.FRESHSERVICE_API_KEY,
        password: "X"
    }
});

async function findBackupTicket(phone) {
    console.log("ENTERED FIND TICKET FUNCTION");

    console.log("SEARCHING FOR THE REQUESTER")
    //Search for a requester with the phone number
    const fsRequesterResponse = await fs.get(`/requesters?query=work_phone_number:${phone}`)
    console.log("REQUESTER SEARCH RESPONSE:", fsRequesterResponse.data);
    const requester = fsRequesterResponse.data.requesters?.[0];

    if (!requester) {
        console.log('No requester found with phone:', phone);
        return null;
    }
    console.log('Found requester:', requester);

    const query = `phone:'${phone}' AND status:Open AND subject:'Backup'`;

    
    const { data } = await axios.get()
    
    console.log('Searching for ticket with query:', query, 'Found ticket:', data.tickets?.[0]);
    return data.tickets?.[0] || null;
}

async function updateBackupTicket(ticketId, reply, from) {
    console.log("ENTERED UPDATE TICKET FUNCTION");
    console.log('Updating ticket ID:', ticketId, 'with reply:', reply, 'from:', from);
    // 1️⃣ Update status → Pending
    await fs.put(`/tickets/${ticketId}`, {
        status: 3 // Pending
    });

    // 2️⃣ Add private note
    await fs.post(`/tickets/${ticketId}/notes`, {
        body: `
📩 Backup SMS Reply Received

From: ${from}
Reply: ${reply.status}${reply.hddNumber}

Marked as PENDING automatically.
    `,
        private: true
    });
}

async function processBackupReply({ from, body }) {
    const reply = parseBackupReply(body);
    if (!reply) return;

    const ticket = await findBackupTicket(from);
    if (!ticket) return;

    await updateBackupTicket(ticket.id, reply, from);
}

router.post('/', bodyparser.urlencoded({ extended: false }), async (req, res) => {
    try {
        const from = req.body.From;        // Client phone
        const body = req.body.Body?.trim(); // SMS text

        console.log('SMS FROM:', from);
        console.log('SMS BODY:', body);

        await processBackupReply({ from, body });

        res.status(200).send('<Response></Response>');
    } catch (err) {
        // console.error(err);
        res.status(500).send();
    }
}
);

module.exports = router;