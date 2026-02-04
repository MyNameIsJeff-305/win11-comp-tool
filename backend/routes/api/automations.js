const express = require('express');
const router = express.Router();
const axios = require('axios');

const {
    FRESHSERVICE_API_KEY,
    FRESHSERVICE_DOMAIN,
    FRESHSERVICE_PASSWORD
} = process.env;

if (!FRESHSERVICE_API_KEY || !FRESHSERVICE_DOMAIN) {
    throw new Error("FRESHSERVICE_API_KEY or FRESHSERVICE_DOMAIN is not set in environment variables.");
}

const fs = axios.create({
    baseURL: `https://${FRESHSERVICE_DOMAIN}.freshservice.com/api/v2`,
    auth: {
        username: FRESHSERVICE_API_KEY,
        password: 'X'
    },
    headers: {
        'Content-Type': 'application/json'
    }
});

async function getTicket(ticketId) {
    const { data } = await fs.get(`/tickets/${ticketId}`);
    return data.ticket;
}

async function getCompany(companyId) {
    console.log("Fetching company with ID:", companyId);
    const { data } = await fs.get(`/departments/${companyId}`);
    return data.department;
}

function updateTicket(ticketId, updatePayload) {
    return fs.put(`/tickets/${ticketId}`, updatePayload);
}

//Search for the value of User SA on companies to filter views in Freshservice
router.post('/ticket-filtering-sa', async (req, res) => {
    try {
        const { ticketId } = req.body;

        console.log("Body received:", ticketId);

        const ticket = await getTicket(ticketId);
        console.log("Ticket Department ID:", ticket.department_id);
        
        const company = await getCompany(ticket.department_id);
        console.log("Company Custom Fields:", company.custom_fields);

        const userSAValue = company.custom_fields?.service_agreement_sa;

        if(userSAValue === 'Under SA') {
            updateTicket(ticketId, {
                ticket: {
                    custom_fields: {
                        under_sa: true
                    }
                }
            });
        } else {
            updateTicket(ticketId, {
                ticket: {
                    custom_fields: {
                        under_sa: false
                    }
                }
            });
        }
    } catch (error) {
        console.error("Error in /ticket-filtering-sa");
        return res.status(500).json({ error: 'Internal server error' });
    }

    res.json({ message: 'Ticket filtering by SA completed successfully' });
});

module.exports = router;