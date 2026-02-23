import { storage } from "./storage";
import { log } from "./index";
import {
  sendEmail,
  buildBookingExpiryWarningEmail,
  buildBookingExpiryOwnerEmail,
  buildBookingExpiredPlannerEmail,
  buildBookingExpiredOwnerEmail,
} from "./email";
import { format } from "date-fns";

function get24HoursAfter(date: Date): Date {
  const expiry = new Date(date);
  expiry.setTime(expiry.getTime() + 24 * 60 * 60 * 1000);
  return expiry;
}

function formatBookingDate(date: Date | string): string {
  return format(new Date(date), "MMMM d, yyyy");
}

async function sendExpiryWarnings(): Promise<void> {
  try {
    const acceptedBookings = await storage.getAcceptedUnpaidBookings();
    const now = new Date();

    for (const booking of acceptedBookings) {
      if (!booking.acceptedAt) continue;
      if (booking.expiryNotificationSent) continue;

      const expiryDate = get24HoursAfter(new Date(booking.acceptedAt));
      const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilExpiry <= 6 && hoursUntilExpiry > 0) {
        const expiryTimeStr = format(expiryDate, "MMMM d, yyyy 'at' h:mm a");

        const plannerEmail = buildBookingExpiryWarningEmail({
          plannerName: booking.planner.name,
          venueName: booking.venue.title,
          hallName: booking.hall.name,
          bookingDate: formatBookingDate(booking.startDate),
          expiryTime: expiryTimeStr,
        });

        const ownerEmail = buildBookingExpiryOwnerEmail({
          ownerName: booking.owner.name,
          plannerName: booking.planner.name,
          venueName: booking.venue.title,
          hallName: booking.hall.name,
          bookingDate: formatBookingDate(booking.startDate),
          expiryTime: expiryTimeStr,
        });

        if (booking.planner.email) {
          await sendEmail({ to: booking.planner.email, ...plannerEmail });
        }
        if (booking.owner.email) {
          await sendEmail({ to: booking.owner.email, ...ownerEmail });
        }

        await storage.markExpiryNotificationSent(booking.id);
        log(`Expiry warning sent for booking ${booking.id} (expires at ${expiryTimeStr})`, "expiry");
      }
    }
  } catch (error) {
    log(`Error sending expiry warnings: ${error}`, "expiry");
  }
}

async function expireUnpaidBookings(): Promise<void> {
  try {
    const acceptedBookings = await storage.getAcceptedUnpaidBookings();
    const now = new Date();

    for (const booking of acceptedBookings) {
      if (!booking.acceptedAt) continue;

      const expiryDate = get24HoursAfter(new Date(booking.acceptedAt));

      if (now >= expiryDate) {
        await storage.updateBookingStatusWithData(booking.id, {
          status: "cancelled",
          cancellationReason: "Automatically expired: payment not received before deadline",
        });

        const plannerEmail = buildBookingExpiredPlannerEmail({
          plannerName: booking.planner.name,
          venueName: booking.venue.title,
          hallName: booking.hall.name,
          bookingDate: formatBookingDate(booking.startDate),
        });

        const ownerEmail = buildBookingExpiredOwnerEmail({
          ownerName: booking.owner.name,
          plannerName: booking.planner.name,
          venueName: booking.venue.title,
          hallName: booking.hall.name,
          bookingDate: formatBookingDate(booking.startDate),
        });

        if (booking.planner.email) {
          await sendEmail({ to: booking.planner.email, ...plannerEmail });
        }
        if (booking.owner.email) {
          await sendEmail({ to: booking.owner.email, ...ownerEmail });
        }

        log(`Booking ${booking.id} expired - payment not received by ${format(expiryDate, "MMMM d, yyyy 'at' h:mm a")}`, "expiry");
      }
    }
  } catch (error) {
    log(`Error expiring bookings: ${error}`, "expiry");
  }
}

export async function runBookingExpiryCheck(): Promise<void> {
  log("Running booking expiry check...", "expiry");
  await sendExpiryWarnings();
  await expireUnpaidBookings();
  log("Booking expiry check complete", "expiry");
}

let expiryInterval: NodeJS.Timeout | null = null;

export function startBookingExpiryScheduler(): void {
  runBookingExpiryCheck();

  expiryInterval = setInterval(() => {
    runBookingExpiryCheck();
  }, 15 * 60 * 1000);

  log("Booking expiry scheduler started (runs every 15 minutes)", "expiry");
}

export function stopBookingExpiryScheduler(): void {
  if (expiryInterval) {
    clearInterval(expiryInterval);
    expiryInterval = null;
    log("Booking expiry scheduler stopped", "expiry");
  }
}
