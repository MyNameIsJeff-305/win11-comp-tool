const express = require('express');
const axios = require('axios');
const router = express.Router();

const {
    FRESHSERVICE_API_KEY,
    FRESHSERVICE_DOMAIN,
    FRESHSERVICE_PASSWORD
} = process.env;

/**
 * GET all companies (departments) from Freshservice
 * and filter only those with Backup Service enabled
 */
router.get('/companies-with-backup-enabled', async (req, res) => {
    try {
        let page = 1;
        let allDepartments = [];
        let hasMore = true;

        while (hasMore) {
            const response = await axios.get(
                `https://${FRESHSERVICE_DOMAIN}.freshservice.com/api/v2/departments`,
                {
                    params: { page },
                    auth: {
                        username: FRESHSERVICE_API_KEY,
                        password: FRESHSERVICE_PASSWORD
                    },
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            const departments = response.data?.departments || [];
            allDepartments.push(...departments);

            // Freshservice returns empty array when no more pages
            if (departments.length === 0) {
                hasMore = false;
            } else {
                page++;
            }
        }

        // 🔍 Filter companies with backup enabled
        const companiesWithBackup = allDepartments.filter(dept =>
            dept?.custom_fields?.backup_service === 'Yes'
        );

        res.json({
            totalCompanies: allDepartments.length,
            totalWithBackupEnabled: companiesWithBackup.length,
            companiesWithBackup
        });

    } catch (error) {
        console.error('Freshservice API Error:', error?.response?.data || error.message);

        res.status(500).json({
            error: 'Failed to fetch companies from Freshservice',
            details: error?.response?.data || error.message
        });
    }
});

module.exports = router;
