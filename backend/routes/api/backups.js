const express = require('express');
const axios = require('axios');
const { Op } = require('sequelize');

const router = express.Router();

const { HDDCon, BackupTicketLedger } = require('../../db/models');

const DEFAULT_TIMEZONE = process.env.BACKUP_TIMEZONE || 'America/New_York';
const BATCH_DEPARTMENT_ID = '__batch__';
const FRESHSERVICE_PAGE_SIZE = 100;
const CLAIM_STALE_AFTER_MINUTES = 30;
const REQUEST_DELAY_MS = 250;

const activePeriods = new Set();

class HttpError extends Error {
    constructor(status, message, details = null) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
        this.details = details;
    }
}

const sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds));

function serializeError(error) {
    const responseData = error?.response?.data;
    const details = responseData || error?.details || error?.message || String(error);

    if (typeof details === 'string') {
        return details.slice(0, 4000);
    }

    try {
        return JSON.stringify(details).slice(0, 4000);
    } catch (_serializationError) {
        return 'Unable to serialize the error details.';
    }
}

function getZonedDateParts(date, timeZone) {
    let formatter;

    try {
        formatter = new Intl.DateTimeFormat('en-US', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    } catch (error) {
        throw new HttpError(400, `Invalid timezone: ${timeZone}`, error.message);
    }

    const values = {};

    for (const part of formatter.formatToParts(date)) {
        if (part.type !== 'literal') {
            values[part.type] = part.value;
        }
    }

    return {
        year: Number(values.year),
        month: Number(values.month),
        day: Number(values.day)
    };
}

function datePartsToUtcDate({ year, month, day }) {
    return new Date(Date.UTC(year, month - 1, day));
}

function addUtcDays(date, amount) {
    const result = new Date(date.getTime());
    result.setUTCDate(result.getUTCDate() + amount);
    return result;
}

function formatUtcDate(date) {
    return date.toISOString().slice(0, 10);
}

function formatMonthLabel(date) {
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        month: 'long',
        year: 'numeric'
    }).format(date);
}

function getFirstFriday(year, month) {
    const firstDay = new Date(Date.UTC(year, month - 1, 1));
    const daysUntilFriday = (5 - firstDay.getUTCDay() + 7) % 7;
    return addUtcDays(firstDay, daysUntilFriday);
}

function getFollowingMonth(year, month) {
    if (month === 12) {
        return { year: year + 1, month: 1 };
    }

    return { year, month: month + 1 };
}

function resolveCurrentDate() {
    if (
        process.env.ALLOW_BACKUP_TEST_CLOCK === 'true' &&
        process.env.BACKUP_TEST_NOW
    ) {
        const testDate = new Date(process.env.BACKUP_TEST_NOW);

        if (Number.isNaN(testDate.getTime())) {
            throw new HttpError(
                500,
                'BACKUP_TEST_NOW is not a valid ISO date-time.'
            );
        }

        return testDate;
    }

    return new Date();
}

function buildScheduleContext({ now = resolveCurrentDate(), timeZone = DEFAULT_TIMEZONE } = {}) {
    const zonedParts = getZonedDateParts(now, timeZone);
    const today = datePartsToUtcDate(zonedParts);

    const fridayThisWeek = addUtcDays(today, 4);
    const isMonday = today.getUTCDay() === 1;
    const isMondayBeforeFirstFriday =
        isMonday &&
        fridayThisWeek.getUTCDay() === 5 &&
        fridayThisWeek.getUTCDate() <= 7;

    let targetFriday;

    if (isMondayBeforeFirstFriday) {
        targetFriday = fridayThisWeek;
    } else {
        const firstFridayThisMonth = getFirstFriday(
            today.getUTCFullYear(),
            today.getUTCMonth() + 1
        );
        const triggerMondayThisMonth = addUtcDays(firstFridayThisMonth, -4);

        if (today.getTime() <= triggerMondayThisMonth.getTime()) {
            targetFriday = firstFridayThisMonth;
        } else {
            const followingMonth = getFollowingMonth(
                today.getUTCFullYear(),
                today.getUTCMonth() + 1
            );

            targetFriday = getFirstFriday(
                followingMonth.year,
                followingMonth.month
            );
        }
    }

    const triggerMonday = addUtcDays(targetFriday, -4);
    const targetFridayDate = formatUtcDate(targetFriday);
    const periodKey = targetFridayDate.slice(0, 7);

    return {
        timeZone,
        today: formatUtcDate(today),
        isMondayBeforeFirstFriday,
        triggerMonday: formatUtcDate(triggerMonday),
        targetFriday: targetFridayDate,
        targetMonth: formatMonthLabel(targetFriday),
        periodKey,
        dueAt: `${targetFridayDate}T23:59:59.000Z`,
        recentTicketSearchStart: formatUtcDate(addUtcDays(triggerMonday, -1))
    };
}

