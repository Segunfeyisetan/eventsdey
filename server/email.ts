import { log } from "./index";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmailViaResend(options: EmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Eventsdey Nigeria <noreply@eventsdey.com>",
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      log(`Resend API error: ${errorData}`, "email");
      return false;
    }

    log(`Email sent to ${options.to}: ${options.subject}`, "email");
    return true;
  } catch (error) {
    log(`Failed to send email: ${error}`, "email");
    return false;
  }
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (process.env.RESEND_API_KEY) {
    return sendEmailViaResend(options);
  }

  log(`[EMAIL QUEUED] To: ${options.to} | Subject: ${options.subject}`, "email");
  log(`[EMAIL BODY] ${options.html.replace(/<[^>]*>/g, ' ').substring(0, 200)}...`, "email");
  return true;
}

export function buildBookingExpiryWarningEmail(params: {
  plannerName: string;
  venueName: string;
  hallName: string;
  bookingDate: string;
  expiryTime: string;
}): { subject: string; html: string } {
  return {
    subject: `Action Required: Your booking at ${params.venueName} expires soon`,
    html: `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #111112; color: #ffffff; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #D4AF37; font-family: 'Playfair Display', Georgia, serif; margin: 0;">Eventsdey Nigeria</h1>
        </div>
        <h2 style="color: #D4AF37; margin-top: 0;">Booking Expiry Warning</h2>
        <p>Dear ${params.plannerName},</p>
        <p>Your booking at <strong style="color: #D4AF37;">${params.venueName} - ${params.hallName}</strong> for <strong>${params.bookingDate}</strong> has been accepted but payment has not been received.</p>
        <p>This booking will <strong style="color: #ef4444;">automatically expire at ${params.expiryTime}</strong> if payment is not completed.</p>
        <p>Please log in to complete your payment to secure your booking.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${process.env.APP_URL || 'https://eventsdey.com'}/bookings" style="background: #D4AF37; color: #111112; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Complete Payment</a>
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 32px;">This is an automated message from Eventsdey Nigeria.</p>
      </div>
    `,
  };
}

export function buildBookingExpiryOwnerEmail(params: {
  ownerName: string;
  plannerName: string;
  venueName: string;
  hallName: string;
  bookingDate: string;
  expiryTime: string;
}): { subject: string; html: string } {
  return {
    subject: `Booking expiry notice: ${params.venueName} - ${params.hallName}`,
    html: `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #111112; color: #ffffff; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #D4AF37; font-family: 'Playfair Display', Georgia, serif; margin: 0;">Eventsdey Nigeria</h1>
        </div>
        <h2 style="color: #D4AF37; margin-top: 0;">Booking Expiry Notice</h2>
        <p>Dear ${params.ownerName},</p>
        <p>A booking by <strong style="color: #D4AF37;">${params.plannerName}</strong> for <strong>${params.venueName} - ${params.hallName}</strong> on <strong>${params.bookingDate}</strong> is about to expire due to non-payment.</p>
        <p>The booking will <strong style="color: #ef4444;">automatically expire at ${params.expiryTime}</strong>.</p>
        <p>The hall date will become available again after expiry.</p>
        <p style="color: #888; font-size: 12px; margin-top: 32px;">This is an automated message from Eventsdey Nigeria.</p>
      </div>
    `,
  };
}

export function buildBookingExpiredPlannerEmail(params: {
  plannerName: string;
  venueName: string;
  hallName: string;
  bookingDate: string;
}): { subject: string; html: string } {
  return {
    subject: `Booking expired: ${params.venueName} - ${params.hallName}`,
    html: `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #111112; color: #ffffff; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #D4AF37; font-family: 'Playfair Display', Georgia, serif; margin: 0;">Eventsdey Nigeria</h1>
        </div>
        <h2 style="color: #D4AF37; margin-top: 0;">Booking Expired</h2>
        <p>Dear ${params.plannerName},</p>
        <p>Your booking at <strong style="color: #D4AF37;">${params.venueName} - ${params.hallName}</strong> for <strong>${params.bookingDate}</strong> has expired due to non-payment.</p>
        <p>If you're still interested, you can make a new booking request through the platform.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${process.env.APP_URL || 'https://eventsdey.com'}/search" style="background: #D4AF37; color: #111112; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Browse Venues</a>
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 32px;">This is an automated message from Eventsdey Nigeria.</p>
      </div>
    `,
  };
}

export function buildBookingExpiredOwnerEmail(params: {
  ownerName: string;
  plannerName: string;
  venueName: string;
  hallName: string;
  bookingDate: string;
}): { subject: string; html: string } {
  return {
    subject: `Booking expired: ${params.venueName} - ${params.hallName}`,
    html: `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #111112; color: #ffffff; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #D4AF37; font-family: 'Playfair Display', Georgia, serif; margin: 0;">Eventsdey Nigeria</h1>
        </div>
        <h2 style="color: #D4AF37; margin-top: 0;">Booking Expired</h2>
        <p>Dear ${params.ownerName},</p>
        <p>The booking by <strong style="color: #D4AF37;">${params.plannerName}</strong> for <strong>${params.venueName} - ${params.hallName}</strong> on <strong>${params.bookingDate}</strong> has expired due to non-payment.</p>
        <p>The hall date is now available for new bookings.</p>
        <p style="color: #888; font-size: 12px; margin-top: 32px;">This is an automated message from Eventsdey Nigeria.</p>
      </div>
    `,
  };
}
