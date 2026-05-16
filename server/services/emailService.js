const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendWelcomeEmail = async (email, fullName, userId, password) => {
  const mailOptions = {
    from: `"CTC Platform" <${process.env.FROM_EMAIL}>`,
    to: email,
    subject: 'Welcome to CTC - Registration Successful',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #A020F0; text-align: center;">Welcome to CTC Platform!</h2>
        <p>Dear ${fullName},</p>
        <p>Congratulations! Your registration on the CTC Platform was successful. Below are your account details:</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Username / Referral ID:</strong> ${userId}</p>
          <p><strong>Password:</strong> ${password}</p>
        </div>
        <p>You can now log in to your dashboard and start exploring the features of CTC.</p>
        <p>If you have any questions, feel free to reply to this email.</p>
        <br />
        <p>Best Regards,<br />The CTC Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Welcome email sent to:', email);
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
};

module.exports = {
  sendWelcomeEmail,
};
