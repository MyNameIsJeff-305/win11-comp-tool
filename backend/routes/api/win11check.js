const express = require('express');
const { requireAuth } = require('../../utils/auth');
const { Report, User } = require('../../db/models');
const fs = require('fs/promises');
const path = require('path');
const { generatePDFBuffer } = require('../../utils/pdf');
const sendMail = require('../../utils/email');
const bcrypt = require('bcryptjs');
const { singleMulterUpload, singleFileUpload } = require('../../awsS3');

const router = express.Router();

//function to create a random password
// function generateRandomPassword(length = 10) {
//     const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
//     let password = '';
//     for (let i = 0; i < length; i++) {
//         const randomIndex = Math.floor(Math.random() * charset.length);
//         password += charset[randomIndex];
//     }
//     return password;
// }

router.post('/', singleMulterUpload('pdf'), async (req, res) => {
    const { email, stationName, clientName, machine_code, hostname, status, issues, cpu, ram, storage, tpm, secureBoot } = req.body;

    // const newPassword = generateRandomPassword(12);

    const report = await Report.create({
        machineCode: machine_code,
        email,
        stationName,
        hostname,
        client: clientName,
        cpu,
        ram,
        storage,
        tpm,
        secureBoot,
        compatible: status,
        issues
    });

    const uploadsDir = path.join(__dirname, '../../uploads');

    // Ensure the uploads directory exists
    await fs.mkdir(uploadsDir, { recursive: true });

    const pdfFileName = `report-${stationName}-${Date.now()}.pdf`;
    const pdfFilePath = path.join(uploadsDir, pdfFileName);
    
    
    //Create a PDF File and upload it to S3
    const pdfBuffer = await generatePDFBuffer({
        email: email,
        stationName: stationName,
        clientName: clientName,
        machineCode: report.machineCode,
        hostname: report.hostname,
        cpu: report.cpu,
        ram: report.ram,
        storage: report.storage,
        tpm: report.tpm,
        secureBoot: report.secureBoot,
        compatible: report.compatible,
        issues: report.issues,
    });
    
    // Write the PDF buffer to a local file
    await fs.writeFile(pdfFilePath, pdfBuffer);

    // await sendMail(newUser.email, machine_code, pdfBuffer, newUser.password);

    // // Send the PDF file to S3 
    // singleFileUpload({ file: req.file(pdfFilePath), public: true});

    // // Delete the local PDF file after uploading to S3
    // await fs.unlink(pdfFilePath);

    res.status(201).json({
        message: 'Report created successfully',
        report: {
            id: report.id,
            machineCode: report.machineCode,
            hostname: report.hostname,
            cpu: report.cpu,
            ram: report.ram,
            storage: report.storage,
            tpm: report.tpm,
            secureBoot: report.secureBoot,
            compatible: report.compatible,
            issues: report.issues,
        },
        pdfFileName
    });
});

module.exports = router;