function createFreshserviceClient() {
    const {
        FRESHSERVICE_API_KEY,
        FRESHSERVICE_DOMAIN,
        FRESHSERVICE_PASSWORD,
        FRESHSERVICE_BASE_URL
    } = process.env;

    if (!FRESHSERVICE_API_KEY) {
        throw new HttpError(503, 'FRESHSERVICE_API_KEY is missing.');
    }

    const baseURL = FRESHSERVICE_BASE_URL
        ? FRESHSERVICE_BASE_URL.replace(/\/$/, '')
        : FRESHSERVICE_DOMAIN
            ? `https://${FRESHSERVICE_DOMAIN}.freshservice.com/api/v2`
            : null;

    if (!baseURL) {
        throw new HttpError(
            503,
            'Set FRESHSERVICE_DOMAIN or FRESHSERVICE_BASE_URL.'
        );
    }

    return axios.create({
        baseURL,
        auth: {
            username: FRESHSERVICE_API_KEY,
            password: FRESHSERVICE_PASSWORD || 'X'
        },
        headers: {
            'Content-Type': 'application/json'
        },
        timeout: 30000
    });
}

async function requestWithRetry(operation, { maxRetries = 6 } = {}) {
    const transientCodes = new Set([
        'ECONNRESET',
        'ETIMEDOUT',
        'EAI_AGAIN',
        'ECONNABORTED'
    ]);

    let attempt = 0;

    while (true) {
        try {
            return await operation();
        } catch (error) {
            const status = error?.response?.status;
            const code = error?.code;
            const shouldRetry =
                status === 429 ||
                transientCodes.has(code) ||
                (status >= 500 && status <= 599);

            if (!shouldRetry || attempt >= maxRetries) {
                throw error;
            }

            attempt += 1;

            const retryAfterSeconds = Number(
                error?.response?.headers?.['retry-after']
            );

            const waitMilliseconds =
                status === 429 &&
                Number.isFinite(retryAfterSeconds) &&
                retryAfterSeconds > 0
                    ? retryAfterSeconds * 1000
                    : Math.min(60000, 1000 * 2 ** (attempt - 1)) +
                      Math.floor(Math.random() * 500);

            console.warn(
                `Freshservice request failed temporarily ` +
                    `(status=${status || 'n/a'}, code=${code || 'n/a'}). ` +
                    `Retrying in ${Math.ceil(waitMilliseconds / 1000)} seconds ` +
                    `(attempt ${attempt}/${maxRetries}).`
            );

            await sleep(waitMilliseconds);
        }
    }
}

async function getAllDepartments(freshserviceClient) {
    const departmentsById = new Map();
    let page = 1;

    while (true) {
        const response = await requestWithRetry(() =>
            freshserviceClient.get('/departments', {
                params: {
                    page,
                    per_page: FRESHSERVICE_PAGE_SIZE
                }
            })
        );

        const departments = response.data?.departments || [];

        for (const department of departments) {
            if (department?.id != null) {
                departmentsById.set(String(department.id), department);
            }
        }

        if (departments.length === 0) {
            break;
        }

        page += 1;
    }

    return Array.from(departmentsById.values());
}

async function getRecentBackupTickets(freshserviceClient, createdAfterDate) {
    const tickets = [];
    let page = 1;

    while (true) {
        const response = await requestWithRetry(() =>
            freshserviceClient.get('/tickets/filter', {
                params: {
                    query: `"created_at:>'${createdAfterDate}'"`,
                    page,
                    per_page: FRESHSERVICE_PAGE_SIZE
                }
            })
        );

        const pageTickets = response.data?.tickets || [];
        const total = Number(response.data?.total);

        tickets.push(...pageTickets);

        if (pageTickets.length === 0) {
            break;
        }

        if (Number.isFinite(total) && tickets.length >= total) {
            break;
        }

        page += 1;
    }

    return tickets.filter((ticket) =>
        String(ticket?.subject || '').startsWith('Backup Verification - ')
    );
}

function indexBackupTicketsByDepartment(tickets) {
    const ticketsByDepartment = new Map();

    for (const ticket of tickets) {
        if (ticket?.department_id == null) {
            continue;
        }

        const departmentId = String(ticket.department_id);
        const currentTickets = ticketsByDepartment.get(departmentId) || [];
        currentTickets.push(ticket);
        ticketsByDepartment.set(departmentId, currentTickets);
    }

    return ticketsByDepartment;
}

