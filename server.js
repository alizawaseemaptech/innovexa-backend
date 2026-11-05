/* ======================================================
   INNOVEXA SOLUTIONS — MAIN BACKEND SERVER
   Includes:
   - Booking management
   - Admin authentication
   - Payment APIs
   - Email notifications
   - Projects management
   - Health checks
====================================================== */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const db = require('./db');
const projectsDb = require('./projects');

const {
  sendBookingNotification,
  sendBookingApprovalEmail,
} = require('./mailer');

const app = express();

const PORT = process.env.PORT || 5000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-me';


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));


// ======================================================
// RATE LIMITING
// ======================================================

const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many booking attempts. Please try again later.',
  },
});


// ======================================================
// ADMIN AUTHENTICATION
// ======================================================

function requireAdmin(req, res, next) {
  const key = req.header('x-api-key');

  if (!process.env.ADMIN_KEY || key !== ADMIN_KEY) {
    return res.status(401).json({
      error: 'Unauthorized',
    });
  }

  next();
}


// ======================================================
// VALID SERVICES
// ======================================================

const VALID_SERVICES = [
  'Full Stack Web Development',
  'UI/UX & Figma Design',
  'Logo & Graphic Design',
  'Professional Video Editing',
  'Google Ads & SEO',
  'Website Bug Fixes & Maintenance',
  'Social Media Marketing',
];


// ======================================================
// VALID PAYMENT METHODS
// ======================================================

const VALID_PAYMENT_METHODS = [
  'jazzcash',
  'easypaisa',
  'bank',
  'paypal',
];


// ======================================================
// BOOKING VALIDATION
// ======================================================

function validateBooking(body) {
  const errors = [];

  if (!body.service || !VALID_SERVICES.includes(body.service)) {
    errors.push('Invalid or missing service.');
  }

  if (!body.date) {
    errors.push('Date is required.');
  }

  if (!body.time) {
    errors.push('Time slot is required.');
  }

  if (typeof body.name !== 'string' || !body.name.trim()) {
    errors.push('Name is required.');
  }

  if (typeof body.phone !== 'string' || !body.phone.trim()) {
    errors.push('Phone number is required.');
  }

  if (
    body.email &&
    (typeof body.email !== 'string' ||
      !/^\S+@\S+\.\S+$/.test(body.email.trim()))
  ) {
    errors.push('Email looks invalid.');
  }

  return errors;
}


// ======================================================
// GENERAL HEALTH CHECK
// ======================================================

app.get('/health', (req, res) => {
  res.set('Cache-Control', 'no-store');

  res.json({
    status: 'ok',
    service: 'Innovexa Solutions Backend',
    time: new Date().toISOString(),
  });
});


// ======================================================
// BOOKINGS
// ======================================================


// ------------------------------------------------------
// CREATE BOOKING
// ------------------------------------------------------

app.post(
  '/api/bookings',
  bookingLimiter,
  async (req, res) => {
    const errors = validateBooking(req.body);

    if (errors.length) {
      return res.status(400).json({
        error: errors.join(' '),
      });
    }

    const {
      service,
      date,
      time,
      name,
      phone,
      email,
      notes,
    } = req.body;

    try {
      const booking = db.createBooking({
        service,
        date,
        time,
        name: name.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : null,
        notes:
          typeof notes === 'string' && notes.trim()
            ? notes.trim()
            : null,
      });

      // Send notification in the background.
      sendBookingNotification(booking).catch((err) => {
        console.error('[booking email]', err);
      });

      return res.status(201).json({
        success: true,
        booking,
      });
    } catch (err) {
      console.error('Failed to create booking:', err);

      return res.status(500).json({
        error: 'Something went wrong. Please try again.',
      });
    }
  }
);


// ------------------------------------------------------
// GET ALL BOOKINGS — ADMIN
// ------------------------------------------------------

app.get('/api/bookings', requireAdmin, (req, res) => {
  try {
    return res.json({
      bookings: db.getAllBookings(),
    });
  } catch (err) {
    console.error('Failed to retrieve bookings:', err);

    return res.status(500).json({
      error: 'Failed to retrieve bookings.',
    });
  }
});


