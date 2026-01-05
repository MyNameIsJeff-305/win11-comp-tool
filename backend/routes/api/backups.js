const express = require('express');
const axios = require('axios');
const router = express.Router();

const { HDDCon } = require('../../db/models');

//Get This month using moment.js
const moment = require('moment-timezone');
const thisMonth = moment().tz('America/New_York').format('MMMM YYYY');

const {
    FRESHSERVICE_API_KEY,
    FRESHSERVICE_DOMAIN,
    FRESHSERVICE_PASSWORD
} = process.env;

// Endpoint to check if today is Monday before the first Friday of the month. If so, return true, otherwise false
router.get('/is-monday-before-first-friday', (req, res) => {
    const tz = req.query.tz || 'America/New_York';

    const today = moment().tz(tz).startOf('day');

    // Must be Monday
    if (today.day() !== 1) {
        return res.json({ isMondayBeforeFirstFriday: false, today: today.format('YYYY-MM-DD'), tz });
    }

    // Friday of the same week (Monday + 4 days)
    const fridayThisWeek = today.clone().add(4, 'days');

    // It's the "first Friday of the month" if it's a Friday and its date is 1..7
    const isMondayBeforeFirstFriday =
        fridayThisWeek.day() === 5 && fridayThisWeek.date() <= 7;

    return res.json({
        isMondayBeforeFirstFriday,
        today: today.format('YYYY-MM-DD'),
        firstFridayCandidate: fridayThisWeek.format('YYYY-MM-DD'),
        tz
    });
});

router.post('/create-backup-tickets', async (req, res) => {
    const currentDisk = await HDDCon.findOne({
        where: { date: thisMonth }
    })

    //Create a variable for the next Friday taking today as reference
    const nextFriday = moment().day(5 + (moment().day() <= 5 ? 0 : 7));


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
                // console.log(`Fetching prime user ${company.prime_user_id} for company ${company.name}`);
                const userResponse = await axios.get(
                    `https://${FRESHSERVICE_DOMAIN}.freshservice.com/api/v2/requesters/${company.prime_user_id}`,
                    {
                        auth: {
                            username: FRESHSERVICE_API_KEY,
                            password: FRESHSERVICE_PASSWORD
                        }
                    }
                );

                //Verify with console.log the Requester Primary Email
                // console.log(`Prime user email: ${userResponse.data.requester?.primary_email}`);

                const ticketPayload = {
                    subject: `Backup Verification - ${thisMonth} – ${company.name}`,
                    description: `
Automated Backup Verification Ticket

Company: ${company.name}
Backup Service: Enabled

This Month's HDD is

Tasks:
- Verify latest backup completed successfully
- Confirm offsite copy integrity
- Check rotation / retention status
- Notify client if action is required

This ticket was created automatically.
                    `,
                    email:
                        userResponse.data.requester?.primary_email ||
                        'default@example.com',
                    department_id: company.id,
                    priority: 2,
                    status: 2, // Open
                    source: 10, // Slack
                    fr_due_by: nextFriday,
                    due_by: nextFriday,
                    custom_fields: {
                        hdd_number: currentDisk?.HDDNumber || 0,
                        backup_date: nextFriday
                    }
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

router.get('/test-backup-ticket', async (req, res) => {
    console.log(moment().format('MMMM YYYY'));

    const getHDDData = await HDDCon.findAll({
        where: { date: thisMonth }
    });

    console.log('HDD Data for this month:', getHDDData);

    res.json(getHDDData);
});

module.exports = router;
