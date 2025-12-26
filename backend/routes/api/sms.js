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

    if (!phone) {
        console.log("No phone number provided");
        return null;
    }

    const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    console.log("SEARCHING FOR REQUESTER WITH PHONE:", normalizedPhone);

    let requesterResponse;
    let requester;

    try {
        requesterResponse = await fs.get(
            `/requesters?query=work_phone_number:'${encodeURIComponent(normalizedPhone)}'`
        );
        requester = requesterResponse.data.requesters?.[0];
    } catch (err) {
        console.error("Requester search failed:", err.response?.data);
        return null;
    }

    if (!requester) {
        console.log("Trying mobile phone fallback");
        try {
            requesterResponse = await fs.get(
                `/requesters?query=mobile_phone_number:${normalizedPhone}`
            );
            requester = requesterResponse.data.requesters?.[0];
        } catch (err) {
            console.error("Mobile phone search failed:", err.response?.data);
            return null;
        }
    }

    if (!requester) {
        console.log("No requester found");
        return null;
    }

    console.log("Found requester:", requester.id);

    const ticketResponse = await fs.get(`/tickets/filter?query="requester_id:${requester.id}" AND "status:2" AND "workspace_id:2"`);


    console.log("Ticket search response:", ticketResponse.data);

    const ticket = ticketResponse.data.tickets?.[0] || null;

    console.log("Found backup ticket:", ticket?.id || "None");

    return ticket;
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
        console.error("Webhook error:", err.response?.data || err.message);
        res.status(200).send('<Response></Response>');
    }

});

module.exports = router;