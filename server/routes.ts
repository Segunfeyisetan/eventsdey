import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireRole, csrfProtection } from "./auth";
import passport from "passport";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { insertUserSchema, loginSchema, insertVenueSchema, insertHallSchema, insertBookingSchema, insertReviewSchema, insertMessageSchema, updateProfileSchema, updatePreferencesSchema } from "@shared/schema";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { message: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);

  registerObjectStorageRoutes(app);

  app.use("/api/", apiLimiter);
  app.use("/api/", csrfProtection);

  // === AUTH ===
  app.post("/api/auth/register", authLimiter, async (req: Request, res: Response) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const pw = data.password;
      if (!pw || pw.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });
      if (!/[a-z]/.test(pw)) return res.status(400).json({ message: "Password must contain at least one lowercase letter" });
      if (!/[A-Z]/.test(pw)) return res.status(400).json({ message: "Password must contain at least one uppercase letter" });
      if (!/[^a-zA-Z0-9]/.test(pw)) return res.status(400).json({ message: "Password must contain at least one symbol" });
      const existing = await storage.getUserByEmail(data.email);
      if (existing) return res.status(400).json({ message: "Email already registered" });
      const approved = data.role !== "venue_holder";
      const user = await storage.createUser({ ...data, password: data.password, approved });
      req.session.regenerate((regErr) => {
        if (regErr) return res.status(500).json({ message: "Session error" });
        req.login(user, (err) => {
          if (err) return res.status(500).json({ message: "Login failed" });
          const { passwordHash, ...safe } = user;
          return res.json(safe);
        });
      });
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/auth/login", authLimiter, (req: Request, res: Response, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });
      req.session.regenerate((regErr) => {
        if (regErr) return next(regErr);
        req.login(user, (loginErr) => {
          if (loginErr) return next(loginErr);
          const { passwordHash, ...safe } = user;
          return res.json(safe);
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout(() => {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Logout failed" });
        }
        res.clearCookie("sid");
        res.json({ message: "Logged out" });
      });
    });
  });

  app.post("/api/auth/change-password", requireAuth, async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) return res.status(400).json({ message: "Current password and new password are required" });
      if (newPassword.length < 8) return res.status(400).json({ message: "New password must be at least 8 characters" });
      if (!/[a-z]/.test(newPassword)) return res.status(400).json({ message: "New password must contain at least one lowercase letter" });
      if (!/[A-Z]/.test(newPassword)) return res.status(400).json({ message: "New password must contain at least one uppercase letter" });
      if (!/[^a-zA-Z0-9]/.test(newPassword)) return res.status(400).json({ message: "New password must contain at least one symbol" });

      const user = await storage.getUser(req.user!.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (!user.passwordHash) return res.status(400).json({ message: "Cannot change password for social login accounts" });

      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return res.status(401).json({ message: "Current password is incorrect" });

      const newHash = await bcrypt.hash(newPassword, 10);
      await storage.updatePassword(user.id, newHash);
      res.json({ message: "Password updated successfully" });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const { passwordHash, ...safe } = req.user!;
    res.json(safe);
  });

  function getGoogleMapsKey(): string {
    let key = (process.env.GOOGLE_MAPS_API_KEY || "").trim();
    if (key.startsWith("AIza") && key.length > 45) {
      const idx = key.indexOf("AIza", 4);
      if (idx > 0) {
        key = key.substring(0, idx);
      }
    }
    return key;
  }

  // === DASHBOARD ===
  app.get("/api/dashboard", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = await storage.getDashboardData(req.user!.id);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // === VENUES (Public) ===
  app.get("/api/venues", async (req: Request, res: Response) => {
    const filters = {
      city: req.query.city as string | undefined,
      type: req.query.type as string | undefined,
      search: req.query.search as string | undefined,
      featured: req.query.featured === "true",
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      minCapacity: req.query.minCapacity ? Number(req.query.minCapacity) : undefined,
      lat: req.query.lat ? Number(req.query.lat) : undefined,
      lng: req.query.lng ? Number(req.query.lng) : undefined,
    };
    const venueList = await storage.getVenues(filters);
    res.json(venueList);
  });

  app.get("/api/geocode", async (req: Request, res: Response) => {
    const address = req.query.address as string;
    if (!address) return res.status(400).json({ message: "Address is required" });
    const apiKey = getGoogleMapsKey();
    if (!apiKey) return res.status(500).json({ message: "Google Maps API key not configured" });
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&components=country:NG&key=${apiKey}`
      );
      const data = await response.json() as any;
      if (data.status === "OK" && data.results.length > 0) {
        const loc = data.results[0].geometry.location;
        const formatted = data.results[0].formatted_address;
        res.json({ lat: loc.lat, lng: loc.lng, formattedAddress: formatted });
      } else {
        res.json({ lat: null, lng: null, formattedAddress: null });
      }
    } catch (err) {
      res.status(500).json({ message: "Geocoding failed" });
    }
  });

  app.get("/api/maps-key", (_req: Request, res: Response) => {
    res.json({ key: getGoogleMapsKey() });
  });

  app.get("/api/venues/availability-summary", async (req: Request, res: Response) => {
    try {
      const summary = await storage.getVenueAvailabilitySummary();
      res.json(summary);
    } catch (err) {
      res.status(500).json({ message: "Failed to get availability summary" });
    }
  });

  app.get("/api/venues/:id", async (req: Request, res: Response) => {
    const venue = await storage.getVenue(req.params.id as string);
    if (!venue) return res.status(404).json({ message: "Venue not found" });
    res.json(venue);
  });

  app.post("/api/venues", requireRole("admin", "venue_holder"), async (req: Request, res: Response) => {
    try {
      if (req.user!.role === "venue_holder" && !req.user!.approved) {
        return res.status(403).json({ message: "Your account is pending admin approval. You cannot list venues yet." });
      }
      const data = insertVenueSchema.parse(req.body);
      if (req.user!.role === "venue_holder") {
        data.ownerUserId = req.user!.id;
      }
      if (req.user!.role === "admin") {
        data.createdByAdmin = true;
      }
      if (!data.lat && !data.lng && data.address && data.city) {
        try {
          const geoRes = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(data.address + ", " + data.city + ", Nigeria")}&key=${getGoogleMapsKey()}`
          );
          const geoData = await geoRes.json() as any;
          if (geoData.status === "OK" && geoData.results[0]) {
            data.lat = geoData.results[0].geometry.location.lat;
            data.lng = geoData.results[0].geometry.location.lng;
          }
        } catch {}
      }
      const venue = await storage.createVenue(data);
      res.status(201).json(venue);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/venues/:id", requireRole("admin", "venue_holder"), async (req: Request, res: Response) => {
    const venue = await storage.getVenue(req.params.id as string);
    if (!venue) return res.status(404).json({ message: "Venue not found" });
    if (req.user!.role === "venue_holder" && venue.ownerUserId !== req.user!.id) {
      return res.status(403).json({ message: "Not your venue" });
    }
    const allowedFields = ["title", "description", "address", "city", "state", "lat", "lng", "imageUrl", "type", "instantBook"];
    if (req.user!.role === "admin") {
      allowedFields.push("verified", "featured", "status", "ownerUserId", "createdByAdmin");
    }
    const sanitized: Record<string, any> = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) sanitized[key] = req.body[key];
    }
    const updated = await storage.updateVenue(req.params.id as string, sanitized);
    res.json(updated);
  });

  app.delete("/api/venues/:id", requireRole("admin", "venue_holder"), async (req: Request, res: Response) => {
    const venue = await storage.getVenue(req.params.id as string);
    if (!venue) return res.status(404).json({ message: "Venue not found" });
    if (req.user!.role === "venue_holder" && venue.ownerUserId !== req.user!.id) {
      return res.status(403).json({ message: "Not your venue" });
    }
    await storage.deleteVenue(req.params.id as string);
    res.json({ message: "Deleted" });
  });

  // === MY VENUES (Owner) ===
  app.get("/api/my-venues", requireRole("admin", "venue_holder"), async (req: Request, res: Response) => {
    const venueList = await storage.getVenuesByOwner(req.user!.id);
    res.json(venueList);
  });

  // === OWNER BOOKINGS ===
  app.get("/api/owner/bookings", requireRole("admin", "venue_holder"), async (req: Request, res: Response) => {
    const bookingList = await storage.getBookingsForOwner(req.user!.id);
    res.json(bookingList);
  });

  app.get("/api/owner/revenue", requireRole("admin", "venue_holder"), async (req: Request, res: Response) => {
    const filters = {
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      hallId: req.query.hallId as string | undefined,
      venueId: req.query.venueId as string | undefined,
    };
    const revenue = await storage.getOwnerRevenue(req.user!.id, filters);
    res.json(revenue);
  });

  // === HALLS ===
  app.get("/api/venues/:venueId/halls", async (req: Request, res: Response) => {
    const hallList = await storage.getHallsByVenue(req.params.venueId as string);
    res.json(hallList);
  });

  app.post("/api/venues/:venueId/halls", requireRole("admin", "venue_holder"), async (req: Request, res: Response) => {
    try {
      const venue = await storage.getVenue(req.params.venueId as string);
      if (!venue) return res.status(404).json({ message: "Venue not found" });
      if (req.user!.role === "venue_holder" && venue.ownerUserId !== req.user!.id) {
        return res.status(403).json({ message: "Not your venue" });
      }
      const data = insertHallSchema.parse({ ...req.body, venueId: req.params.venueId as string });
      const hall = await storage.createHall(data);
      res.status(201).json(hall);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/halls/:id", requireRole("admin", "venue_holder"), async (req: Request, res: Response) => {
    const existingHall = await storage.getHall(req.params.id as string);
    if (!existingHall) return res.status(404).json({ message: "Hall not found" });
    if (req.user!.role === "venue_holder") {
      const venue = await storage.getVenue(existingHall.venueId);
      if (!venue || venue.ownerUserId !== req.user!.id) {
        return res.status(403).json({ message: "Not your venue" });
      }
    }
    const allowedFields = ["name", "description", "capacity", "price", "depositPercentage", "balanceDueDays", "imageUrl", "amenities"];
    const sanitized: Record<string, any> = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) sanitized[key] = req.body[key];
    }
    const updated = await storage.updateHall(req.params.id as string, sanitized);
    if (!updated) return res.status(404).json({ message: "Hall not found" });
    res.json(updated);
  });

  app.delete("/api/halls/:id", requireRole("admin", "venue_holder"), async (req: Request, res: Response) => {
    const existingHall = await storage.getHall(req.params.id as string);
    if (!existingHall) return res.status(404).json({ message: "Hall not found" });
    if (req.user!.role === "venue_holder") {
      const venue = await storage.getVenue(existingHall.venueId);
      if (!venue || venue.ownerUserId !== req.user!.id) {
        return res.status(403).json({ message: "Not your venue" });
      }
    }
    await storage.deleteHall(req.params.id as string);
    res.json({ message: "Deleted" });
  });

  // === BOOKINGS ===
  app.get("/api/bookings", requireAuth, async (req: Request, res: Response) => {
    const bookingList = await storage.getBookings(req.user!.id);
    res.json(bookingList);
  });

  app.get("/api/bookings/:id", requireAuth, async (req: Request, res: Response) => {
    const booking = await storage.getBooking(req.params.id as string);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (req.user!.role === "planner" && booking.plannerUserId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized" });
    }
    if (req.user!.role === "venue_holder") {
      const venue = await storage.getVenue(booking.venueId);
      if (!venue || venue.ownerUserId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
    }
    res.json(booking);
  });

  app.post("/api/bookings", requireAuth, async (req: Request, res: Response) => {
    try {
      const hall = await storage.getHall(req.body.hallId);
      if (!hall) return res.status(404).json({ message: "Hall not found" });

      const totalAmount = req.body.totalAmount || hall.price;
      const depositPct = hall.depositPercentage ?? 100;
      const depositAmount = Math.round(totalAmount * depositPct / 100);
      const balanceAmount = totalAmount - depositAmount;

      const bodyWithDates = {
        ...req.body,
        plannerUserId: req.user!.id,
        totalAmount,
        depositAmount,
        balanceAmount,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      };
      const data = insertBookingSchema.parse(bodyWithDates);
      const booking = await storage.createBooking(data);

      const venue = await storage.getVenue(req.body.venueId);
      if (venue?.ownerUserId) {
        const eventDate = new Date(req.body.startDate).toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        const guestInfo = req.body.guests ? ` for ${req.body.guests} guests` : "";
        const messageBody = `New booking request! ${req.user!.name} has requested to book ${hall.name} at ${venue.title} on ${eventDate}${guestInfo}. Please review and approve or decline this booking.`;
        await storage.createMessage({
          bookingId: booking.id,
          fromUserId: req.user!.id,
          toUserId: venue.ownerUserId,
          body: messageBody,
        });
        await storage.createNotification({
          userId: venue.ownerUserId,
          type: "booking_request",
          title: "New Booking Request",
          body: `${req.user!.name} wants to book ${hall.name} at ${venue.title} on ${eventDate}`,
          linkUrl: "/owner/bookings",
        });
      }

      res.status(201).json(booking);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/bookings/:id/status", requireAuth, async (req: Request, res: Response) => {
    const { status, cancellationReason } = req.body;
    const booking = await storage.getBooking(req.params.id as string);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const validStatuses = ["requested", "accepted", "paid", "confirmed", "completed", "cancelled", "cancellation_requested"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (req.user!.role === "venue_holder") {
      const venue = await storage.getVenue(booking.venueId);
      if (!venue || venue.ownerUserId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const ownerAllowed = ["accepted", "cancelled", "confirmed", "completed"];
      if (!ownerAllowed.includes(status)) {
        return res.status(400).json({ message: "Invalid status transition for venue owner" });
      }
    } else if (req.user!.role === "planner") {
      if (booking.plannerUserId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const plannerAllowed = ["cancelled", "cancellation_requested"];
      if (!plannerAllowed.includes(status)) {
        return res.status(400).json({ message: "Invalid status transition for planner" });
      }
      const paidStatuses = ["paid", "confirmed", "completed"];
      if (status === "cancelled" && paidStatuses.includes(booking.status)) {
        return res.status(400).json({ message: "Cannot cancel directly after payment. Please request cancellation instead." });
      }
      if (status === "cancellation_requested" && !paidStatuses.includes(booking.status) && booking.status !== "accepted") {
        return res.status(400).json({ message: "Cancellation request is only needed after the booking has been accepted or paid." });
      }
    }

    const updateData: any = { status };
    if (cancellationReason) {
      updateData.cancellationReason = cancellationReason;
    }
    if (status === "accepted") {
      updateData.acceptedAt = new Date();
    }
    const updated = await storage.updateBookingStatusWithData(req.params.id as string, updateData);
    if (!updated) return res.status(404).json({ message: "Booking not found" });

    const venue = await storage.getVenue(booking.venueId);
    const hall = booking.hall;
    const eventDate = new Date(booking.startDate).toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    if (status === "accepted") {
      const messageBody = `Great news! Your booking for ${hall.name} at ${venue?.title || "our venue"} on ${eventDate} has been approved. Please complete your payment within 24 hours to secure your reservation. If payment is not received by then, the booking will automatically expire.`;
      await storage.createMessage({
        bookingId: booking.id,
        fromUserId: req.user!.id,
        toUserId: booking.plannerUserId,
        body: messageBody,
      });
      await storage.createNotification({
        userId: booking.plannerUserId,
        type: "booking_accepted",
        title: "Booking Approved!",
        body: `Your booking for ${hall.name} at ${venue?.title || "venue"} on ${eventDate} has been approved. Pay within 24 hours to confirm.`,
        linkUrl: "/bookings",
      });

      const conflicting = await storage.getConflictingPendingBookings(
        booking.hallId,
        new Date(booking.startDate),
        booking.endDate ? new Date(booking.endDate) : null,
        booking.id
      );
      for (const cb of conflicting) {
        const cbDate = new Date(cb.startDate).toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        await storage.updateBookingStatusWithData(cb.id, {
          status: "cancelled",
          cancellationReason: "Another booking for this date has been accepted by the venue owner.",
        });
        await storage.createNotification({
          userId: cb.plannerUserId,
          type: "booking_cancelled",
          title: "Booking Declined",
          body: `Your booking request for ${hall.name} at ${venue?.title || "venue"} on ${cbDate} has been declined because another booking for the same date was accepted.`,
          linkUrl: "/bookings",
        });
        await storage.createMessage({
          bookingId: cb.id,
          fromUserId: req.user!.id,
          toUserId: cb.plannerUserId,
          body: `We're sorry, but your booking request for ${hall.name} at ${venue?.title || "our venue"} on ${cbDate} has been declined. Another booking for the same date has been accepted. Please feel free to choose a different date.`,
        });
      }
    } else if (status === "paid") {
      if (venue?.ownerUserId) {
        const paymentMsg = `Payment received! ${booking.plannerUserId === req.user!.id ? req.user!.name : "The planner"} has completed payment for ${hall.name} at ${venue.title} on ${eventDate}. Please confirm the booking to finalise.`;
        await storage.createMessage({
          bookingId: booking.id,
          fromUserId: req.user!.id,
          toUserId: venue.ownerUserId,
          body: paymentMsg,
        });
        await storage.createNotification({
          userId: venue.ownerUserId,
          type: "booking_request",
          title: "Payment Received",
          body: `Payment completed for ${hall.name} on ${eventDate}. Please confirm the booking.`,
          linkUrl: "/owner/bookings",
        });
      }
      await storage.createNotification({
        userId: booking.plannerUserId,
        type: "booking_accepted",
        title: "Payment Successful",
        body: `Your payment for ${hall.name} at ${venue?.title || "venue"} on ${eventDate} was successful. Awaiting venue confirmation.`,
        linkUrl: "/bookings",
      });
    } else if (status === "confirmed") {
      const confirmMsg = `Your booking for ${hall.name} at ${venue?.title || "our venue"} on ${eventDate} is now confirmed! Everything is set for your event. We look forward to hosting you.`;
      await storage.createMessage({
        bookingId: booking.id,
        fromUserId: req.user!.id,
        toUserId: booking.plannerUserId,
        body: confirmMsg,
      });
      await storage.createNotification({
        userId: booking.plannerUserId,
        type: "booking_accepted",
        title: "Booking Confirmed!",
        body: `Your booking for ${hall.name} at ${venue?.title || "venue"} on ${eventDate} is now confirmed!`,
        linkUrl: "/bookings",
      });
    } else if (status === "cancelled") {
      const targetUserId = req.user!.role === "planner" ? (venue?.ownerUserId || "") : booking.plannerUserId;
      if (targetUserId) {
        await storage.createNotification({
          userId: targetUserId,
          type: "booking_cancelled",
          title: "Booking Cancelled",
          body: `Booking for ${hall.name} at ${venue?.title || "venue"} on ${eventDate} has been cancelled.${cancellationReason ? ` Reason: ${cancellationReason}` : ""}`,
          linkUrl: req.user!.role === "planner" ? "/owner/bookings" : "/bookings",
        });
      }
    } else if (status === "cancellation_requested") {
      if (venue?.ownerUserId) {
        const cancelReqMsg = `${req.user!.name} has requested to cancel their booking for ${hall.name} at ${venue.title} on ${eventDate}.${cancellationReason ? ` Reason: ${cancellationReason}` : ""} Please review and approve or decline the cancellation.`;
        await storage.createMessage({
          bookingId: booking.id,
          fromUserId: req.user!.id,
          toUserId: venue.ownerUserId,
          body: cancelReqMsg,
        });
        await storage.createNotification({
          userId: venue.ownerUserId,
          type: "booking_cancelled",
          title: "Cancellation Requested",
          body: `${req.user!.name} has requested to cancel their booking for ${hall.name} on ${eventDate}.`,
          linkUrl: "/owner/bookings",
        });
      }
    } else if (status === "completed") {
      await storage.createNotification({
        userId: booking.plannerUserId,
        type: "booking_completed",
        title: "Event Completed",
        body: `Your event at ${hall.name} (${venue?.title || "venue"}) has been marked as completed. You can now leave a review!`,
        linkUrl: `/venue/${booking.venueId}`,
      });
    }

    res.json(updated);
  });

  // === REVIEWS ===
  app.get("/api/venues/:venueId/reviews", async (req: Request, res: Response) => {
    const reviewList = await storage.getReviewsByVenue(req.params.venueId as string);
    res.json(reviewList);
  });

  app.post("/api/reviews", requireAuth, async (req: Request, res: Response) => {
    try {
      const rating = Number(req.body.rating);
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5 stars" });
      }

      if (!req.body.bookingId) {
        return res.status(400).json({ message: "A booking reference is required to leave a review" });
      }

      const booking = await storage.getBooking(req.body.bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      if (booking.plannerUserId !== req.user!.id) {
        return res.status(403).json({ message: "You can only review your own bookings" });
      }
      if (booking.status !== "completed") {
        return res.status(400).json({ message: "You can only review after your event is completed" });
      }

      const existingReviews = await storage.getReviewsByVenue(booking.venueId);
      const alreadyReviewed = existingReviews.some(r => r.bookingId === booking.id && r.plannerUserId === req.user!.id);
      if (alreadyReviewed) {
        return res.status(400).json({ message: "You have already reviewed this booking" });
      }

      const data = insertReviewSchema.parse({
        venueId: booking.venueId,
        bookingId: booking.id,
        plannerUserId: req.user!.id,
        rating,
        comment: req.body.comment || null,
      });
      const review = await storage.createReview(data);

      const reviewVenue = await storage.getVenue(booking.venueId);
      if (reviewVenue?.ownerUserId) {
        await storage.createNotification({
          userId: reviewVenue.ownerUserId,
          type: "new_review",
          title: "New Review",
          body: `${req.user!.name} left a ${rating}-star review for ${reviewVenue.title}`,
          linkUrl: `/venue/${reviewVenue.id}`,
        });
      }

      res.status(201).json(review);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/reviews/:reviewId/response", requireAuth, requireRole("venue_holder"), async (req: Request, res: Response) => {
    try {
      const { response } = req.body;
      if (!response || typeof response !== "string" || response.trim().length === 0) {
        return res.status(400).json({ message: "Response text is required" });
      }
      const updated = await storage.addOwnerResponse(req.params.reviewId as string, req.user!.id, response.trim());
      if (!updated) {
        return res.status(404).json({ message: "Review not found or you are not the venue owner" });
      }
      await storage.createNotification({
        userId: updated.plannerUserId,
        type: "review_response",
        title: "Owner Responded to Your Review",
        body: `The venue owner responded to your review.`,
        linkUrl: `/venue/${updated.venueId}`,
      });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // === MESSAGES ===
  app.get("/api/messages", requireAuth, async (req: Request, res: Response) => {
    const msgs = await storage.getMessages(req.user!.id);
    res.json(msgs);
  });

  app.get("/api/messages/:otherUserId", requireAuth, async (req: Request, res: Response) => {
    const msgs = await storage.getConversation(req.user!.id, req.params.otherUserId as string);
    res.json(msgs);
  });

  app.post("/api/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = insertMessageSchema.parse({
        ...req.body,
        fromUserId: req.user!.id,
      });
      const msg = await storage.createMessage(data);
      await storage.createNotification({
        userId: data.toUserId,
        type: "new_message",
        title: "New Message",
        body: `${req.user!.name} sent you a message`,
        linkUrl: "/messages",
      });
      res.status(201).json(msg);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // === ADMIN ===
  app.get("/api/admin/stats", requireRole("admin"), async (req: Request, res: Response) => {
    const stats = await storage.getAdminStats();
    res.json(stats);
  });

  app.get("/api/admin/users", requireRole("admin"), async (req: Request, res: Response) => {
    const userList = await storage.getAllUsers();
    res.json(userList);
  });

  app.patch("/api/admin/users/:id", requireRole("admin"), async (req: Request, res: Response) => {
    const { role, suspended, approved } = req.body;
    if (req.params.id === req.user!.id) {
      return res.status(400).json({ message: "Cannot modify your own account" });
    }
    const updated = await storage.updateUser(req.params.id as string, { role, suspended, approved });
    if (!updated) return res.status(404).json({ message: "User not found" });
    const { passwordHash, ...safe } = updated;
    res.json(safe);
  });

  app.get("/api/admin/venues", requireRole("admin"), async (req: Request, res: Response) => {
    const venueList = await storage.getAllVenuesAdmin();
    res.json(venueList);
  });

  app.patch("/api/admin/venues/:id", requireRole("admin"), async (req: Request, res: Response) => {
    const { verified, featured, status } = req.body;
    const updateData: any = {};
    if (verified !== undefined) updateData.verified = verified;
    if (featured !== undefined) updateData.featured = featured;
    if (status !== undefined) updateData.status = status;
    const updated = await storage.updateVenue(req.params.id as string, updateData);
    if (!updated) return res.status(404).json({ message: "Venue not found" });
    res.json(updated);
  });

  app.get("/api/admin/bookings", requireRole("admin"), async (req: Request, res: Response) => {
    const bookingList = await storage.getAllBookingsAdmin();
    res.json(bookingList);
  });

  app.get("/api/admin/reviews", requireRole("admin"), async (req: Request, res: Response) => {
    const reviewList = await storage.getAllReviewsAdmin();
    res.json(reviewList);
  });

  app.delete("/api/admin/reviews/:id", requireRole("admin"), async (req: Request, res: Response) => {
    await storage.deleteReview(req.params.id as string);
    res.json({ message: "Review deleted" });
  });

  // === ADMIN REPORTS ===
  app.get("/api/admin/reports", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      const reports = await storage.getAdminReports({
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
      });
      res.json(reports);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to generate reports" });
    }
  });

  // === OWNER REPORTS ===
  app.get("/api/owner/reports", requireAuth, requireRole("admin", "venue_holder"), async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, venueId } = req.query;
      const reports = await storage.getOwnerReports(req.user!.id, {
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        venueId: venueId as string | undefined,
      });
      res.json(reports);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to generate reports" });
    }
  });

  // === HALL AVAILABILITY ===
  app.get("/api/halls/:hallId/availability", async (req: Request, res: Response) => {
    const hallId = req.params.hallId as string;
    const hall = await storage.getHall(hallId);
    if (!hall) return res.status(404).json({ message: "Hall not found" });

    const [bookedDates, blockedDates] = await Promise.all([
      storage.getHallBookedDates(hallId),
      storage.getHallBlockedDates(hallId),
    ]);

    res.json({
      hallId,
      bookedDates,
      blockedDates: blockedDates.map(bd => ({
        id: bd.id,
        date: new Date(bd.date).toISOString().split("T")[0],
        reason: bd.reason,
      })),
    });
  });

  app.post("/api/halls/:hallId/block-date", requireRole("admin", "venue_holder"), async (req: Request, res: Response) => {
    try {
      const hallId = req.params.hallId as string;
      const hall = await storage.getHall(hallId);
      if (!hall) return res.status(404).json({ message: "Hall not found" });

      if (req.user!.role === "venue_holder") {
        const venue = await storage.getVenue(hall.venueId);
        if (!venue || venue.ownerUserId !== req.user!.id) {
          return res.status(403).json({ message: "Not your venue" });
        }
      }

      const { date, reason } = req.body;
      if (!date) return res.status(400).json({ message: "Date is required" });

      const blocked = await storage.addHallBlockedDate({
        hallId,
        date: new Date(date),
        reason: reason || null,
      });
      res.status(201).json(blocked);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/halls/blocked-dates/:id", requireRole("admin", "venue_holder"), async (req: Request, res: Response) => {
    if (req.user!.role === "venue_holder") {
      const blockedDate = await storage.getBlockedDate(req.params.id as string);
      if (!blockedDate) return res.status(404).json({ message: "Blocked date not found" });
      const hall = await storage.getHall(blockedDate.hallId);
      if (!hall) return res.status(404).json({ message: "Hall not found" });
      const venue = await storage.getVenue(hall.venueId);
      if (!venue || venue.ownerUserId !== req.user!.id) {
        return res.status(403).json({ message: "Not your venue" });
      }
    }
    await storage.removeHallBlockedDate(req.params.id as string);
    res.json({ message: "Date unblocked" });
  });

  // === FAVORITES ===
  app.get("/api/favorites", requireAuth, async (req: Request, res: Response) => {
    const favs = await storage.getFavorites(req.user!.id);
    res.json(favs);
  });

  app.post("/api/favorites/:venueId", requireAuth, async (req: Request, res: Response) => {
    const isFav = await storage.isFavorite(req.user!.id, req.params.venueId as string);
    if (isFav) {
      await storage.removeFavorite(req.user!.id, req.params.venueId as string);
      return res.json({ favorited: false });
    }
    await storage.addFavorite(req.user!.id, req.params.venueId as string);
    res.json({ favorited: true });
  });

  // === PROFILE UPDATE ===
  app.put("/api/auth/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = updateProfileSchema.parse(req.body);
      if (data.email && data.email !== req.user!.email) {
        const existing = await storage.getUserByEmail(data.email);
        if (existing && existing.id !== req.user!.id) {
          return res.status(400).json({ message: "Email already in use by another account" });
        }
      }
      const updated = await storage.updateProfile(req.user!.id, data);
      if (!updated) return res.status(404).json({ message: "User not found" });
      const { passwordHash, ...safe } = updated;
      res.json(safe);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // === NOTIFICATIONS ===
  app.get("/api/notifications", requireAuth, async (req: Request, res: Response) => {
    const notifs = await storage.getNotifications(req.user!.id);
    res.json(notifs);
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req: Request, res: Response) => {
    const count = await storage.getUnreadNotificationCount(req.user!.id);
    res.json({ count });
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req: Request, res: Response) => {
    await storage.markNotificationRead(req.params.id as string, req.user!.id);
    res.json({ message: "Marked as read" });
  });

  app.post("/api/notifications/read-all", requireAuth, async (req: Request, res: Response) => {
    await storage.markAllNotificationsRead(req.user!.id);
    res.json({ message: "All notifications marked as read" });
  });

  // === USER PREFERENCES ===
  app.get("/api/preferences", requireAuth, async (req: Request, res: Response) => {
    const prefs = await storage.getUserPreferences(req.user!.id);
    res.json(prefs || {
      defaultCity: null,
      theme: "light",
      emailBookingUpdates: true,
      emailMessages: true,
      emailReviews: true,
      emailPromotions: false,
      emailExpiry: true,
    });
  });

  app.put("/api/preferences", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = updatePreferencesSchema.parse(req.body);
      const prefs = await storage.upsertUserPreferences(req.user!.id, data);
      res.json(prefs);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // === SITE SETTINGS ===
  app.get("/api/site-settings/:key", async (req: Request, res: Response) => {
    const key = req.params.key as string;
    const value = await storage.getSiteSetting(key);
    res.json({ key, value: value || null });
  });

  app.put("/api/site-settings/:key", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    const key = req.params.key as string;
    const { value } = req.body;
    if (typeof value !== "string") {
      return res.status(400).json({ message: "Value is required" });
    }
    await storage.setSiteSetting(key, value);
    res.json({ key, value });
  });

  // === CONTACT SUPPORT ===
  app.post("/api/support/contact", requireAuth, async (req: Request, res: Response) => {
    try {
      const { subject, message } = req.body;
      if (!subject || !message) {
        return res.status(400).json({ message: "Subject and message are required" });
      }
      const admins = await storage.getAllUsers();
      const adminUser = admins.find(u => u.role === "admin");
      if (adminUser) {
        await storage.createMessage({
          fromUserId: req.user!.id,
          toUserId: adminUser.id,
          body: `[Support Request: ${subject}]\n\n${message}`,
        });
        await storage.createNotification({
          userId: adminUser.id,
          type: "system",
          title: "New Support Request",
          body: `${req.user!.name} submitted a support request: ${subject}`,
          linkUrl: "/messages",
        });
      }
      res.json({ message: "Your message has been sent to our support team. We'll get back to you soon." });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to send support message" });
    }
  });

  return httpServer;
}