// ------------------------------------------------------
// UPDATE BOOKING STATUS — ADMIN
// ------------------------------------------------------

app.patch('/api/bookings/:id', requireAdmin, async (req, res) => {
  const { status, amount } = req.body;

  const allowedStatuses = [
    'pending',
    'approved',
    'rejected',
    'completed',
  ];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      error: 'Invalid status.',
    });
  }

  let previousBooking = null;

  try {
    const allBookings = db.getAllBookings();

    previousBooking = allBookings.find(
      (booking) => String(booking.id) === String(req.params.id)
    );
  } catch (err) {
    console.error('Could not read previous booking:', err);
  }

  let updated;

  try {
    updated = db.updateBookingStatus(
      req.params.id,
      status,
      amount
    );
  } catch (err) {
    console.error('Failed to update booking status:', err);

    return res.status(500).json({
      error: 'Failed to update booking.',
    });
  }

  if (!updated) {
    return res.status(404).json({
      error: 'Booking not found.',
    });
  }

  let paymentUrl = null;

  if (status === 'approved' && updated.payment_token) {
    paymentUrl =
      `${req.protocol}://${req.get('host')}` +
      `/payment.html?id=${encodeURIComponent(updated.id)}` +
      `&token=${encodeURIComponent(updated.payment_token)}`;
  }

  const isNewApproval =
    status === 'approved' &&
    previousBooking?.status !== 'approved';

  if (isNewApproval && updated.email) {
    sendBookingApprovalEmail(updated, paymentUrl)
      .then(() => {
        console.log(
          `[mailer] Approval email process completed for booking #${updated.id}`
        );
      })
      .catch((err) => {
        console.error(
          `[mailer] Approval email failed for booking #${updated.id}:`,
          err
        );
      });
  }

  return res.json({
    success: true,
    booking: updated,
    paymentUrl,
    emailSent: Boolean(isNewApproval && updated.email),
  });
});


// ------------------------------------------------------
// DELETE BOOKING — ADMIN
// ------------------------------------------------------

app.delete('/api/bookings/:id', requireAdmin, (req, res) => {
  try {
    db.deleteBooking(req.params.id);

    return res.json({
      success: true,
    });
  } catch (err) {
    console.error('Failed to delete booking:', err);

    return res.status(500).json({
      error: 'Failed to delete booking.',
    });
  }
});


// ======================================================
// PAYMENT
// ======================================================


// ------------------------------------------------------
// GET PAYMENT DETAILS
// ------------------------------------------------------

app.get('/api/bookings/:id/payment', (req, res) => {
  try {
    const { token } = req.query;

    const result = db.getBookingForPayment(
      req.params.id,
      token
    );

    if (result.error === 'not_found') {
      return res.status(404).json({
        error: 'Booking not found.',
      });
    }

    if (result.error === 'not_approved') {
      return res.status(403).json({
        error: 'This booking has not been approved yet.',
      });
    }

    if (result.error === 'invalid_token') {
      return res.status(403).json({
        error: 'Invalid or expired payment link.',
      });
    }

    return res.json({
      booking: result.booking,
    });
  } catch (err) {
    console.error('Failed to get payment details:', err);

    return res.status(500).json({
      error: 'Failed to retrieve payment details.',
    });
  }
});


// ------------------------------------------------------
// SUBMIT PAYMENT
// ------------------------------------------------------

app.post('/api/bookings/:id/payment', (req, res) => {
  try {
    const {
      token,
      method,
      reference,
    } = req.body;

    if (!VALID_PAYMENT_METHODS.includes(method)) {
      return res.status(400).json({
        error: 'Invalid payment method.',
      });
    }

    const result = db.submitPayment(
      req.params.id,
      token,
      {
        method,
        reference,
      }
    );

    if (result.error === 'not_found') {
      return res.status(404).json({
        error: 'Booking not found.',
      });
    }

    if (result.error === 'not_approved') {
      return res.status(403).json({
        error: 'This booking has not been approved yet.',
      });
    }

    if (result.error === 'invalid_token') {
      return res.status(403).json({
        error: 'Invalid or expired payment link.',
      });
    }

    return res.json({
      success: true,
      booking: result.booking,
    });
  } catch (err) {
    console.error('Failed to submit payment:', err);

    return res.status(500).json({
      error: 'Failed to submit payment.',
    });
  }
});


