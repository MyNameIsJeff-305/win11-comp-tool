const nodemailer = require('nodemailer');

module.exports = async function sendMail(to, machineCode, pdfBuffer) {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT),
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    await transporter.sendMail({
        from: `"Windows 11 Tool" <${process.env.EMAIL_USER}>`,
        to,
        subject: `Reporte generado – ${machineCode}`,
        text: 'Adjunto encontrarás el reporte de compatibilidad con Windows 11.',
        attachments: [
            {
                filename: `${machineCode}.pdf`,
                content: pdfBuffer,
            },
        ],
    });
};