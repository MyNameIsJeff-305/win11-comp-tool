const express = require('express');
const { requireAuth } = require('../../utils/auth');
const { Report, User } = require('../../db/models');
const fs = require('fs/promises');
const path = require('path');
const { generatePDFBuffer } = require('../../utils/pdf');
const sendMail = require('../../utils/email');

const router = express.Router();

//function to create a random password
function generateRandomPassword(length = 10) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }
    return password;
}

router.post('/', async (req, res) => {
    const data = req.body;

    const newPassword = generateRandomPassword(12);

    const newUser = await User.create({
        email: data.email,
        stationName: data.stationName,
        clientName: data.clientName,
        hashedPassword: newPassword
    })

    const report = await Report.create({
        ...data,
        userId: newUser.id,
        pdfPath: `reports/${data.machine_code}.pdf`
    });

    const pdfBuffer = await generatePDFBuffer({ ...data, email: newUser.email });

    await fs.mkdir('reports', { recursive: true });
    await fs.writeFile(`reports/${data.machine_code}.pdf`, pdfBuffer);

    await sendMail(newUser.email, data.machine_code, pdfBuffer, newUser.password);

    res.json({ success: true });
});

module.exports = router;