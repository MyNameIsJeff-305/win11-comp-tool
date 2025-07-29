const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

async function generatePDFBuffer(data) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    let y = page.getHeight() - 40;

    for (const [key, value] of Object.entries(data)) {
        page.drawText(`${key}: ${value}`, {
            x: 50, y, size: 12, font, color: rgb(0, 0, 0)
        });
        y -= 20;
    }

    return await pdfDoc.save();
}

module.exports = { generatePDFBuffer };