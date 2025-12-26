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
    },
    // optional but helpful
    timeout: 30000
});

/**
 * ✅ DEBUG INTERCEPTORS (prints final URL + params + response summary)
 */
fs.interceptors.request.use(
    (config) => {
        const base = config.baseURL || '';
        const url = config.url || '';
        console.log('\n================ FRESHSERVICE REQUEST ================');
        console.log('METHOD:', (config.method || 'GET').toUpperCase());
        console.log('URL:', base + url);
        console.log('PARAMS:', config.params || {});
        console.log('DATA:', config.data || null);
        console.log('HEADERS:', {
            'Content-Type': config.headers?.['Content-Type'] || config.headers?.['content-type'],
            Accept: config.headers?.Accept || config.headers?.accept
        });
        console.log('======================================================\n');
        return config;
    },
    (error) => {
        console.log('\n================ FRESHSERVICE REQUEST ERROR ================');
        console.log(error?.message);
        console.log('===========================================================\n');
        return Promise.reject(error);
    }
);

fs.interceptors.response.use(
    (response) => {
        console.log('\n================ FRESHSERVICE RESPONSE ================');
        console.log('STATUS:', response.status);
        console.log('URL:', response.config?.baseURL + response.config?.url);
        console.log('PARAMS:', response.config?.params || {});
        // don’t dump giant payloads by default
        if (response.data?.total !== undefined) {
            console.log('TOTAL:', response.data.total);
        }
        console.log('KEYS:', Object.keys(response.data || {}));
        console.log('======================================================\n');
        return response;
    },
    (error) => {
        console.log('\n================ FRESHSERVICE RESPONSE ERROR ================');
        console.log('MESSAGE:', error?.message);
        if (error?.response) {
            console.log('STATUS:', error.response.status);
            console.log('URL:', error.config?.baseURL + error.config?.url);
            console.log('PARAMS:', error.config?.params || {});
            console.log('DATA:', error.response.data);
        } else {
            console.log('NO RESPONSE OBJECT (network / timeout / DNS / TLS issue)');
        }
        console.log('===========================================================\n');
        return Promise.reject(error);
    }
);

async function findBackupTicket(phone) {
    console.log("ENTERED FIND TICKET FUNCTION");

    if (!phone) {
        console.log("No phone number provided");
        return null;
    }

    const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    console.log("SEARCHING FOR REQUESTER WITH PHONE:", normalizedPhone);

    let requester = null;

    // ✅ Requester search (NO encodeURIComponent inside the query!)
    try {
        const requesterResponse = await fs.get('/requesters', {
            params: {
                query: `"work_phone_number:'${normalizedPhone}'"`
            }
        });
        requester = requesterResponse.data.requesters?.[0] || null;
    } catch (err) {
        console.error("Requester search failed:", err.response?.data || err.message);
        return null;
    }

    if (!requester) {
        console.log("Trying mobile phone fallback");
        try {
            const requesterResponse = await fs.get('/requesters', {
                params: {
                    query: `"mobile_phone_number:'${normalizedPhone}'"`
                }
            });
            requester = requesterResponse.data.requesters?.[0] || null;
        } catch (err) {
            console.error("Mobile phone search failed:", err.response?.data || err.message);
            return null;
        }
    }

    if (!requester) {
        console.log("No requester found");
        return null;
    }

    console.log("Found requester:", requester.id);

    // ✅ Ticket filter (Axios params ensures URL encoding for quotes/spaces)
    function ticketFilterQuery({ requesterId, status, workspaceId }) {
        return `"requester_id:${Number(requesterId)} AND status:${Number(status)} AND workspace_id:${Number(workspaceId)}"`;
    }

    console.log("Ticket search response:", ticketResponse.data);

    const ticket = ticketResponse.data.tickets?.[0] || null;
    console.log("Found backup ticket:", ticket?.id || "None");

    return ticket;
}

async function updateBackupTicket(ticketId, reply, from) {
    console.log("ENTERED UPDATE TICKET FUNCTION");
    console.log('Updating ticket ID:', ticketId, 'with reply:', reply, 'from:', from);

    await fs.put(`/tickets/${ticketId}`, { status: 3 }); // Pending

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
        const from = req.body.From;
        const body = req.body.Body?.trim();

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
