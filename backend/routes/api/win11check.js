const express = require('express');
const { requireAuth } = require('../../utils/auth');
const { Report, User } = require('../../db/models');
const fs = require('fs/promises');
const path = require('path');
const { generatePDFBuffer } = require('../../utils/pdf');
const sendMail = require('../../utils/email');
const { bcrypt } = require('bcryptjs');

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
    const {email, stationName, clientName, machine_code, hostname, status, issues, cpu, ram, storage, tpm, secureBoot} = req.body;


    const newPassword = generateRandomPassword(12);

    const newUser = await User.create(
        {
            email,
            stationName,
            clientName,
            hashedPassword: await bcrypt.hash(newPassword, 10) // Store the hashed password
        }
    )

    const report = await Report.create({
        machineCode: machine_code,
        hostname,
        cpu,
        ram,
        storage,
        tpm,
        secureBoot,
        compatible: status,
        issues,
        userId: newUser.id,
    });

    const pdfBuffer = await generatePDFBuffer({ machine_code, hostname, status, issues, email: newUser.email });

    await fs.mkdir('reports', { recursive: true });
    await fs.writeFile(`reports/${machine_code}.pdf`, pdfBuffer);

    await sendMail(newUser.email, machine_code, pdfBuffer, newUser.password);

    res.json({ success: true });
});

module.exports = router;