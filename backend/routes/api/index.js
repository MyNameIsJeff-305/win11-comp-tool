const router = require('express').Router();
const sessionRouter = require('./session.js');
const usersRouter = require('./users.js');
const win11checkRouter = require('./win11check.js');
const tokenAuthRouter = require('./token-auth.js');
const reportsRouter = require('./reports.js');
const backupsRouter = require('./backups.js');
const { restoreUser } = require("../../utils/auth.js");

// Connect restoreUser middleware to the API router
// If current user session is valid, set req.user to the user in the database
// If current user session is not valid, set req.user to null
router.use(restoreUser);

router.use('/session', sessionRouter);

router.use('/users', usersRouter);

router.use('/win11check', win11checkRouter);

router.use('/token-auth', tokenAuthRouter);

router.use('/reports', reportsRouter);

router.use('/backups', backupsRouter);

router.post('/test', (req, res) => {
    res.json({ requestBody: req.body });
});

router.post('/win11check', (req, res) => {
    const { machine_code, hostname, tpm, secure_boot, ram, storage, cpu, compatible, issues } = req.body;

    try {
        
    } catch (error) {
        
    }
})

module.exports = router;