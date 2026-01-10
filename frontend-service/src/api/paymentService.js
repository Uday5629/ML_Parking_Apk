import api from './axiosConfig';

// Create a payment order
export const createPayment = (ticketId, amount) =>
  api.post('/payments/create', { ticketId, amount });

// Verify payment (for Razorpay callback)
export const verifyPayment = (paymentData) =>
  api.post('/payments/verify', paymentData);
