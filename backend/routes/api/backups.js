const express = require('express');
const axios = require('axios');
const router = express.Router();

const {
    FRESHSERVICE_API_KEY,
    FRESHSERVICE_DOMAIN,
    FRESHSERVICE_PASSWORD
} = process.env;

router.post('/create-backup-tickets', async (req, res) => {
    try {
        let page = 1;
        let allDepartments = [];
        let hasMore = true;

        // 1️⃣ Fetch ALL departments (companies)
        while (hasMore) {
            const response = await axios.get(
                `https://${FRESHSERVICE_DOMAIN}.freshservice.com/api/v2/departments`,
                {
                    params: { page },
                    auth: {
                        username: FRESHSERVICE_API_KEY,
                        password: FRESHSERVICE_PASSWORD
                    }
                }
            );

            const departments = response.data?.departments || [];
            allDepartments.push(...departments);

            hasMore = departments.length > 0;
            page++;
        }

        // 2️⃣ Filter backup-enabled companies
        const backupEnabledCompanies = allDepartments.filter(dept =>
            dept?.custom_fields?.backup_service === 'Yes'
        );

        const createdTickets = [];
        const failedTickets = [];

        // 3️⃣ Create a ticket for EACH company
        for (const company of backupEnabledCompanies) {
            try {
                //Get Prime User Email
                const userResponse = await axios.get(
                    `https://${FRESHSERVICE_DOMAIN}.freshservice.com/api/v2/requesters/${company.prime_user_id}`,
                    {
                        auth: {
                            username: FRESHSERVICE_API_KEY,
                            password: FRESHSERVICE_PASSWORD
                        }
                    }
                )

                const ticketPayload = {
                    subject: `Backup Verification – ${company.name}`,
                    description: `
Automated Backup Verification Ticket

Company: ${company.name}
Backup Service: Enabled

Tasks:
- Verify latest backup completed successfully
- Confirm offsite copy integrity
- Check rotation / retention status
- Notify client if action is required

This ticket was created automatically.
                    `,
                    email:
                        userResponse.data?.requester?.email ||
                        'default@example.com',
                    department_id: company.id,
                    priority: 2,
                    status: 2, // Open
                    source: 2 // Automation / API
                };

                const ticketResponse = await axios.post(
                    `https://${FRESHSERVICE_DOMAIN}.freshservice.com/api/v2/tickets`,
                    ticketPayload,
                    {
                        auth: {
                            username: FRESHSERVICE_API_KEY,
                            password: FRESHSERVICE_PASSWORD
                        }
                    }
                );

                createdTickets.push({
                    company: company.name,
                    ticketId: ticketResponse.data.ticket.id
                });

            } catch (ticketError) {
                failedTickets.push({
                    company: company.name,
                    error: ticketError?.response?.data || ticketError.message
                });
            }
        }

        res.json({
            totalCompaniesChecked: allDepartments.length,
            backupEnabledCompanies: backupEnabledCompanies.length,
            ticketsCreated: createdTickets.length,
            createdTickets,
            failedTickets
        });

    } catch (error) {
        console.error('Automation Error:', error?.response?.data || error.message);

        res.status(500).json({
            error: 'Backup ticket automation failed',
            details: error?.response?.data || error.message
        });
    }
});

module.exports = router;
