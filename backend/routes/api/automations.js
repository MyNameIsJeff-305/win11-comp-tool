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
    },
    // optional but recommended to avoid hanging forever
    timeout: 30000
});

// --------- Helpers: sleep + retry/backoff for 429 ---------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function axiosWithRetry(fn, { maxRetries = 10 } = {}) {
    let attempt = 0;

    // Optional: retry a few transient network/server errors too
    const transientCodes = new Set(['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN']);

    while (true) {
        try {
            return await fn();
        } catch (err) {
            const status = err?.response?.status;
            const code = err?.code;

            const shouldRetry =
                status === 429 ||
                transientCodes.has(code) ||
                (status >= 500 && status <= 599);

            if (!shouldRetry) throw err;

            attempt += 1;
            if (attempt > maxRetries) throw err;

            const retryAfterHeader = err?.response?.headers?.['retry-after'];
            const retryAfterSec = Number(retryAfterHeader);

            let waitMs;
            if (status === 429 && Number.isFinite(retryAfterSec) && retryAfterSec > 0) {
                waitMs = retryAfterSec * 1000;
            } else {
                // exponential backoff with jitter (caps at 60s)
                const base = Math.min(60000, 1000 * 2 ** (attempt - 1));
                const jitter = Math.floor(Math.random() * 500);
                waitMs = base + jitter;
            }

            console.warn(
                `Freshservice rate-limited/transient error (status=${status || 'n/a'} code=${code || 'n/a'}). ` +
                `Waiting ${Math.ceil(waitMs / 1000)}s then retrying (attempt ${attempt}/${maxRetries})...`
            );

            await sleep(waitMs);
        }
    }
}

// --------- Freshservice calls (now rate-limit safe) ---------
async function getTicket(ticketId) {
    const { data } = await axiosWithRetry(() => fs.get(`/tickets/${ticketId}`));
    return data.ticket;
}

// Cache departments (your "company" is actually /departments/:id in this code)
const departmentCache = new Map();

async function getCompany(companyId) {
    console.log("Fetching company with ID:", companyId);

    if (!companyId) return null;

    if (departmentCache.has(companyId)) {
        return departmentCache.get(companyId);
    }

    const { data } = await axiosWithRetry(() => fs.get(`/departments/${companyId}`));
    const dept = data.department;

    departmentCache.set(companyId, dept);
    return dept;
}

function updateTicket(ticketId, updatePayload) {
    return axiosWithRetry(() => fs.put(`/tickets/${ticketId}`, updatePayload));
}

// --------- Endpoints ---------

// Search for the value of User SA on companies to filter views in Freshservice
router.post('/ticket-filtering-sa', async (req, res) => {
    try {
        const { ticketId } = req.body;

        console.log("Body received:", ticketId);

        const ticket = await getTicket(ticketId);
        console.log("Ticket Department ID:", ticket.department_id);

        const company = await getCompany(ticket.department_id);
        console.log("Company Custom Fields:", company?.custom_fields);

        const userSAValue = company?.custom_fields?.service_agreement_sa;
        const shouldBeUnderSa = userSAValue === 'Under SA';

        // Skip update if already correct (reduces API calls)
        const currentUnderSa = ticket.custom_fields?.under_sa === true;
        if (currentUnderSa !== shouldBeUnderSa) {
            await updateTicket(ticketId, {
                ticket: {
                    custom_fields: {
                        under_sa: shouldBeUnderSa
                    }
                }
            });
        }
    } catch (error) {
        console.error("Error in /ticket-filtering-sa", error);
        return res.status(500).json({ error: 'Internal server error' });
    }

    res.json({ message: 'Ticket filtering by SA completed successfully' });
});

async function getAllTicketIds() {
    const ids = [];
    let page = 1;
    const perPage = 100;

    while (true) {
        const resp = await axiosWithRetry(() =>
            fs.get("/tickets", {
                params: {
                    page,
                    per_page: perPage,
                    // If you only want certain tickets, add filters here (updated_since, query, etc.)
                }
            })
        );

        const tickets = resp.data?.tickets ?? resp.data ?? [];
        if (!tickets.length) break;

        for (const t of tickets) {
            if (t?.id) ids.push(t.id);
        }

        if (tickets.length < perPage) break;

        page += 1;

        // gentle pacing between pages
        await sleep(150);
    }

    return ids;
}

// UPDATED endpoint: pagination + caching + skip-unneeded-updates + 429 handling + throttle
router.post('/check-for-all-the-tickets-and-update-sa', async (req, res) => {
    console.log("Starting to check all tickets for SA update...");

    try {
        const ticketIds = await getAllTicketIds();

        console.log("Total tickets to process:", ticketIds.length);

        let updated = 0;
        let skipped = 0;
        let failed = 0;

        // Adjust if needed; lower = faster but more 429 risk
        const perTicketDelayMs = 200;

        for (const ticketId of ticketIds) {
            try {
                console.log("Processing ticket ID:", ticketId);
                const ticket = await getTicket(ticketId);

                if (!ticket.department_id) {
                    console.log(`Ticket ID ${ticketId} has no department_id, skipping...`);
                    skipped += 1;
                    continue;
                }

                const company = await getCompany(ticket.department_id);

                if (!company) {
                    console.log(`No company found for ticket ID ${ticketId}, skipping...`);
                    skipped += 1;
                    continue;
                }

                const userSAValue = company.custom_fields?.service_agreement_sa;
                const shouldBeUnderSa = userSAValue === 'Under SA';

                // Skip update if already correct (cuts PUT volume a lot)
                const currentUnderSa = ticket.custom_fields?.under_sa === true;
                if (currentUnderSa === shouldBeUnderSa) {
                    console.log(`Ticket ID ${ticketId} already correct (under_sa=${currentUnderSa}), skipping update.`);
                    skipped += 1;
                } else {
                    await updateTicket(ticketId, {
                        ticket: {
                            custom_fields: {
                                under_sa: shouldBeUnderSa
                            }
                        }
                    });

                    console.log(`Ticket ID ${ticketId} updated to under_sa: ${shouldBeUnderSa}`);
                    updated += 1;
                }

                // Gentle throttle to reduce likelihood of 429
                if (perTicketDelayMs > 0) await sleep(perTicketDelayMs);

            } catch (err) {
                failed += 1;
                const status = err?.response?.status;
                const retryAfter = err?.response?.headers?.['retry-after'];
                console.error(
                    `Error processing ticket ${ticketId} (status=${status || 'n/a'} retry-after=${retryAfter || 'n/a'}):`,
                    err?.message || err
                );
                // Continue processing remaining tickets
            }
        }

        console.log("Completed checking all tickets for SA update.");
        return res.json({
            message: 'All tickets processed for SA update successfully',
            totals: {
                total: ticketIds.length,
                updated,
                skipped,
                failed
            }
        });
    } catch (error) {
        console.error("Error in /check-for-all-the-tickets-and-update-sa:", error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
