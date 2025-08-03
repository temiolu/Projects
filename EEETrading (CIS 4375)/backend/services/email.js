const nodemailer = require('nodemailer');
const path = require('path');
const ejs = require('ejs');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL,
        pass: process.env.AUTOMATED_EMAIL_PASSWORD
    }
});

async function sendInvoiceEmail(invoice, customer, items) {
    const templatePath = path.join(__dirname, '../templates/invoice-email.ejs');
    const html = await ejs.renderFile(templatePath, {
        invoice,
        customer,
        items
    });

    await transporter.sendMail({
        from: `"EEETrading LLC" <${process.env.EMAIL}>`,
        to: customer.email,
        subject: `Invoice #${invoice.id} from EEETrading LLC`,
        html
    });
}

module.exports = { sendInvoiceEmail };
