import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send an email using nodemailer
 * @param {string} to - recipient email
 * @param {string} subject - email subject
 * @param {string} text - email body
 */
// export const sendEmail = async ({ to, subject, text }) => {
//   try {
//     await transporter.sendMail({
//       from: process.env.EMAIL_USER,
//       to,
//       subject,
//       text
//     });
//   } catch (err) {
//     console.error("Email sending error:", err);
//   }
// };

// import nodemailer from "nodemailer";

// const transporter = nodemailer.createTransport({
//   service: "Gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS
//   }
// });

/**------------------------------------------------------------ */
/**
 * Send a plain text email
 * @param {Object} param0
 */
export const sendEmail = async ({ to, subject, text }) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text
    });
  } catch (err) {
    console.error("Email sending error:", err);
  }
};

/**
 * Send an HTML styled booking confirmation email
 * @param {Object} param0
 */
export const sendBookingConfirmationEmail = async ({ to, subject, bookingData }) => {
  const {
    customerName,
    petName,
    serviceType,
    subService,
    date,
    time,
    groomerName
  } = bookingData;

  const htmlContent = `
  <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
    <h2 style="color: #5c67f2;">🐾 PetGroomr Booking Confirmation 🐾</h2>
    <p>Hi <strong>${customerName}</strong>,</p>
    <p>Your booking has been confirmed with the following details:</p>
    <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
      <tr>
        <th style="border: 1px solid #ddd; padding: 8px;">Pet</th>
        <td style="border: 1px solid #ddd; padding: 8px;">${petName}</td>
      </tr>
      <tr>
        <th style="border: 1px solid #ddd; padding: 8px;">Service</th>
        <td style="border: 1px solid #ddd; padding: 8px;">${serviceType}</td>
      </tr>
      <tr>
        <th style="border: 1px solid #ddd; padding: 8px;">Sub Service</th>
        <td style="border: 1px solid #ddd; padding: 8px;">${subService}</td>
      </tr>
      <tr>
        <th style="border: 1px solid #ddd; padding: 8px;">Date</th>
        <td style="border: 1px solid #ddd; padding: 8px;">${date}</td>
      </tr>
      <tr>
        <th style="border: 1px solid #ddd; padding: 8px;">Time</th>
        <td style="border: 1px solid #ddd; padding: 8px;">${time}</td>
      </tr>
      <tr>
        <th style="border: 1px solid #ddd; padding: 8px;">Groomer</th>
        <td style="border: 1px solid #ddd; padding: 8px;">${groomerName}</td>
      </tr>
    </table>
    <p>We look forward to seeing you and your pet soon!</p>
    <p style="color: #888;">– PetGroomr Team</p>
  </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: htmlContent
    });
  } catch (err) {
    console.error("HTML Email sending error:", err);
  }
};
