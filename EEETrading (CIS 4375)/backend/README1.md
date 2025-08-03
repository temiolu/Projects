# Data Platform Backend

This implementation is for NodeJS based on [Express](https://expressjs.com/) and [MongoDB](https://www.mongodb.com/) and uses [mongoose](https://mongoosejs.com/) as the ODM.

## Project setup
Open a terminal and navigate into the backend directory (EX: C:\Users\name\FITP-Member-Portal\back-end). Then, run the following command:
```
npm install
```

### Before Startup 
Setup a .env file with following variables, e.g.:

```
DB_HOST = <db-endpoint>
BACK_END_URL = <URL for backend, ex: http://localhost:3000>
BACK_END_PORT = <port for backend, ex: 3000>
DB_PORT= <db port, ex: 3306 for MySQL>
DB_DATABASE= <name of database>
DB_USER = <name of db user>
DB_PASSWORD = <name of db password>
AUTOMATED_EMAIL = <email for automated emails>
AUTOMATED_EMAIL_PASSWORD = <email **app password** for automated emails>
EMAIL = <email for automated emails>
PASS = <email **app password** for automated emails>
SECRET_TOKEN = <secret-token, see documentation guides for how to obtain this>
FRONT_END_URL= http://localhost:8080 (can be changed)
```

### Running the Backend
Run this command in the terminal: 
```
npm start
```

## Documentation
The API endpoint documentation can be found in the following link:
- [API Documentation](https://documenter.getpostman.com/view/19810529/2sA3JDim1y#e4ed858d-992d-43a3-8a3b-81e31d256a28)

## Email Setup for Automated Emails
1. Inside your .env file, change 'EMAIL' and 'AUTOMATED_EMAIL' to the email of your choice. Change 'AUTOMATED_EMAIL_PASSWORD' and 'PASS' to the **APP PASSWORD** for the email chosen. For app passwords, click the following depending on the type of email: [Gmail](https://support.google.com/accounts/answer/185833?hl=en), [Outlook](https://support.microsoft.com/en-us/account-billing/manage-app-passwords-for-two-step-verification-d6dc8c6d-4bf7-4851-ad95-6d07799387e9), [Apple](https://support.apple.com/en-us/102654), [Yahoo](https://help.yahoo.com/kb/SLN15241.html?guccounter=1)
2. Open "**mailing.js"** located in "back-end/services/". Find const **Transporter** and change the host to match which ever email service you use. If necessary, alter the other properties. For example, gmail would be:
```
const Transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // For an outlook email: "smtp.office365.com",
  port: 587,
  requireTLS: true,
  tls: {
    ciphers: "SSLv3",
    rejectUnauthorized: false,
  },
  auth: {
    user: process.env.AUTOMATED_EMAIL,
    pass: process.env.AUTOMATED_EMAIL_PASSWORD,
  },
});
```
