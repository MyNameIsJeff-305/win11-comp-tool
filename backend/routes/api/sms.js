const express = require('express');
const bodyparser = require('body-parser');
const axios = require('axios');
const router = express.Router();

/* ======================================================
   PARSE SMS REPLY
   ====================================================== */
function parseBackupReply(message) {
    console.log("ENTERED PARSE FUNCTION");

    if (!message) return null;

    const normalized = message.trim().toUpperCase();

    // CONNECTED{number}
    const connectedMatch = normalized.match(/^CONNECTED(\d+)$/);
    if (connectedMatch) {
        console.log('Parsed reply: CONNECTED');
        return {
            action: 'CONNECTED',
            hddNumber: connectedMatch[1]
        };
    }

    // REMOVED
    if (normalized === 'REMOVED') {
        console.log('Parsed reply: REMOVED');
        return {
            action: 'REMOVED'
        };
    }

    console.log('Invalid SMS reply:', message);
    return null;
}

/* ======================================================
   FRESHSERVICE AXIOS INSTANCE
   ====================================================== */
const fs = axios.create({
    baseURL: `https://${process.env.FRESHSERVICE_DOMAIN}.freshservice.com/api/v2`,
    auth: {
        username: process.env.FRESHSERVICE_API_KEY,
        password: 'X'
    },
    timeout: 30000
});

/* ======================================================
   DEBUG INTERCEPTORS
   ====================================================== */
fs.interceptors.request.use(config => {
    console.log('\n================ FRESHSERVICE REQUEST ================');
    console.log('METHOD:', (config.method || 'GET').toUpperCase());
    console.log('URL:', config.baseURL + config.url);
    console.log('PARAMS:', config.params || {});
    console.log('DATA:', config.data || null);
    console.log('======================================================\n');
    return config;
});

fs.interceptors.response.use(
    response => {
        console.log('\n================ FRESHSERVICE RESPONSE ================');
        console.log('STATUS:', response.status);
        console.log('URL:', response.config.baseURL + response.config.url);
        console.log('KEYS:', Object.keys(response.data || {}));
        console.log('======================================================\n');
        return response;
    },
    error => {
        console.log('\n================ FRESHSERVICE ERROR ================');
        console.log('MESSAGE:', error.message);
        if (error.response) {
            console.log('STATUS:', error.response.status);
            console.log('DATA:', error.response.data);
        }
        console.log('======================================================\n');
        return Promise.reject(error);
    }
);

/* ======================================================
   FIND BACKUP TICKET
   ====================================================== */
async function findBackupTicket(phone, action) {
    console.log("ENTERED FIND TICKET FUNCTION");

    if (!phone) return null;

    const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    console.log("SEARCHING REQUESTER:", normalizedPhone);

    let requester = null;

    try {
        const res = await fs.get('/requesters', {
            params: {
                query: `"work_phone_number:'${normalizedPhone}'"`
            }
        });
        requester = res.data.requesters?.[0] || null;
    } catch {}

    if (!requester) {
        try {
            const res = await fs.get('/requesters', {
                params: {
                    query: `"mobile_phone_number:'${normalizedPhone}'"`
                }
            });
            requester = res.data.requesters?.[0] || null;
        } catch {}
    }

    if (!requester) {
        console.log('No requester found');
        return null;
    }

    console.log('Requester found:', requester.id);

    const ticketQuery = action === 'CONNECTED'
        ? `"requester_id:${requester.id} AND status:2 AND workspace_id:2"`
        : `"requester_id:${requester.id} AND status:4 AND workspace_id:2"`;
    const ticketRes = await fs.get('/tickets/filter', {
        params: { query: ticketQuery }
    });

    const ticket = ticketRes.data.tickets?.find(t =>
        t.subject?.toLowerCase().includes('backup')
    ) || null;

    console.log('Backup ticket found:', ticket?.id || 'None');

    return ticket;
}

/* ======================================================
   TICKET UPDATES
   ====================================================== */
async function markTicketPending(ticketId, reply, from) {
    console.log('MARKING TICKET PENDING:', ticketId);

    await fs.put(`/tickets/${ticketId}`, { status: 3 });

    await fs.post(`/tickets/${ticketId}/notes`, {
        private: true,
        body: `
📩 Backup SMS Reply Received

From: ${from}
Reply: CONNECTED${reply.hddNumber}

Ticket marked as PENDING automatically.
        `
    });
}

async function markTicketRemoved(ticketId, from) {
    console.log('MARKING TICKET CLOSED:', ticketId);

    await fs.put(`/tickets/${ticketId}`, {
        status: 5,
    });

    await fs.post(`/tickets/${ticketId}/notes`, {
        private: true,
        body: `
📩 Backup SMS Reply Received

From: ${from}
Reply: REMOVED

Ticket CLOSED automatically.
        `
    });
}

/* ======================================================
   PROCESS SMS
   ====================================================== */
async function processBackupReply({ from, body }) {
    const reply = parseBackupReply(body);
    if (!reply) return;

    const ticket = await findBackupTicket(from, reply.action);
    if (!ticket) return;

    if (reply.action === 'CONNECTED') {
        await markTicketPending(ticket.id, reply, from);
    }

    if (reply.action === 'REMOVED') {
        await markTicketRemoved(ticket.id, from);
    }
}

/* ======================================================
   TWILIO WEBHOOK
   ====================================================== */
router.post('/', bodyparser.urlencoded({ extended: false }), async (req, res) => {
    try {
        const from = req.body.From;
        const body = req.body.Body;

        console.log('SMS FROM:', from);
        console.log('SMS BODY:', body);

        await processBackupReply({ from, body });
    } catch (err) {
        console.error('Webhook error:', err.message);
    }

    // Twilio requires 200 OK
    res.status(200).send('<Response></Response>');
});

module.exports = router;
