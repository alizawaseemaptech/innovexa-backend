// db.js — simple JSON-file based storage for bookings.
//
// No native compilation, no Python, no build tools required — this just
// reads and writes a plain "bookings.json" file using Node's built-in fs
// module.
//
// Booking lifecycle:
//   pending      -> client just submitted the booking
//   approved     -> admin approved it; a payment link becomes valid
//   rejected     -> admin declined it
//   completed    -> service delivered (set manually by admin, optional)
//
// Payment lifecycle (separate field, only meaningful once approved):
//   unpaid       -> no payment action yet
//   submitted    -> client says they've paid and gave a reference/transaction id
//   paid         -> admin confirmed the payment actually arrived

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_FILE = path.join(__dirname, 'bookings.json');

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ nextId: 1, bookings: [] }, null, 2));
}

function readData() {
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function createBooking(fields) {
  const data = readData();
  const booking = {
    id: data.nextId,
    service: fields.service,
    date: fields.date,
    time: fields.time,
    name: fields.name,
    phone: fields.phone,
    email: fields.email || null,
    notes: fields.notes || null,
    status: 'pending', // pending | approved | rejected | completed
    payment_status: 'unpaid', // unpaid | submitted | paid
    payment_token: null, // generated when approved; grants access to the payment page
    payment_method: null, // jazzcash | easypaisa | bank | paypal
    payment_reference: null, // transaction id / sender name the client provides
    amount: null, // agreed price in PKR, set by admin when approving
    created_at: new Date().toISOString(),
  };
  data.bookings.push(booking);
  data.nextId += 1;
  writeData(data);
  return booking;
}

function getAllBookings() {
  const data = readData();
  return [...data.bookings].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function getBookingById(id) {
  const data = readData();
  return data.bookings.find((b) => b.id === Number(id)) || null;
}

function updateBookingStatus(id, status, amount) {
  const data = readData();
  const booking = data.bookings.find((b) => b.id === Number(id));
  if (!booking) return null;
  booking.status = status;

  if (amount !== undefined && amount !== null && amount !== '') {
    booking.amount = Number(amount);
  }

  // Generate a payment access token the first time a booking is approved
  if (status === 'approved' && !booking.payment_token) {
    booking.payment_token = crypto.randomBytes(16).toString('hex');
  }

  writeData(data);
  return booking;
}

function submitPayment(id, token, { method, reference }) {
  const data = readData();
  const booking = data.bookings.find((b) => b.id === Number(id));
  if (!booking) return { error: 'not_found' };
  if (booking.status !== 'approved') return { error: 'not_approved' };
  if (booking.payment_token !== token) return { error: 'invalid_token' };

  booking.payment_status = 'submitted';
  booking.payment_method = method;
  booking.payment_reference = reference || null;
  writeData(data);
  return { booking };
}

function confirmPayment(id) {
  const data = readData();
  const booking = data.bookings.find((b) => b.id === Number(id));
  if (!booking) return null;
  booking.payment_status = 'paid';
  writeData(data);
  return booking;
}

function getBookingForPayment(id, token) {
  const booking = getBookingById(id);
  if (!booking) return { error: 'not_found' };
  if (booking.status !== 'approved') return { error: 'not_approved' };
  if (booking.payment_token !== token) return { error: 'invalid_token' };
  return { booking };
}

function deleteBooking(id) {
  const data = readData();
  data.bookings = data.bookings.filter((b) => b.id !== Number(id));
  writeData(data);
  return true;
}

module.exports = {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  submitPayment,
  confirmPayment,
  getBookingForPayment,
  deleteBooking,
};