// ------------------------------------------------------
// CONFIRM PAYMENT — ADMIN
// ------------------------------------------------------

app.patch(
  '/api/bookings/:id/confirm-payment',
  requireAdmin,
  (req, res) => {
    try {
      const updated = db.confirmPayment(req.params.id);

      if (!updated) {
        return res.status(404).json({
          error: 'Booking not found.',
        });
      }

      return res.json({
        success: true,
        booking: updated,
      });
    } catch (err) {
      console.error('Failed to confirm payment:', err);

      return res.status(500).json({
        error: 'Failed to confirm payment.',
      });
    }
  }
);


// ======================================================
// PROJECTS
// ======================================================


// ------------------------------------------------------
// PUBLIC PROJECTS
// ------------------------------------------------------

app.get('/api/projects', (req, res) => {
  try {
    return res.json({
      projects: projectsDb.getAllProjects({
        publishedOnly: true,
      }),
    });
  } catch (err) {
    console.error('Failed to retrieve public projects:', err);

    return res.status(500).json({
      error: 'Failed to retrieve projects.',
    });
  }
});


// ------------------------------------------------------
// ALL PROJECTS — ADMIN
// ------------------------------------------------------

app.get('/api/projects/all', requireAdmin, (req, res) => {
  try {
    return res.json({
      projects: projectsDb.getAllProjects({
        publishedOnly: false,
      }),
    });
  } catch (err) {
    console.error('Failed to retrieve all projects:', err);

    return res.status(500).json({
      error: 'Failed to retrieve projects.',
    });
  }
});


// ------------------------------------------------------
// CREATE PROJECT — ADMIN
// ------------------------------------------------------

app.post('/api/projects', requireAdmin, (req, res) => {
  try {
    const {
      title,
      category,
      description,
      image_url,
      link,
      published,
    } = req.body;

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        error: 'Title is required.',
      });
    }

    const project = projectsDb.createProject({
      title: title.trim(),
      category,
      description,
      image_url,
      link,
      published,
    });

    return res.status(201).json({
      success: true,
      project,
    });
  } catch (err) {
    console.error('Failed to create project:', err);

    return res.status(500).json({
      error: 'Failed to create project.',
    });
  }
});


// ------------------------------------------------------
// UPDATE PROJECT — ADMIN
// ------------------------------------------------------

app.patch('/api/projects/:id', requireAdmin, (req, res) => {
  try {
    const updated = projectsDb.updateProject(
      req.params.id,
      req.body
    );

    if (!updated) {
      return res.status(404).json({
        error: 'Project not found.',
      });
    }

    return res.json({
      success: true,
      project: updated,
    });
  } catch (err) {
    console.error('Failed to update project:', err);

    return res.status(500).json({
      error: 'Failed to update project.',
    });
  }
});


// ------------------------------------------------------
// DELETE PROJECT — ADMIN
// ------------------------------------------------------

app.delete('/api/projects/:id', requireAdmin, (req, res) => {
  try {
    projectsDb.deleteProject(req.params.id);

    return res.json({
      success: true,
    });
  } catch (err) {
    console.error('Failed to delete project:', err);

    return res.status(500).json({
      error: 'Failed to delete project.',
    });
  }
});


// ======================================================
// API 404 HANDLER
// Keep this after all API routes.
// ======================================================

app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found.',
    path: req.originalUrl,
  });
});


// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use((err, req, res, next) => {
  console.error('[server error]', err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    error: 'An unexpected server error occurred.',
  });
});


// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, () => {
  console.log(`Innovexa backend running on http://localhost:${PORT}`);
  console.log(`Admin dashboard: http://localhost:${PORT}/admin.html`);

  console.log(
    `Email system: ${process.env.EMAIL_USER ? 'configured' : 'not configured'
    }`
  );
});