async function getRequesterEmail(freshserviceClient, company) {
    if (!company?.prime_user_id) {
        throw new Error(
            `Company ${company?.name || company?.id} does not have a prime_user_id.`
        );
    }

    const response = await requestWithRetry(() =>
        freshserviceClient.get(`/requesters/${company.prime_user_id}`)
    );

    const requesterEmail = response.data?.requester?.primary_email;

    if (!requesterEmail) {
        throw new Error(
            `Prime requester ${company.prime_user_id} does not have a primary email.`
        );
    }

    return requesterEmail;
}

async function findOrCreateLedgerRecord({
    periodKey,
    departmentId,
    companyName
}) {
    try {
        return await BackupTicketLedger.findOrCreate({
            where: {
                periodKey,
                departmentId
            },
            defaults: {
                companyName,
                status: 'pending',
                ticketId: null,
                lastError: null
            }
        });
    } catch (error) {
        if (error?.name !== 'SequelizeUniqueConstraintError') {
            throw error;
        }

        const existingRecord = await BackupTicketLedger.findOne({
            where: {
                periodKey,
                departmentId
            }
        });

        if (!existingRecord) {
            throw error;
        }

        return [existingRecord, false];
    }
}

async function claimLedgerRecord({
    periodKey,
    departmentId,
    companyName,
    retryFailed = false,
    forceCompleted = false
}) {
    const [record, created] = await findOrCreateLedgerRecord({
        periodKey,
        departmentId,
        companyName
    });

    if (created) {
        return {
            claimed: true,
            record,
            reason: 'new_claim'
        };
    }

    const staleBefore = new Date(
        Date.now() - CLAIM_STALE_AFTER_MINUTES * 60 * 1000
    );

    if (record.status === 'created' && !forceCompleted) {
        return {
            claimed: false,
            record,
            reason: 'already_completed'
        };
    }

    if (
        record.status === 'pending' &&
        record.updatedAt &&
        record.updatedAt.getTime() >= staleBefore.getTime()
    ) {
        return {
            claimed: false,
            record,
            reason: 'already_processing'
        };
    }

    if (record.status === 'failed' && !retryFailed) {
        return {
            claimed: false,
            record,
            reason: 'failed_requires_retry'
        };
    }

    const claimWhere = {
        id: record.id
    };

    if (record.status === 'pending') {
        claimWhere.status = 'pending';
        claimWhere.updatedAt = {
            [Op.lt]: staleBefore
        };
    } else {
        claimWhere.status = record.status;
    }

    const [updatedRows] = await BackupTicketLedger.update(
        {
            companyName,
            status: 'pending',
            ticketId: null,
            lastError: null
        },
        {
            where: claimWhere
        }
    );

    if (updatedRows !== 1) {
        return {
            claimed: false,
            record,
            reason: 'claim_lost_to_another_request'
        };
    }

    const claimedRecord = await BackupTicketLedger.findByPk(record.id);

    return {
        claimed: true,
        record: claimedRecord,
        reason:
            record.status === 'created'
                ? 'forced_completed_batch_retry'
                : record.status === 'failed'
                    ? 'failed_record_retry'
                    : 'stale_claim_recovered'
    };
}

async function markLedgerCreated(record, ticketId = null, note = null) {
    await record.update({
        status: 'created',
        ticketId: ticketId == null ? null : String(ticketId),
        lastError: note
    });
}

async function markLedgerFailed(record, error) {
    await record.update({
        status: 'failed',
        lastError: serializeError(error)
    });
}

function buildTicketPayload({
    company,
    requesterEmail,
    schedule,
    hddNumber,
    idempotencyTag
}) {
    return {
        subject: `Backup Verification - ${schedule.targetMonth} - ${company.name}`,
        description: [
            'Automated Backup Verification Ticket',
            '',
            `Company: ${company.name}`,
            'Backup Service: Enabled',
            `Target Period: ${schedule.targetMonth}`,
            `HDD Number: ${hddNumber}`,
            `Backup Verification Date: ${schedule.targetFriday}`,
            '',
            'Tasks:',
            '- Verify the latest backup completed successfully',
            '- Confirm offsite copy integrity',
            '- Check rotation and retention status',
            '- Notify the client if action is required',
            '',
            'This ticket was created automatically.'
        ].join('\n'),
        email: requesterEmail,
        department_id: company.id,
        priority: 2,
        status: 2,
        source: 10,
        fr_due_by: schedule.dueAt,
        due_by: schedule.dueAt,
        tags: ['smart-backup-automation', idempotencyTag],
        custom_fields: {
            hdd_number: hddNumber,
            backup_date: schedule.targetFriday
        }
    };
}

