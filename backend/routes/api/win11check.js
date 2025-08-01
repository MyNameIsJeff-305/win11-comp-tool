const express = require('express');
const { requireAuth } = require('../../utils/auth');
const { Report, User } = require('../../db/models');
const fs = require('fs/promises');
const path = require('path');
const { generatePDFBuffer } = require('../../utils/pdf');
const sendMail = require('../../utils/email');

const router = express.Router();

router.post('/', async (req, res) => {
    const user = req.user;
    const data = req.body;

    const report = await Report.create({
        ...data,
        userId: user.id,
        pdfPath: `reports/${data.machine_code}.pdf`
    });

    const pdfBuffer = await generatePDFBuffer({ ...data, email: user.email });

    await fs.mkdir('reports', { recursive: true });
    await fs.writeFile(`reports/${data.machine_code}.pdf`, pdfBuffer);

    await sendMail(user.email, data.machine_code, pdfBuffer);

    res.json({ success: true });
});

module.exports = router;