import mongoose from 'mongoose';

// Shared, persistent OTP store for guest (non-logged-in) email verification flows.
//
// Why this exists instead of an in-memory Map: the backend deploys as a Vercel
// serverless function, so "send OTP" and "verify OTP" are not guaranteed to hit
// the same running process. An in-memory Map is invisible across instances,
// which makes verification intermittently fail with "no OTP was requested"
// even when the OTP was just sent correctly. Storing it in Mongo instead makes
// every instance see the same record.
//
// `purpose` keeps different guest OTP flows from colliding with each other even
// if the same email is mid-flow on two of them at once (e.g. checking out again
// while also requesting a cancellation). `orderNumber` scopes the 'guest-cancel'
// purpose to one specific order; it is null for purposes that aren't order-bound
// (e.g. 'guest-checkout').
const guestOtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    purpose: { type: String, required: true, enum: ['guest-checkout', 'guest-cancel'] },
    orderNumber: { type: String, default: null },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index — Mongo reaps the document itself once expiresAt passes, so there's
// no manual cleanup step and no risk of stale entries piling up.
guestOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Lookup path used by both "send" (upsert) and "verify".
guestOtpSchema.index({ email: 1, purpose: 1, orderNumber: 1 });

const GuestOtp = mongoose.model('GuestOtp', guestOtpSchema);
export default GuestOtp;