router.get('/is-monday-before-first-friday', (req, res) => {
    try {
        const timeZone = req.query.tz || DEFAULT_TIMEZONE;
        const schedule = buildScheduleContext({ timeZone });

        return res.json({
            isMondayBeforeFirstFriday:
                schedule.isMondayBeforeFirstFriday,
            today: schedule.today,
            triggerMonday: schedule.triggerMonday,
            firstFriday: schedule.targetFriday,
            targetMonth: schedule.targetMonth,
            periodKey: schedule.periodKey,
            tz: schedule.timeZone
        });
    } catch (error) {
        return res.status(error.status || 500).json({
            error: error.message,
            details: error.details || null
        });
    }
});

router.post(
    '/create-backup-tickets',
    async (req, res) => {
        let schedule;
        let batchRecord = null;

        try {
            schedule = buildScheduleContext({
                timeZone: DEFAULT_TIMEZONE
            });
        } catch (error) {
            return res.status(error.status || 500).json({
                error: error.message,
                details: error.details || null
            });
        }

        if (!schedule.isMondayBeforeFirstFriday) {
            return res.status(409).json({
                error: 'Backup tickets can only be created on the Monday before the first Friday.',
                today: schedule.today,
                nextTriggerMonday: schedule.triggerMonday,
                targetMonth: schedule.targetMonth,
                timeZone: schedule.timeZone
            });
        }

        const retryFailed = req.body?.retryFailed === true;

        if (activePeriods.has(schedule.periodKey)) {
            return res.status(202).json({
                status: 'already_running',
                periodKey: schedule.periodKey,
                targetMonth: schedule.targetMonth
            });
        }

        activePeriods.add(schedule.periodKey);

        try {
            const batchClaim = await claimLedgerRecord({
                periodKey: schedule.periodKey,
                departmentId: BATCH_DEPARTMENT_ID,
                companyName: `Backup batch - ${schedule.targetMonth}`,
                retryFailed,
                forceCompleted: retryFailed
            });

            batchRecord = batchClaim.record;

            if (!batchClaim.claimed) {
                const statusCode =
                    batchClaim.reason === 'already_processing' ? 202 : 200;

                return res.status(statusCode).json({
                    status: batchClaim.reason,
                    periodKey: schedule.periodKey,
                    targetMonth: schedule.targetMonth,
                    previousSummary: batchRecord?.lastError || null,
                    message:
                        batchClaim.reason === 'failed_requires_retry'
                            ? 'Send { "retryFailed": true } to retry the failed batch safely.'
                            : 'No new backup ticket batch was started.'
                });
            }

            const currentDisk = await HDDCon.findOne({
                where: {
                    date: schedule.targetMonth
                }
            });

            if (
                !currentDisk ||
                currentDisk.HDDNumber == null ||
                !Number.isFinite(Number(currentDisk.HDDNumber))
            ) {
                throw new HttpError(
                    422,
                    `No valid HDD number was found for ${schedule.targetMonth}.`,
                    {
                        expectedDatabaseDate: schedule.targetMonth
                    }
                );
            }

            const hddNumber = Number(currentDisk.HDDNumber);
            const freshserviceClient = createFreshserviceClient();

            const allDepartments = await getAllDepartments(
                freshserviceClient
            );

            const backupEnabledCompanies = allDepartments.filter(
                (department) =>
                    department?.custom_fields?.backup_service === 'Yes'
            );

            const recentBackupTickets = await getRecentBackupTickets(
                freshserviceClient,
                schedule.recentTicketSearchStart
            );

            const recentTicketsByDepartment =
                indexBackupTicketsByDepartment(recentBackupTickets);

            const createdTickets = [];
            const skippedTickets = [];
            const failedTickets = [];

            for (const company of backupEnabledCompanies) {
                const departmentId = String(company.id);
                const idempotencyTag =
                    `smart-backup-${schedule.periodKey}-${departmentId}`;

                const companyClaim = await claimLedgerRecord({
                    periodKey: schedule.periodKey,
                    departmentId,
                    companyName: company.name,
                    retryFailed,
                    forceCompleted: false
                });

                if (!companyClaim.claimed) {
                    skippedTickets.push({
                        company: company.name,
                        departmentId,
                        reason: companyClaim.reason,
                        ticketId: companyClaim.record?.ticketId || null
                    });
                    continue;
                }

                const existingTickets =
                    recentTicketsByDepartment.get(departmentId) || [];

                const existingTicket =
                    existingTickets.find((ticket) =>
                        Array.isArray(ticket.tags)
                            ? ticket.tags.includes(idempotencyTag)
                            : false
                    ) || existingTickets[0];

                if (existingTicket) {
                    await markLedgerCreated(
                        companyClaim.record,
                        existingTicket.id,
                        'Existing Freshservice backup ticket detected during idempotency check.'
                    );

                    skippedTickets.push({
                        company: company.name,
                        departmentId,
                        reason: 'existing_freshservice_ticket',
                        ticketId: existingTicket.id
                    });
                    continue;
                }

                try {
                    const requesterEmail = await getRequesterEmail(
                        freshserviceClient,
                        company
                    );

                    const ticketPayload = buildTicketPayload({
                        company,
                        requesterEmail,
                        schedule,
                        hddNumber,
                        idempotencyTag
                    });

                    const ticketResponse = await requestWithRetry(() =>
                        freshserviceClient.post('/tickets', ticketPayload)
                    );

                    const ticketId = ticketResponse.data?.ticket?.id;

                    if (!ticketId) {
                        throw new Error(
                            'Freshservice created the ticket but did not return a ticket ID.'
                        );
                    }

                    await markLedgerCreated(
                        companyClaim.record,
                        ticketId
                    );

                    createdTickets.push({
                        company: company.name,
                        departmentId,
                        ticketId,
                        subject: ticketPayload.subject,
                        hddNumber
                    });

                    recentTicketsByDepartment.set(departmentId, [
                        {
                            id: ticketId,
                            department_id: company.id,
                            subject: ticketPayload.subject,
                            tags: ticketPayload.tags
                        }
                    ]);
                } catch (ticketError) {
                    await markLedgerFailed(
                        companyClaim.record,
                        ticketError
                    );

                    failedTickets.push({
                        company: company.name,
                        departmentId,
                        error: serializeError(ticketError)
                    });
                }

                if (REQUEST_DELAY_MS > 0) {
                    await sleep(REQUEST_DELAY_MS);
                }
            }

            const summary = {
                totalCompaniesChecked: allDepartments.length,
                backupEnabledCompanies: backupEnabledCompanies.length,
                ticketsCreated: createdTickets.length,
                ticketsSkipped: skippedTickets.length,
                ticketsFailed: failedTickets.length
            };

            const completionNote = failedTickets.length
                ? JSON.stringify({
                      summary,
                      failedCompanies: failedTickets.map((ticket) => ({
                          company: ticket.company,
                          departmentId: ticket.departmentId,
                          error: ticket.error
                      }))
                  }).slice(0, 4000)
                : JSON.stringify({ summary });

            await markLedgerCreated(
                batchRecord,
                null,
                completionNote
            );

            return res.status(200).json({
                status: 'completed',
                periodKey: schedule.periodKey,
                targetMonth: schedule.targetMonth,
                targetFriday: schedule.targetFriday,
                hddNumber,
                retryFailed,
                ...summary,
                createdTickets,
                skippedTickets,
                failedTickets
            });
        } catch (error) {
            if (batchRecord) {
                try {
                    await markLedgerFailed(batchRecord, error);
                } catch (ledgerError) {
                    console.error(
                        'Unable to mark the backup batch as failed:',
                        ledgerError
                    );
                }
            }

            console.error(
                'Backup ticket automation failed:',
                serializeError(error)
            );

            return res.status(error.status || 500).json({
                error: 'Backup ticket automation failed.',
                message: error.message,
                details: error.details || error?.response?.data || null,
                periodKey: schedule.periodKey,
                targetMonth: schedule.targetMonth
            });
        } finally {
            activePeriods.delete(schedule.periodKey);
        }
    }
);

router.get(
    '/test-backup-ticket',
    async (_req, res) => {
        try {
            const schedule = buildScheduleContext({
                timeZone: DEFAULT_TIMEZONE
            });

            const currentDisk = await HDDCon.findOne({
                where: {
                    date: schedule.targetMonth
                }
            });

            return res.json({
                schedule,
                expectedDatabaseDate: schedule.targetMonth,
                hddRecord: currentDisk
                    ? {
                          id: currentDisk.id,
                          date: currentDisk.date,
                          HDDNumber: currentDisk.HDDNumber
                      }
                    : null
            });
        } catch (error) {
            return res.status(error.status || 500).json({
                error: error.message,
                details: error.details || null
            });
        }
    }
);

router._test = {
    buildScheduleContext,
    buildTicketPayload,
    formatUtcDate,
    getFirstFriday
};

module.exports = router;
