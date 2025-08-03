const nodemailer = require("nodemailer");
require("dotenv").config();

//needs credentials from login
const senderEmail = process.env.EMAIL;
const senderPassword = process.env.PASS;
const orgID = process.env.ORG_ID;
//the email used has to have 2-step 
const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
  auth: {
    user: senderEmail,
    pass: senderPassword,
  },
});

//the link used in this email will have to be modified and later replaced with the production link
//sends cnfirmation email
module.exports.sendConfirmationEmail = (name, email, code) => {
    transport.sendMail({
      from: senderEmail,
      to: email,
      subject: "Please confirm your account",
      html: `<h1>Email Confirmation</h1>
          <h2>Hello ${name}</h2>
          <p>Thank you for registering. Please confirm your email with the confirmation code provided below.</p>
          <p>Confirmation code: ${code}</p>
          <p>Please note: This code expires in 10 minutes.</p>
          <a href=https://dash.cs.uh.edu/platform/verify> Click here</a>
          </div>`,
    }).catch(err => console.log(err));
  };
  //sends reset password email.
  module.exports.sendResetPasswordEmail = (email, code) => {
    transport.sendMail({
      from: senderEmail,
      to: email,
      subject: "Reset Password",
      html: `<h1>Password Reset</h1>
          <p>Please use the link and confirmation code provided below to reset your password.</p>
          <p>If you have not requested a password reset please log into your account and update your password as soon as possible!</p>
          <p>Confirmation code: ${code}</p>
          <p>Please note: This code expires in 10 minutes.</p>
          <a href=https://dash.cs.uh.edu/platform/resetPasswordForm> Click here</a>
          </div>`,
    }).catch(err => console.log(err));
  };
  //sends new code 
  module.exports.sendNewCode = (email, code) => {
    transport.sendMail({
      from: senderEmail,
      to: email,
      subject: "Please confirm your account",
      html: `<h1>Email Confirmation</h1>
          <p>Thank you for registering. Please confirm your email with the confirmation code provided below.</p>
          <p>Confirmation code: ${code}</p>
          <p>Please note: This code expires in 10 minutes.</p>
          <a href=https://dash.cs.uh.edu/platform/verify> Click here</a>
          </div>`,
    }).catch(err => console.log(err));
  };