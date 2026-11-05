const nodemailer = require('nodemailer');

const isConfigured =
  process.env.EMAIL_USER &&
  process.env.EMAIL_PASS &&
  process.env.EMAIL_USER !== 'youraddress@gmail.com' &&
  process.env.EMAIL_PASS !== 'your-16-character-app-password';

let transporter = null;

if (isConfigured) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

async function sendBookingNotification(booking) {
  if (!transporter) {
    console.log(
      '[mailer] Email not configured — skipping notification for booking #' +
        booking.id
    );
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

  const summary = `
New booking received — Innovexa Solutions

Booking ID: #${booking.id}
Service:    ${booking.service}
Date:       ${booking.date}
Time:       ${booking.time}
Name:       ${booking.name}
Phone:      ${booking.phone}
Email:      ${booking.email || '—'}
Notes:      ${booking.notes || '—'}
`;

  try {
    // Admin notification
    await transporter.sendMail({
      from: `"Innovexa Solutions" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: `New booking: ${booking.service} — ${booking.name}`,
      text: summary,
    });

    // Customer booking confirmation
    if (booking.email) {
      await transporter.sendMail({
        from: `"Innovexa Solutions" <${process.env.EMAIL_USER}>`,
        to: booking.email,
        subject:
          'We received your project request — Innovexa Solutions',

        text: `Hi ${booking.name},

Thank you for choosing Innovexa Solutions.

We have successfully received your project booking request.

Service: ${booking.service}
Preferred Date: ${booking.date}
Preferred Time: ${booking.time}

Our team will review your request and contact you shortly.

Best Regards,
Innovexa Solutions
Innovate • Design • Develop • Deliver
${process.env.EMAIL_USER}
+92 349 2718571`,

        html: createBookingReceivedEmail(booking),
      });
    }
  } catch (err) {
    console.error('[mailer] Failed to send booking notification:', err.message);
  }
}


// ======================================================
// APPROVED BOOKING EMAIL
// ======================================================

async function sendBookingApprovalEmail(booking, paymentUrl = null) {
  if (!transporter) {
    console.log(
      '[mailer] Email not configured — skipping approval email for booking #' +
        booking.id
    );
    return;
  }

  if (!booking.email) {
    console.log(
      '[mailer] Customer has no email — skipping approval email for booking #' +
        booking.id
    );
    return;
  }

  const safeName = escapeHtml(booking.name || 'Client');
  const safeService = escapeHtml(booking.service || 'Project');
  const safeDate = escapeHtml(booking.date || '—');
  const safeTime = escapeHtml(booking.time || '—');
  const safeId = escapeHtml(booking.id);

  const requirementsText = `
Project Requirements:

1. Project/Business Name:
2. Type of Website/Application:
3. Main Purpose of the Project:
4. Required Pages/Sections:
5. Features & Functionalities Required:
6. Design Preferences / Reference Websites:
7. Content Available: (Text, Images, Videos, Logo, etc.)
8. Required Integrations: (WhatsApp, Payment Gateway, APIs, etc.)
9. Target Audience:
10. Any Additional Requirements:

You may also attach logos, images, documents, content, or reference materials.
`;

  const paymentText = paymentUrl
    ? `

Payment Link:
${paymentUrl}
`
    : '';

  try {
    await transporter.sendMail({
      from: `"Innovexa Solutions" <${process.env.EMAIL_USER}>`,
      to: booking.email,

      subject: `Project Approved — ${booking.service} | Innovexa Solutions`,

      text: `Hi ${booking.name},

Thank you for choosing Innovexa Solutions for your project.

We are pleased to confirm that your project booking has been approved and we are ready to proceed with the next stage of development.

Booking ID: #${booking.id}
Service: ${booking.service}
Preferred Date: ${booking.date}
Preferred Time: ${booking.time}

${requirementsText}

Once we receive your requirements, our team will review them and confirm the project scope, development timeline, and next steps with you.

If you have any questions, simply reply to this email and our team will assist you.

Thank you for choosing Innovexa Solutions.

Best Regards,

Innovexa Solutions
Innovate • Design • Develop • Deliver

${process.env.EMAIL_USER}
+92 349 2718571
${paymentText}`,

      html: createApprovalEmail(booking, paymentUrl),
    });

    console.log(
      `[mailer] Approval email sent successfully to ${booking.email} for booking #${booking.id}`
    );
  } catch (err) {
    console.error(
      '[mailer] Failed to send approval email:',
      err.message
    );
  }
}


// ======================================================
// BOOKING RECEIVED EMAIL HTML
// ======================================================

function createBookingReceivedEmail(booking) {
  const name = escapeHtml(booking.name);
  const service = escapeHtml(booking.service);
  const date = escapeHtml(booking.date);
  const time = escapeHtml(booking.time);

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>

<body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#172033;">

<div style="max-width:620px;margin:35px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6ebf2;">

  <div style="padding:28px 30px;background:#07111f;color:white;">
    <div style="font-size:12px;letter-spacing:2px;color:#4fd6e0;font-weight:bold;">
      INNOVEXA SOLUTIONS
    </div>

    <h1 style="margin:14px 0 5px;font-size:27px;">
      Request Received
    </h1>

    <p style="margin:0;color:#aebbd0;">
      Your project request has been successfully received.
    </p>
  </div>

  <div style="padding:30px;">

    <p style="font-size:15px;">
      Hi <strong>${name}</strong>,
    </p>

    <p style="font-size:15px;line-height:1.7;color:#526078;">
      Thank you for choosing <strong>Innovexa Solutions</strong>.
      We have successfully received your project booking request.
    </p>

    <div style="background:#f6f9fc;border:1px solid #e5ebf3;border-radius:12px;padding:18px;margin:24px 0;">
      <p style="margin:0 0 8px;font-size:12px;color:#8491a5;text-transform:uppercase;">
        Service
      </p>

      <strong style="font-size:16px;">
        ${service}
      </strong>

      <p style="margin:18px 0 5px;color:#8491a5;font-size:12px;">
        Preferred Schedule
      </p>

      <strong>
        ${date} · ${time}
      </strong>
    </div>

    <p style="font-size:14px;line-height:1.7;color:#526078;">
      Our team will review your request and contact you shortly.
    </p>

    <p style="margin-top:30px;">
      Best Regards,<br>
      <strong>Innovexa Solutions</strong><br>
      <span style="color:#66748a;">
        Innovate • Design • Develop • Deliver
      </span>
    </p>

  </div>

  <div style="padding:20px 30px;background:#f7f9fc;color:#7a8799;font-size:12px;">
    ${process.env.EMAIL_USER}<br>
    +92 349 2718571
  </div>

</div>

</body>
</html>
`;
}


// ======================================================
// APPROVAL EMAIL HTML
// ======================================================

function createApprovalEmail(booking, paymentUrl = null) {
  const name = escapeHtml(booking.name || 'Client');
  const service = escapeHtml(booking.service || 'Project');
  const date = escapeHtml(booking.date || '—');
  const time = escapeHtml(booking.time || '—');
  const id = escapeHtml(booking.id);

  const paymentSection = paymentUrl
    ? `
      <div style="
        margin:25px 0;
        padding:20px;
        border-radius:14px;
        background:#eef9f8;
        border:1px solid #c8ebe7;
      ">

        <div style="
          font-size:12px;
          color:#148a82;
          text-transform:uppercase;
          letter-spacing:1px;
          font-weight:bold;
          margin-bottom:8px;
        ">
          Next Step
        </div>

        <p style="
          margin:0 0 15px;
          color:#3f5268;
          line-height:1.6;
        ">
          Your project has been approved. If payment is required,
          you can continue using the secure payment page below.
        </p>

        <a href="${escapeHtml(paymentUrl)}"
           style="
             display:inline-block;
             background:#0d1726;
             color:#ffffff;
             text-decoration:none;
             padding:12px 20px;
             border-radius:9px;
             font-weight:bold;
             font-size:14px;
           ">
          Continue to Payment →
        </a>

      </div>
    `
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Project Approved — Innovexa Solutions</title>
</head>

<body style="
margin:0;
padding:0;
background:#f3f6fa;
font-family:Arial,Helvetica,sans-serif;
color:#172033;
">

<div style="
max-width:680px;
margin:35px auto;
background:#ffffff;
border-radius:18px;
overflow:hidden;
border:1px solid #e3e8ef;
">

  <!-- HEADER -->

  <div style="
  background:#07111f;
  padding:34px 36px;
  color:#ffffff;
  ">

    <div style="
    font-size:12px;
    letter-spacing:2px;
    color:#48d8df;
    font-weight:bold;
    ">
      INNOVEXA SOLUTIONS
    </div>

    <h1 style="
    margin:18px 0 8px;
    font-size:30px;
    line-height:1.2;
    ">
      Your Project Is Approved
    </h1>

    <p style="
    margin:0;
    color:#aebbd0;
    font-size:14px;
    line-height:1.6;
    ">
      We're ready to move forward with your project.
    </p>

  </div>


  <!-- CONTENT -->

  <div style="padding:34px 36px;">

    <p style="
    margin:0 0 18px;
    font-size:16px;
    ">
      Hi <strong>${name}</strong>,
    </p>

    <p style="
    font-size:15px;
    line-height:1.8;
    color:#526078;
    ">
      Thank you for choosing <strong>Innovexa Solutions</strong>
      for your project.
    </p>

    <p style="
    font-size:15px;
    line-height:1.8;
    color:#526078;
    ">
      We are pleased to confirm that your
      <strong>project booking has been approved</strong>
      and we are ready to proceed with the next stage of development.
    </p>


    <!-- PROJECT SUMMARY -->

    <div style="
    margin:26px 0;
    padding:20px;
    background:#f7f9fc;
    border:1px solid #e4eaf1;
    border-radius:13px;
    ">

      <div style="
      color:#8794a7;
      font-size:11px;
      text-transform:uppercase;
      letter-spacing:1px;
      margin-bottom:8px;
      ">
        Project Details
      </div>

      <div style="
      font-size:17px;
      font-weight:bold;
      color:#182337;
      ">
        ${service}
      </div>

      <div style="
      margin-top:15px;
      color:#637188;
      font-size:13px;
      ">
        Booking ID: <strong>#${id}</strong>
      </div>

      <div style="
      margin-top:6px;
      color:#637188;
      font-size:13px;
      ">
        Preferred Schedule: <strong>${date} · ${time}</strong>
      </div>

    </div>


    <!-- REQUIREMENTS -->

    <h2 style="
    font-size:19px;
    margin:30px 0 12px;
    color:#172033;
    ">
      Project Requirements
    </h2>

    <p style="
    font-size:14px;
    line-height:1.7;
    color:#647188;
    ">
      To understand your requirements clearly and ensure that the final
      project meets your expectations, please reply to this email with
      the following information:
    </p>

    <div style="
    background:#fafbfd;
    border:1px solid #e6ebf2;
    border-radius:13px;
    padding:20px;
    margin-top:18px;
    ">

      <p style="margin:7px 0;font-size:14px;">
        <strong>1. Project/Business Name:</strong>
      </p>

      <p style="margin:7px 0;font-size:14px;">
        <strong>2. Type of Website/Application:</strong>
      </p>

      <p style="margin:7px 0;font-size:14px;">
        <strong>3. Main Purpose of the Project:</strong>
      </p>

      <p style="margin:7px 0;font-size:14px;">
        <strong>4. Required Pages/Sections:</strong>
      </p>

      <p style="margin:7px 0;font-size:14px;">
        <strong>5. Features & Functionalities Required:</strong>
      </p>

      <p style="margin:7px 0;font-size:14px;">
        <strong>6. Design Preferences / Reference Websites:</strong>
      </p>

      <p style="margin:7px 0;font-size:14px;">
        <strong>7. Content Available:</strong>
        Text, Images, Videos, Logo, etc.
      </p>

      <p style="margin:7px 0;font-size:14px;">
        <strong>8. Required Integrations:</strong>
        WhatsApp, Payment Gateway, APIs, etc.
      </p>

      <p style="margin:7px 0;font-size:14px;">
        <strong>9. Target Audience:</strong>
      </p>

      <p style="margin:7px 0;font-size:14px;">
        <strong>10. Any Additional Requirements:</strong>
      </p>

    </div>


    <p style="
    margin-top:24px;
    font-size:14px;
    line-height:1.7;
    color:#526078;
    ">
      You may also attach any
      <strong>logos, images, documents, content, or reference materials</strong>
      that you would like us to consider during development.
    </p>


    ${paymentSection}


    <div style="
    margin-top:28px;
    padding:18px;
    border-left:4px solid #43d9df;
    background:#f5fafb;
    color:#526078;
    font-size:14px;
    line-height:1.7;
    ">
      Once we receive your requirements, our team will review them and
      confirm the <strong>project scope, development timeline, and next steps</strong>
      with you.
    </div>


    <p style="
    margin-top:28px;
    font-size:14px;
    line-height:1.7;
    color:#526078;
    ">
      If you have any questions, simply reply to this email and our team
      will assist you.
    </p>


    <p style="
    margin-top:30px;
    font-size:14px;
    line-height:1.7;
    ">
      Thank you for choosing <strong>Innovexa Solutions</strong>.
    </p>


    <!-- SIGNATURE -->

    <div style="
    margin-top:30px;
    padding-top:22px;
    border-top:1px solid #e6ebf2;
    ">

      <strong style="font-size:16px;">
        Innovexa Solutions
      </strong>

      <div style="
      margin-top:5px;
      color:#718096;
      font-size:13px;
      ">
        Innovate • Design • Develop • Deliver
      </div>

      <div style="
      margin-top:12px;
      color:#526078;
      font-size:13px;
      ">
        ${process.env.EMAIL_USER}
      </div>

      <div style="
      margin-top:4px;
      color:#526078;
      font-size:13px;
      ">
        +92 349 2718571
      </div>

    </div>

  </div>


  <!-- FOOTER -->

  <div style="
  background:#07111f;
  padding:22px 36px;
  color:#7f8da2;
  font-size:11px;
  line-height:1.6;
  ">

    This email was sent by Innovexa Solutions regarding your project booking.

  </div>

</div>

</body>
</html>
`;
}


module.exports = {
  sendBookingNotification,
  sendBookingApprovalEmail,
};