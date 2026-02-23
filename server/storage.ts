import { db } from "./db";
import { eq, and, not, ilike, sql, desc, gte, lte, inArray, count } from "drizzle-orm";
import {
  users, venues, halls, bookings, reviews, messages, favorites, hallBlockedDates,
  notifications, userPreferences, siteSettings,
  type User, type InsertUser, type Venue, type InsertVenue,
  type Hall, type InsertHall, type Booking, type InsertBooking,
  type Review, type InsertReview, type Message, type InsertMessage,
  type Favorite, type HallBlockedDate, type InsertHallBlockedDate,
  type Notification, type InsertNotification, type UserPreferences, type InsertUserPreferences,
} from "@shared/schema";
import bcrypt from "bcryptjs";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByFacebookId(facebookId: string): Promise<User | undefined>;
  getUserByAppleId(appleId: string): Promise<User | undefined>;
  createUser(user: InsertUser & { password: string; approved?: boolean }): Promise<User>;
  createOAuthUser(data: { name: string; email: string; googleId?: string; facebookId?: string; appleId?: string; avatarUrl?: string | null; role: string }): Promise<User>;
  linkOAuthProvider(userId: string, provider: "google" | "facebook" | "apple", providerId: string, avatarUrl?: string): Promise<User | undefined>;

  getVenues(filters?: { city?: string; type?: string; search?: string; featured?: boolean; minPrice?: number; maxPrice?: number; minCapacity?: number; lat?: number; lng?: number }): Promise<(Venue & { halls: Hall[]; rating: number; reviewCount: number; distance?: number })[]>;
  getVenuesByOwner(ownerId: string): Promise<(Venue & { halls: Hall[]; rating: number; reviewCount: number })[]>;
  getVenue(id: string): Promise<(Venue & { halls: Hall[]; rating: number; reviewCount: number }) | undefined>;
  createVenue(venue: InsertVenue): Promise<Venue>;
  updateVenue(id: string, data: Partial<InsertVenue>): Promise<Venue | undefined>;
  deleteVenue(id: string): Promise<void>;

  getHall(id: string): Promise<Hall | undefined>;
  createHall(hall: InsertHall): Promise<Hall>;
  updateHall(id: string, data: Partial<InsertHall>): Promise<Hall | undefined>;
  deleteHall(id: string): Promise<void>;
  getHallsByVenue(venueId: string): Promise<Hall[]>;

  getBookings(userId: string): Promise<(Booking & { venue: Venue; hall: Hall })[]>;
  getBookingsForOwner(ownerId: string): Promise<(Booking & { venue: Venue; hall: Hall; planner: Pick<User, "id" | "name" | "email" | "phone"> })[]>;
  getOwnerRevenue(ownerId: string, filters?: { startDate?: string; endDate?: string; hallId?: string; venueId?: string }): Promise<{ totalRevenue: number; bookingCount: number; revenueByHall: { hallId: string; hallName: string; venueName: string; revenue: number; bookingCount: number }[]; revenueByMonth: { month: string; revenue: number; bookingCount: number }[] }>;
  getBooking(id: string): Promise<(Booking & { venue: Venue; hall: Hall }) | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: string, status: string): Promise<Booking | undefined>;
  updateBookingStatusWithData(id: string, data: { status: string; cancellationReason?: string; acceptedAt?: Date }): Promise<Booking | undefined>;
  getConflictingPendingBookings(hallId: string, startDate: Date, endDate: Date | null, excludeBookingId: string): Promise<Booking[]>;

  getReviewsByVenue(venueId: string): Promise<(Review & { user: Pick<User, "id" | "name"> })[]>;
  createReview(review: InsertReview): Promise<Review>;
  addOwnerResponse(reviewId: string, ownerUserId: string, response: string): Promise<Review | undefined>;

  getMessages(userId: string): Promise<Message[]>;
  getConversation(userId1: string, userId2: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  getFavorites(userId: string): Promise<(Favorite & { venue: Venue })[]>;
  addFavorite(userId: string, venueId: string): Promise<Favorite>;
  removeFavorite(userId: string, venueId: string): Promise<void>;
  isFavorite(userId: string, venueId: string): Promise<boolean>;

  getAdminStats(): Promise<{ totalUsers: number; totalVenues: number; totalBookings: number; totalRevenue: number; usersByRole: { role: string; count: number }[]; bookingsByStatus: { status: string; count: number }[] }>;
  getAllUsers(): Promise<Omit<User, "passwordHash">[]>;
  updateUser(id: string, data: { role?: string; suspended?: boolean; approved?: boolean }): Promise<User | undefined>;
  updatePassword(id: string, newPasswordHash: string): Promise<void>;
  getAllVenuesAdmin(): Promise<(Venue & { halls: Hall[]; ownerName: string | null })[]>;
  getAllBookingsAdmin(): Promise<(Booking & { venue: Venue; hall: Hall; planner: Pick<User, "id" | "name" | "email"> })[]>;
  getAllReviewsAdmin(): Promise<(Review & { user: Pick<User, "id" | "name">; venueName: string })[]>;
  deleteReview(id: string): Promise<void>;

  getAcceptedUnpaidBookings(): Promise<(Booking & { venue: Venue; hall: Hall; planner: Pick<User, "id" | "name" | "email">; owner: Pick<User, "id" | "name" | "email"> })[]>;
  markExpiryNotificationSent(id: string): Promise<void>;

  getHallBlockedDates(hallId: string): Promise<HallBlockedDate[]>;
  getBlockedDate(id: string): Promise<HallBlockedDate | undefined>;
  addHallBlockedDate(data: InsertHallBlockedDate): Promise<HallBlockedDate>;
  removeHallBlockedDate(id: string): Promise<void>;
  getHallBookedDates(hallId: string): Promise<string[]>;

  updateProfile(id: string, data: { name?: string; email?: string; phone?: string | null }): Promise<User | undefined>;

  getNotifications(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(data: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string, userId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;

  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  upsertUserPreferences(userId: string, data: Partial<InsertUserPreferences>): Promise<UserPreferences>;

  getVenueAvailabilitySummary(): Promise<Record<string, { totalHalls: number; availableToday: number }>>;

  getSiteSetting(key: string): Promise<string | undefined>;
  setSiteSetting(key: string, value: string): Promise<void>;

  getAdminReports(filters?: { startDate?: string; endDate?: string }): Promise<{
    revenue: { total: number; byMonth: { month: string; revenue: number; count: number }[]; byCity: { city: string; revenue: number; count: number }[]; byVenueType: { type: string; revenue: number; count: number }[] };
    bookings: { total: number; byStatus: { status: string; count: number }[]; byMonth: { month: string; count: number }[] };
    venuePerformance: { venueId: string; title: string; city: string; bookingCount: number; revenue: number; avgRating: number; reviewCount: number }[];
    userGrowth: { total: number; byRole: { role: string; count: number }[]; byMonth: { month: string; count: number }[] };
    cancellations: { total: number; rate: number; byReason: { reason: string; count: number }[]; byMonth: { month: string; count: number }[] };
    reviewSummary: { total: number; avgRating: number; byRating: { rating: number; count: number }[]; byMonth: { month: string; count: number; avgRating: number }[] };
  }>;

  getOwnerReports(ownerId: string, filters?: { startDate?: string; endDate?: string; venueId?: string }): Promise<{
    bookings: { total: number; byStatus: { status: string; count: number }[]; byMonth: { month: string; count: number }[]; byHall: { hallId: string; hallName: string; venueName: string; count: number }[] };
    revenue: { total: number; byMonth: { month: string; revenue: number; count: number }[]; byHall: { hallId: string; hallName: string; venueName: string; revenue: number; count: number }[] };
    occupancy: { hallId: string; hallName: string; venueName: string; totalDaysBooked: number; bookingCount: number }[];
    reviews: { total: number; avgRating: number; byRating: { rating: number; count: number }[]; recent: { id: string; rating: number; comment: string | null; plannerName: string; venueName: string; createdAt: Date | null }[] };
    cancellations: { total: number; rate: number; byReason: { reason: string; count: number }[] };
  }>;

  getDashboardData(userId: string): Promise<{
    stats: { totalBookings: number; upcomingBookings: number; completedBookings: number; totalSpent: number; favoritesCount: number };
    recentBookings: (Booking & { venue: Venue; hall: Hall })[];
    recommendations: (Venue & { halls: Hall[]; rating: number; reviewCount: number })[];
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async getUserByFacebookId(facebookId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.facebookId, facebookId));
    return user;
  }

  async getUserByAppleId(appleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.appleId, appleId));
    return user;
  }

  async createOAuthUser(data: { name: string; email: string; googleId?: string; facebookId?: string; appleId?: string; avatarUrl?: string | null; role: string }): Promise<User> {
    const [user] = await db.insert(users).values({
      name: data.name,
      email: data.email,
      googleId: data.googleId || null,
      facebookId: data.facebookId || null,
      appleId: data.appleId || null,
      avatarUrl: data.avatarUrl || null,
      role: data.role as any,
      approved: true,
      passwordHash: null,
    }).returning();
    return user;
  }

  async linkOAuthProvider(userId: string, provider: "google" | "facebook" | "apple", providerId: string, avatarUrl?: string): Promise<User | undefined> {
    const setData: any = {};
    if (provider === "google") setData.googleId = providerId;
    if (provider === "facebook") setData.facebookId = providerId;
    if (provider === "apple") setData.appleId = providerId;
    if (avatarUrl) setData.avatarUrl = avatarUrl;
    const [user] = await db.update(users).set(setData).where(eq(users.id, userId)).returning();
    return user;
  }

  async createUser(data: InsertUser & { password: string; approved?: boolean }): Promise<User> {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const [user] = await db.insert(users).values({
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      approved: data.approved !== undefined ? data.approved : true,
      passwordHash,
    }).returning();
    return user;
  }

  async getVenues(filters?: { city?: string; type?: string; search?: string; featured?: boolean; minPrice?: number; maxPrice?: number; minCapacity?: number; lat?: number; lng?: number }): Promise<(Venue & { halls: Hall[]; rating: number; reviewCount: number; distance?: number })[]> {
    let conditions: any[] = [eq(venues.status, "active")];
    if (filters?.city) conditions.push(ilike(venues.city, `%${filters.city}%`));
    if (filters?.type) conditions.push(eq(venues.type, filters.type));
    if (filters?.search) {
      conditions.push(
        sql`(${ilike(venues.title, `%${filters.search}%`)} OR ${ilike(venues.city, `%${filters.search}%`)} OR ${ilike(venues.address, `%${filters.search}%`)})`
      );
    }
    if (filters?.featured) conditions.push(eq(venues.featured, true));

    const venueRows = await db.select().from(venues).where(and(...conditions)).orderBy(desc(venues.createdAt));
    
    const hasLocation = filters?.lat !== undefined && filters?.lng !== undefined;
    
    const result = await Promise.all(venueRows.map(async (v) => {
      const venueHalls = await db.select().from(halls).where(eq(halls.venueId, v.id));
      const venueReviews = await db.select({ rating: reviews.rating }).from(reviews).where(eq(reviews.venueId, v.id));
      const avgRating = venueReviews.length > 0 ? venueReviews.reduce((sum, r) => sum + r.rating, 0) / venueReviews.length : 0;
      
      let distance: number | undefined;
      if (hasLocation && v.lat && v.lng) {
        distance = this.haversineDistance(filters!.lat!, filters!.lng!, v.lat, v.lng);
      }
      
      return { ...v, halls: venueHalls, rating: Math.round(avgRating * 10) / 10, reviewCount: venueReviews.length, distance };
    }));

    let filtered = result;
    if (filters?.minPrice !== undefined) {
      filtered = filtered.filter(v => v.halls.some(h => h.price >= filters.minPrice!));
    }
    if (filters?.maxPrice !== undefined) {
      filtered = filtered.filter(v => v.halls.some(h => h.price <= filters.maxPrice!));
    }
    if (filters?.minCapacity !== undefined) {
      filtered = filtered.filter(v => v.halls.some(h => h.capacity >= filters.minCapacity!));
    }

    if (hasLocation) {
      filtered.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    }

    return filtered;
  }

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  async getVenuesByOwner(ownerId: string): Promise<(Venue & { halls: Hall[]; rating: number; reviewCount: number })[]> {
    const venueRows = await db.select().from(venues).where(eq(venues.ownerUserId, ownerId)).orderBy(desc(venues.createdAt));
    const result = await Promise.all(venueRows.map(async (v) => {
      const venueHalls = await db.select().from(halls).where(eq(halls.venueId, v.id));
      const venueReviews = await db.select({ rating: reviews.rating }).from(reviews).where(eq(reviews.venueId, v.id));
      const avgRating = venueReviews.length > 0 ? venueReviews.reduce((sum, r) => sum + r.rating, 0) / venueReviews.length : 0;
      return { ...v, halls: venueHalls, rating: Math.round(avgRating * 10) / 10, reviewCount: venueReviews.length };
    }));
    return result;
  }

  async getVenue(id: string): Promise<(Venue & { halls: Hall[]; rating: number; reviewCount: number }) | undefined> {
    const [venue] = await db.select().from(venues).where(eq(venues.id, id));
    if (!venue) return undefined;
    const venueHalls = await db.select().from(halls).where(eq(halls.venueId, id));
    const venueReviews = await db.select({ rating: reviews.rating }).from(reviews).where(eq(reviews.venueId, id));
    const avgRating = venueReviews.length > 0 ? venueReviews.reduce((sum, r) => sum + r.rating, 0) / venueReviews.length : 0;
    return { ...venue, halls: venueHalls, rating: Math.round(avgRating * 10) / 10, reviewCount: venueReviews.length };
  }

  async createVenue(data: InsertVenue): Promise<Venue> {
    const [venue] = await db.insert(venues).values(data).returning();
    return venue;
  }

  async updateVenue(id: string, data: Partial<InsertVenue>): Promise<Venue | undefined> {
    const [venue] = await db.update(venues).set(data).where(eq(venues.id, id)).returning();
    return venue;
  }

  async deleteVenue(id: string): Promise<void> {
    await db.delete(venues).where(eq(venues.id, id));
  }

  async getHall(id: string): Promise<Hall | undefined> {
    const [hall] = await db.select().from(halls).where(eq(halls.id, id));
    return hall;
  }

  async createHall(data: InsertHall): Promise<Hall> {
    const [hall] = await db.insert(halls).values(data).returning();
    return hall;
  }

  async updateHall(id: string, data: Partial<InsertHall>): Promise<Hall | undefined> {
    const [hall] = await db.update(halls).set(data).where(eq(halls.id, id)).returning();
    return hall;
  }

  async deleteHall(id: string): Promise<void> {
    await db.delete(halls).where(eq(halls.id, id));
  }

  async getHallsByVenue(venueId: string): Promise<Hall[]> {
    return db.select().from(halls).where(eq(halls.venueId, venueId));
  }

  async getBookings(userId: string): Promise<(Booking & { venue: Venue; hall: Hall })[]> {
    const bookingRows = await db.select().from(bookings).where(eq(bookings.plannerUserId, userId)).orderBy(desc(bookings.createdAt));
    const result = await Promise.all(bookingRows.map(async (b) => {
      const [venue] = await db.select().from(venues).where(eq(venues.id, b.venueId));
      const [hall] = await db.select().from(halls).where(eq(halls.id, b.hallId));
      return { ...b, venue, hall };
    }));
    return result;
  }

  async getBookingsForOwner(ownerId: string): Promise<(Booking & { venue: Venue; hall: Hall; planner: Pick<User, "id" | "name" | "email" | "phone"> })[]> {
    const ownerVenues = await db.select({ id: venues.id }).from(venues).where(eq(venues.ownerUserId, ownerId));
    if (ownerVenues.length === 0) return [];
    const venueIds = ownerVenues.map(v => v.id);
    const bookingRows = await db.select().from(bookings).where(inArray(bookings.venueId, venueIds)).orderBy(desc(bookings.createdAt));
    const result = await Promise.all(bookingRows.map(async (b) => {
      const [venue] = await db.select().from(venues).where(eq(venues.id, b.venueId));
      const [hall] = await db.select().from(halls).where(eq(halls.id, b.hallId));
      const [planner] = await db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone }).from(users).where(eq(users.id, b.plannerUserId));
      return { ...b, venue, hall, planner };
    }));
    return result;
  }

  async getOwnerRevenue(ownerId: string, filters?: { startDate?: string; endDate?: string; hallId?: string; venueId?: string }): Promise<{ totalRevenue: number; bookingCount: number; revenueByHall: { hallId: string; hallName: string; venueName: string; revenue: number; bookingCount: number }[]; revenueByMonth: { month: string; revenue: number; bookingCount: number }[] }> {
    const ownerVenues = await db.select({ id: venues.id }).from(venues).where(eq(venues.ownerUserId, ownerId));
    if (ownerVenues.length === 0) return { totalRevenue: 0, bookingCount: 0, revenueByHall: [], revenueByMonth: [] };

    let venueIds = ownerVenues.map(v => v.id);
    if (filters?.venueId && venueIds.includes(filters.venueId)) {
      venueIds = [filters.venueId];
    }

    const revenueStatuses = ["paid", "confirmed", "completed"] as const;
    const conditions: any[] = [
      inArray(bookings.venueId, venueIds),
      inArray(bookings.status, revenueStatuses as any),
    ];

    if (filters?.startDate) {
      conditions.push(gte(bookings.startDate, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      conditions.push(lte(bookings.startDate, new Date(filters.endDate)));
    }
    if (filters?.hallId) {
      conditions.push(eq(bookings.hallId, filters.hallId));
    }

    const matchingBookings = await db.select().from(bookings).where(and(...conditions)).orderBy(desc(bookings.startDate));

    let totalRevenue = 0;
    let bookingCount = matchingBookings.length;
    const hallMap: Record<string, { hallId: string; hallName: string; venueName: string; revenue: number; bookingCount: number }> = {};
    const monthMap: Record<string, { revenue: number; bookingCount: number }> = {};

    for (const b of matchingBookings) {
      totalRevenue += b.totalAmount;

      if (!hallMap[b.hallId]) {
        const [hall] = await db.select().from(halls).where(eq(halls.id, b.hallId));
        const [venue] = await db.select().from(venues).where(eq(venues.id, b.venueId));
        hallMap[b.hallId] = { hallId: b.hallId, hallName: hall?.name || "Unknown", venueName: venue?.title || "Unknown", revenue: 0, bookingCount: 0 };
      }
      hallMap[b.hallId].revenue += b.totalAmount;
      hallMap[b.hallId].bookingCount += 1;

      const monthKey = b.startDate ? `${b.startDate.getFullYear()}-${String(b.startDate.getMonth() + 1).padStart(2, "0")}` : "unknown";
      if (!monthMap[monthKey]) monthMap[monthKey] = { revenue: 0, bookingCount: 0 };
      monthMap[monthKey].revenue += b.totalAmount;
      monthMap[monthKey].bookingCount += 1;
    }

    const revenueByHall = Object.values(hallMap).sort((a, b) => b.revenue - a.revenue);
    const revenueByMonth = Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => ({ month, ...data }));

    return { totalRevenue, bookingCount, revenueByHall, revenueByMonth };
  }

  async getBooking(id: string): Promise<(Booking & { venue: Venue; hall: Hall }) | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    if (!booking) return undefined;
    const [venue] = await db.select().from(venues).where(eq(venues.id, booking.venueId));
    const [hall] = await db.select().from(halls).where(eq(halls.id, booking.hallId));
    return { ...booking, venue, hall };
  }

  async createBooking(data: InsertBooking): Promise<Booking> {
    const [booking] = await db.insert(bookings).values(data).returning();
    return booking;
  }

  async updateBookingStatus(id: string, status: string): Promise<Booking | undefined> {
    const [booking] = await db.update(bookings).set({ status: status as any }).where(eq(bookings.id, id)).returning();
    return booking;
  }

  async updateBookingStatusWithData(id: string, data: { status: string; cancellationReason?: string; acceptedAt?: Date }): Promise<Booking | undefined> {
    const setData: any = { status: data.status as any };
    if (data.cancellationReason !== undefined) {
      setData.cancellationReason = data.cancellationReason;
    }
    if (data.acceptedAt !== undefined) {
      setData.acceptedAt = data.acceptedAt;
    }
    const [booking] = await db.update(bookings).set(setData).where(eq(bookings.id, id)).returning();
    return booking;
  }

  async getConflictingPendingBookings(hallId: string, startDate: Date, endDate: Date | null, excludeBookingId: string): Promise<Booking[]> {
    const startStr = startDate.toISOString().split("T")[0];
    if (endDate) {
      const endStr = endDate.toISOString().split("T")[0];
      const results = await db.select().from(bookings).where(
        and(
          eq(bookings.hallId, hallId),
          eq(bookings.status, "requested"),
          not(eq(bookings.id, excludeBookingId)),
          sql`DATE(${bookings.startDate}) <= ${endStr}`,
          sql`DATE(COALESCE(${bookings.endDate}, ${bookings.startDate})) >= ${startStr}`
        )
      );
      return results;
    }
    const results = await db.select().from(bookings).where(
      and(
        eq(bookings.hallId, hallId),
        eq(bookings.status, "requested"),
        not(eq(bookings.id, excludeBookingId)),
        sql`DATE(${bookings.startDate}) = ${startStr}`,
      )
    );
    return results;
  }

  async getAcceptedUnpaidBookings(): Promise<(Booking & { venue: Venue; hall: Hall; planner: Pick<User, "id" | "name" | "email">; owner: Pick<User, "id" | "name" | "email"> })[]> {
    const acceptedBookings = await db.select().from(bookings)
      .where(and(
        eq(bookings.status, "accepted"),
        eq(bookings.depositPaid, false)
      ));

    const results = await Promise.all(acceptedBookings.map(async (b) => {
      const [venue] = await db.select().from(venues).where(eq(venues.id, b.venueId));
      const [hall] = await db.select().from(halls).where(eq(halls.id, b.hallId));
      const [planner] = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, b.plannerUserId));
      const [owner] = venue?.ownerUserId
        ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, venue.ownerUserId))
        : [{ id: "", name: "Admin", email: "" }];
      if (!venue || !hall || !planner) return null;
      return { ...b, venue, hall, planner, owner };
    }));

    return results.filter(Boolean) as any;
  }

  async markExpiryNotificationSent(id: string): Promise<void> {
    await db.update(bookings).set({ expiryNotificationSent: true }).where(eq(bookings.id, id));
  }

  async getReviewsByVenue(venueId: string): Promise<(Review & { user: Pick<User, "id" | "name"> })[]> {
    const reviewRows = await db.select().from(reviews).where(eq(reviews.venueId, venueId)).orderBy(desc(reviews.createdAt));
    const result = await Promise.all(reviewRows.map(async (r) => {
      const [user] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, r.plannerUserId));
      return { ...r, user };
    }));
    return result;
  }

  async createReview(data: InsertReview): Promise<Review> {
    const [review] = await db.insert(reviews).values(data).returning();
    return review;
  }

  async addOwnerResponse(reviewId: string, ownerUserId: string, response: string): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, reviewId));
    if (!review) return undefined;
    const [venue] = await db.select().from(venues).where(eq(venues.id, review.venueId));
    if (!venue || venue.ownerUserId !== ownerUserId) return undefined;
    const [updated] = await db.update(reviews).set({
      ownerResponse: response,
      ownerResponseDate: new Date(),
    }).where(eq(reviews.id, reviewId)).returning();
    return updated;
  }

  async getMessages(userId: string): Promise<Message[]> {
    return db.select().from(messages).where(
      sql`${messages.fromUserId} = ${userId} OR ${messages.toUserId} = ${userId}`
    ).orderBy(desc(messages.createdAt));
  }

  async getConversation(userId1: string, userId2: string): Promise<Message[]> {
    return db.select().from(messages).where(
      sql`(${messages.fromUserId} = ${userId1} AND ${messages.toUserId} = ${userId2}) OR (${messages.fromUserId} = ${userId2} AND ${messages.toUserId} = ${userId1})`
    ).orderBy(messages.createdAt);
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(data).returning();
    return message;
  }

  async getFavorites(userId: string): Promise<(Favorite & { venue: Venue })[]> {
    const favs = await db.select().from(favorites).where(eq(favorites.userId, userId));
    const result = await Promise.all(favs.map(async (f) => {
      const [venue] = await db.select().from(venues).where(eq(venues.id, f.venueId));
      return { ...f, venue };
    }));
    return result;
  }

  async addFavorite(userId: string, venueId: string): Promise<Favorite> {
    const [fav] = await db.insert(favorites).values({ userId, venueId }).returning();
    return fav;
  }

  async removeFavorite(userId: string, venueId: string): Promise<void> {
    await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.venueId, venueId)));
  }

  async isFavorite(userId: string, venueId: string): Promise<boolean> {
    const [fav] = await db.select().from(favorites).where(and(eq(favorites.userId, userId), eq(favorites.venueId, venueId)));
    return !!fav;
  }

  async getAdminStats(): Promise<{ totalUsers: number; totalVenues: number; totalBookings: number; totalRevenue: number; usersByRole: { role: string; count: number }[]; bookingsByStatus: { status: string; count: number }[] }> {
    const [userCount] = await db.select({ count: count() }).from(users);
    const [venueCount] = await db.select({ count: count() }).from(venues);
    const [bookingCount] = await db.select({ count: count() }).from(bookings);
    const [revenueResult] = await db.select({ total: sql<number>`COALESCE(SUM(${bookings.totalAmount}), 0)` }).from(bookings).where(eq(bookings.paymentStatus, "completed"));

    const usersByRole = await db.select({ role: users.role, count: count() }).from(users).groupBy(users.role);
    const bookingsByStatus = await db.select({ status: bookings.status, count: count() }).from(bookings).groupBy(bookings.status);

    return {
      totalUsers: userCount.count,
      totalVenues: venueCount.count,
      totalBookings: bookingCount.count,
      totalRevenue: Number(revenueResult.total),
      usersByRole: usersByRole.map(r => ({ role: r.role, count: r.count })),
      bookingsByStatus: bookingsByStatus.map(b => ({ status: b.status, count: b.count })),
    };
  }

  async getAllUsers(): Promise<Omit<User, "passwordHash">[]> {
    const rows = await db.select({
      id: users.id, name: users.name, email: users.email, phone: users.phone,
      role: users.role, suspended: users.suspended, approved: users.approved,
      googleId: users.googleId, facebookId: users.facebookId, appleId: users.appleId,
      avatarUrl: users.avatarUrl, createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.createdAt));
    return rows;
  }

  async updateUser(id: string, data: { role?: string; suspended?: boolean; approved?: boolean }): Promise<User | undefined> {
    const setData: any = {};
    if (data.role !== undefined) setData.role = data.role;
    if (data.suspended !== undefined) setData.suspended = data.suspended;
    if (data.approved !== undefined) setData.approved = data.approved;
    const [user] = await db.update(users).set(setData).where(eq(users.id, id)).returning();
    return user;
  }

  async updatePassword(id: string, newPasswordHash: string): Promise<void> {
    await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, id));
  }

  async getAllVenuesAdmin(): Promise<(Venue & { halls: Hall[]; ownerName: string | null })[]> {
    const venueRows = await db.select().from(venues).orderBy(desc(venues.createdAt));
    const result = await Promise.all(venueRows.map(async (v) => {
      const venueHalls = await db.select().from(halls).where(eq(halls.venueId, v.id));
      let ownerName: string | null = null;
      if (v.ownerUserId) {
        const [owner] = await db.select({ name: users.name }).from(users).where(eq(users.id, v.ownerUserId));
        ownerName = owner?.name || null;
      }
      return { ...v, halls: venueHalls, ownerName };
    }));
    return result;
  }

  async getAllBookingsAdmin(): Promise<(Booking & { venue: Venue; hall: Hall; planner: Pick<User, "id" | "name" | "email"> })[]> {
    const bookingRows = await db.select().from(bookings).orderBy(desc(bookings.createdAt));
    const result = await Promise.all(bookingRows.map(async (b) => {
      const [venue] = await db.select().from(venues).where(eq(venues.id, b.venueId));
      const [hall] = await db.select().from(halls).where(eq(halls.id, b.hallId));
      const [planner] = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, b.plannerUserId));
      return { ...b, venue, hall, planner };
    }));
    return result;
  }

  async getAllReviewsAdmin(): Promise<(Review & { user: Pick<User, "id" | "name">; venueName: string })[]> {
    const reviewRows = await db.select().from(reviews).orderBy(desc(reviews.createdAt));
    const result = await Promise.all(reviewRows.map(async (r) => {
      const [user] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, r.plannerUserId));
      const [venue] = await db.select({ title: venues.title }).from(venues).where(eq(venues.id, r.venueId));
      return { ...r, user, venueName: venue?.title || "Unknown" };
    }));
    return result;
  }

  async deleteReview(id: string): Promise<void> {
    await db.delete(reviews).where(eq(reviews.id, id));
  }

  async getHallBlockedDates(hallId: string): Promise<HallBlockedDate[]> {
    return db.select().from(hallBlockedDates).where(eq(hallBlockedDates.hallId, hallId)).orderBy(hallBlockedDates.date);
  }

  async addHallBlockedDate(data: InsertHallBlockedDate): Promise<HallBlockedDate> {
    const [blocked] = await db.insert(hallBlockedDates).values(data).returning();
    return blocked;
  }

  async getBlockedDate(id: string): Promise<HallBlockedDate | undefined> {
    const [blocked] = await db.select().from(hallBlockedDates).where(eq(hallBlockedDates.id, id));
    return blocked;
  }

  async removeHallBlockedDate(id: string): Promise<void> {
    await db.delete(hallBlockedDates).where(eq(hallBlockedDates.id, id));
  }

  async getHallBookedDates(hallId: string): Promise<string[]> {
    const activeStatuses = ["requested", "accepted", "paid", "confirmed"] as const;
    const activeBookings = await db.select({
      startDate: bookings.startDate,
      endDate: bookings.endDate,
    }).from(bookings).where(
      and(
        eq(bookings.hallId, hallId),
        inArray(bookings.status, activeStatuses as any)
      )
    );

    const dateSet = new Map<string, boolean>();
    for (const b of activeBookings) {
      const start = new Date(b.startDate);
      const end = b.endDate ? new Date(b.endDate) : start;
      const current = new Date(start);
      while (current <= end) {
        dateSet.set(current.toISOString().split("T")[0], true);
        current.setDate(current.getDate() + 1);
      }
    }
    return Array.from(dateSet.keys());
  }

  async getDashboardData(userId: string) {
    const userBookings = await db.select().from(bookings).where(eq(bookings.plannerUserId, userId));

    const now = new Date();
    const totalBookings = userBookings.length;
    const upcomingBookings = userBookings.filter(b => new Date(b.startDate) >= now && b.status !== "cancelled").length;
    const completedBookings = userBookings.filter(b => b.status === "completed").length;
    const totalSpent = userBookings
      .filter(b => b.status !== "cancelled")
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    const [favResult] = await db.select({ count: count() }).from(favorites).where(eq(favorites.userId, userId));
    const favoritesCount = Number(favResult?.count || 0);

    const recentBookingsRaw = await db.select().from(bookings)
      .where(eq(bookings.plannerUserId, userId))
      .orderBy(desc(bookings.createdAt))
      .limit(5);

    const recentVenueIds = Array.from(new Set(recentBookingsRaw.map(b => b.venueId)));
    const recentHallIds = Array.from(new Set(recentBookingsRaw.map(b => b.hallId)));

    const recentVenues = recentVenueIds.length > 0
      ? await db.select().from(venues).where(inArray(venues.id, recentVenueIds))
      : [];
    const recentHalls = recentHallIds.length > 0
      ? await db.select().from(halls).where(inArray(halls.id, recentHallIds))
      : [];

    const venueMap = new Map(recentVenues.map(v => [v.id, v]));
    const hallMap = new Map(recentHalls.map(h => [h.id, h]));

    const recentBookings: (Booking & { venue: Venue; hall: Hall })[] = [];
    for (const b of recentBookingsRaw) {
      const venue = venueMap.get(b.venueId);
      const hall = hallMap.get(b.hallId);
      if (venue && hall) {
        recentBookings.push({ ...b, venue, hall });
      }
    }

    const allVenueIds = Array.from(new Set(userBookings.map(b => b.venueId)));
    const allBookingVenues = allVenueIds.length > 0
      ? await db.select().from(venues).where(inArray(venues.id, allVenueIds))
      : [];
    const bookedCities = Array.from(new Set(allBookingVenues.map(v => v.city).filter(Boolean)));
    const bookedVenueIds = allVenueIds;

    let recommendations: (typeof venues.$inferSelect & { halls: (typeof halls.$inferSelect)[]; rating: number; reviewCount: number })[] = [];

    const allVenues = await this.getVenues({ featured: false });
    const unbookedVenues = allVenues.filter(v => !bookedVenueIds.includes(v.id) && v.verified && v.status === "active");

    const cityMatches = unbookedVenues.filter(v => bookedCities.includes(v.city));
    const others = unbookedVenues.filter(v => !bookedCities.includes(v.city));

    const sorted = [...cityMatches, ...others];
    const featured = sorted.filter(v => v.featured);
    const nonFeatured = sorted.filter(v => !v.featured);

    recommendations = [...featured, ...nonFeatured].slice(0, 6);

    if (recommendations.length < 6) {
      const fallback = allVenues
        .filter(v => !recommendations.some(r => r.id === v.id) && v.verified && v.status === "active")
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 6 - recommendations.length);
      recommendations.push(...fallback);
    }

    return {
      stats: { totalBookings, upcomingBookings, completedBookings, totalSpent, favoritesCount },
      recentBookings,
      recommendations,
    };
  }

  async updateProfile(id: string, data: { name?: string; email?: string; phone?: string | null }): Promise<User | undefined> {
    const setData: any = {};
    if (data.name !== undefined) setData.name = data.name;
    if (data.email !== undefined) setData.email = data.email;
    if (data.phone !== undefined) setData.phone = data.phone;
    const [user] = await db.update(users).set(setData).where(eq(users.id, id)).returning();
    return user;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: count() }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return Number(result?.count || 0);
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(data).returning();
    return notification;
  }

  async markNotificationRead(id: string, userId: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
  }

  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return prefs;
  }

  async upsertUserPreferences(userId: string, data: Partial<InsertUserPreferences>): Promise<UserPreferences> {
    const existing = await this.getUserPreferences(userId);
    if (existing) {
      const [updated] = await db.update(userPreferences).set(data).where(eq(userPreferences.userId, userId)).returning();
      return updated;
    }
    const [created] = await db.insert(userPreferences).values({ ...data, userId }).returning();
    return created;
  }

  async getAdminReports(filters?: { startDate?: string; endDate?: string }) {
    const dateConditions: any[] = [];
    if (filters?.startDate) dateConditions.push(gte(bookings.createdAt, new Date(filters.startDate)));
    if (filters?.endDate) dateConditions.push(lte(bookings.createdAt, new Date(filters.endDate)));

    const allBookings = await db.select().from(bookings).where(dateConditions.length ? and(...dateConditions) : undefined);
    const allVenues = await db.select().from(venues);
    const allHalls = await db.select().from(halls);
    const allUsers = await db.select({ id: users.id, role: users.role, createdAt: users.createdAt }).from(users);
    const allReviews = await db.select().from(reviews);

    const venueMap = new Map(allVenues.map(v => [v.id, v]));

    const paidStatuses = ["paid", "confirmed", "completed"];
    const paidBookings = allBookings.filter(b => paidStatuses.includes(b.status));
    const totalRevenue = paidBookings.reduce((s, b) => s + b.totalAmount, 0);

    const revenueByMonth: Record<string, { revenue: number; count: number }> = {};
    const revenueByCity: Record<string, { revenue: number; count: number }> = {};
    const revenueByType: Record<string, { revenue: number; count: number }> = {};
    for (const b of paidBookings) {
      const mk = b.createdAt ? `${b.createdAt.getFullYear()}-${String(b.createdAt.getMonth() + 1).padStart(2, "0")}` : "unknown";
      if (!revenueByMonth[mk]) revenueByMonth[mk] = { revenue: 0, count: 0 };
      revenueByMonth[mk].revenue += b.totalAmount;
      revenueByMonth[mk].count += 1;

      const venue = venueMap.get(b.venueId);
      if (venue) {
        const city = venue.city || "Unknown";
        if (!revenueByCity[city]) revenueByCity[city] = { revenue: 0, count: 0 };
        revenueByCity[city].revenue += b.totalAmount;
        revenueByCity[city].count += 1;

        const type = venue.type || "Other";
        if (!revenueByType[type]) revenueByType[type] = { revenue: 0, count: 0 };
        revenueByType[type].revenue += b.totalAmount;
        revenueByType[type].count += 1;
      }
    }

    const bookingsByStatus: Record<string, number> = {};
    const bookingsByMonth: Record<string, number> = {};
    for (const b of allBookings) {
      bookingsByStatus[b.status] = (bookingsByStatus[b.status] || 0) + 1;
      const mk = b.createdAt ? `${b.createdAt.getFullYear()}-${String(b.createdAt.getMonth() + 1).padStart(2, "0")}` : "unknown";
      bookingsByMonth[mk] = (bookingsByMonth[mk] || 0) + 1;
    }

    const venuePerf: Record<string, { venueId: string; title: string; city: string; bookingCount: number; revenue: number; ratings: number[]; reviewCount: number }> = {};
    for (const b of allBookings) {
      const venue = venueMap.get(b.venueId);
      if (!venue) continue;
      if (!venuePerf[b.venueId]) venuePerf[b.venueId] = { venueId: b.venueId, title: venue.title, city: venue.city, bookingCount: 0, revenue: 0, ratings: [], reviewCount: 0 };
      venuePerf[b.venueId].bookingCount += 1;
      if (paidStatuses.includes(b.status)) venuePerf[b.venueId].revenue += b.totalAmount;
    }
    for (const r of allReviews) {
      if (venuePerf[r.venueId]) {
        venuePerf[r.venueId].ratings.push(r.rating);
        venuePerf[r.venueId].reviewCount += 1;
      }
    }
    const venuePerformance = Object.values(venuePerf)
      .map(v => ({ ...v, avgRating: v.ratings.length > 0 ? Math.round((v.ratings.reduce((s, r) => s + r, 0) / v.ratings.length) * 10) / 10 : 0 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);

    const usersByRole: Record<string, number> = {};
    const usersByMonth: Record<string, number> = {};
    for (const u of allUsers) {
      usersByRole[u.role] = (usersByRole[u.role] || 0) + 1;
      const mk = u.createdAt ? `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, "0")}` : "unknown";
      usersByMonth[mk] = (usersByMonth[mk] || 0) + 1;
    }

    const cancelledBookings = allBookings.filter(b => b.status === "cancelled");
    const cancellationRate = allBookings.length > 0 ? Math.round((cancelledBookings.length / allBookings.length) * 100) : 0;
    const cancelReasons: Record<string, number> = {};
    const cancelByMonth: Record<string, number> = {};
    for (const b of cancelledBookings) {
      const reason = b.cancellationReason || "No reason given";
      cancelReasons[reason] = (cancelReasons[reason] || 0) + 1;
      const mk = b.createdAt ? `${b.createdAt.getFullYear()}-${String(b.createdAt.getMonth() + 1).padStart(2, "0")}` : "unknown";
      cancelByMonth[mk] = (cancelByMonth[mk] || 0) + 1;
    }

    const reviewsByRating: Record<number, number> = {};
    const reviewsByMonth: Record<string, { count: number; totalRating: number }> = {};
    let totalRating = 0;
    for (const r of allReviews) {
      reviewsByRating[r.rating] = (reviewsByRating[r.rating] || 0) + 1;
      totalRating += r.rating;
      const mk = r.createdAt ? `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, "0")}` : "unknown";
      if (!reviewsByMonth[mk]) reviewsByMonth[mk] = { count: 0, totalRating: 0 };
      reviewsByMonth[mk].count += 1;
      reviewsByMonth[mk].totalRating += r.rating;
    }

    return {
      revenue: {
        total: totalRevenue,
        byMonth: Object.entries(revenueByMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, d]) => ({ month, ...d })),
        byCity: Object.entries(revenueByCity).sort(([, a], [, b]) => b.revenue - a.revenue).map(([city, d]) => ({ city, ...d })),
        byVenueType: Object.entries(revenueByType).sort(([, a], [, b]) => b.revenue - a.revenue).map(([type, d]) => ({ type, ...d })),
      },
      bookings: {
        total: allBookings.length,
        byStatus: Object.entries(bookingsByStatus).map(([status, count]) => ({ status, count })),
        byMonth: Object.entries(bookingsByMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count })),
      },
      venuePerformance: venuePerformance.map(({ ratings, ...rest }) => rest),
      userGrowth: {
        total: allUsers.length,
        byRole: Object.entries(usersByRole).map(([role, count]) => ({ role, count })),
        byMonth: Object.entries(usersByMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count })),
      },
      cancellations: {
        total: cancelledBookings.length,
        rate: cancellationRate,
        byReason: Object.entries(cancelReasons).sort(([, a], [, b]) => b - a).map(([reason, count]) => ({ reason, count })),
        byMonth: Object.entries(cancelByMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count })),
      },
      reviewSummary: {
        total: allReviews.length,
        avgRating: allReviews.length > 0 ? Math.round((totalRating / allReviews.length) * 10) / 10 : 0,
        byRating: [5, 4, 3, 2, 1].map(rating => ({ rating, count: reviewsByRating[rating] || 0 })),
        byMonth: Object.entries(reviewsByMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, d]) => ({ month, count: d.count, avgRating: Math.round((d.totalRating / d.count) * 10) / 10 })),
      },
    };
  }

  async getOwnerReports(ownerId: string, filters?: { startDate?: string; endDate?: string; venueId?: string }) {
    const ownerVenues = await db.select().from(venues).where(eq(venues.ownerUserId, ownerId));
    if (ownerVenues.length === 0) {
      return {
        bookings: { total: 0, byStatus: [], byMonth: [], byHall: [] },
        revenue: { total: 0, byMonth: [], byHall: [] },
        occupancy: [],
        reviews: { total: 0, avgRating: 0, byRating: [], recent: [] },
        cancellations: { total: 0, rate: 0, byReason: [] },
      };
    }

    let venueIds = ownerVenues.map(v => v.id);
    if (filters?.venueId && venueIds.includes(filters.venueId)) venueIds = [filters.venueId];

    const conditions: any[] = [inArray(bookings.venueId, venueIds)];
    if (filters?.startDate) conditions.push(gte(bookings.createdAt, new Date(filters.startDate)));
    if (filters?.endDate) conditions.push(lte(bookings.createdAt, new Date(filters.endDate)));

    const allBookings = await db.select().from(bookings).where(and(...conditions));
    const ownerHalls = await db.select().from(halls).where(inArray(halls.venueId, venueIds));
    const hallMap = new Map(ownerHalls.map(h => [h.id, h]));
    const venueMap = new Map(ownerVenues.map(v => [v.id, v]));

    const paidStatuses = ["paid", "confirmed", "completed"];
    const paidBookings = allBookings.filter(b => paidStatuses.includes(b.status));

    const bookingsByStatus: Record<string, number> = {};
    const bookingsByMonth: Record<string, number> = {};
    const bookingsByHall: Record<string, number> = {};
    for (const b of allBookings) {
      bookingsByStatus[b.status] = (bookingsByStatus[b.status] || 0) + 1;
      const mk = b.createdAt ? `${b.createdAt.getFullYear()}-${String(b.createdAt.getMonth() + 1).padStart(2, "0")}` : "unknown";
      bookingsByMonth[mk] = (bookingsByMonth[mk] || 0) + 1;
      bookingsByHall[b.hallId] = (bookingsByHall[b.hallId] || 0) + 1;
    }

    const totalRevenue = paidBookings.reduce((s, b) => s + b.totalAmount, 0);
    const revenueByMonth: Record<string, { revenue: number; count: number }> = {};
    const revenueByHall: Record<string, { revenue: number; count: number }> = {};
    for (const b of paidBookings) {
      const mk = b.createdAt ? `${b.createdAt.getFullYear()}-${String(b.createdAt.getMonth() + 1).padStart(2, "0")}` : "unknown";
      if (!revenueByMonth[mk]) revenueByMonth[mk] = { revenue: 0, count: 0 };
      revenueByMonth[mk].revenue += b.totalAmount;
      revenueByMonth[mk].count += 1;
      if (!revenueByHall[b.hallId]) revenueByHall[b.hallId] = { revenue: 0, count: 0 };
      revenueByHall[b.hallId].revenue += b.totalAmount;
      revenueByHall[b.hallId].count += 1;
    }

    const activeStatuses = ["requested", "accepted", "paid", "confirmed", "completed"];
    const occupancyMap: Record<string, { totalDays: number; count: number }> = {};
    for (const b of allBookings.filter(b => activeStatuses.includes(b.status))) {
      const start = new Date(b.startDate);
      const end = b.endDate ? new Date(b.endDate) : start;
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      if (!occupancyMap[b.hallId]) occupancyMap[b.hallId] = { totalDays: 0, count: 0 };
      occupancyMap[b.hallId].totalDays += days;
      occupancyMap[b.hallId].count += 1;
    }

    const ownerReviews = await db.select().from(reviews).where(inArray(reviews.venueId, venueIds)).orderBy(desc(reviews.createdAt));
    const reviewsByRating: Record<number, number> = {};
    let totalRating = 0;
    for (const r of ownerReviews) {
      reviewsByRating[r.rating] = (reviewsByRating[r.rating] || 0) + 1;
      totalRating += r.rating;
    }
    const recentReviews = await Promise.all(ownerReviews.slice(0, 10).map(async (r) => {
      const [planner] = await db.select({ name: users.name }).from(users).where(eq(users.id, r.plannerUserId));
      const venue = venueMap.get(r.venueId);
      return { id: r.id, rating: r.rating, comment: r.comment, plannerName: planner?.name || "Unknown", venueName: venue?.title || "Unknown", createdAt: r.createdAt };
    }));

    const cancelledBookings = allBookings.filter(b => b.status === "cancelled");
    const cancelReasons: Record<string, number> = {};
    for (const b of cancelledBookings) {
      const reason = b.cancellationReason || "No reason given";
      cancelReasons[reason] = (cancelReasons[reason] || 0) + 1;
    }

    return {
      bookings: {
        total: allBookings.length,
        byStatus: Object.entries(bookingsByStatus).map(([status, count]) => ({ status, count })),
        byMonth: Object.entries(bookingsByMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count })),
        byHall: Object.entries(bookingsByHall).map(([hallId, count]) => {
          const hall = hallMap.get(hallId);
          const venue = hall ? venueMap.get(hall.venueId) : undefined;
          return { hallId, hallName: hall?.name || "Unknown", venueName: venue?.title || "Unknown", count };
        }).sort((a, b) => b.count - a.count),
      },
      revenue: {
        total: totalRevenue,
        byMonth: Object.entries(revenueByMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, d]) => ({ month, ...d })),
        byHall: Object.entries(revenueByHall).map(([hallId, d]) => {
          const hall = hallMap.get(hallId);
          const venue = hall ? venueMap.get(hall.venueId) : undefined;
          return { hallId, hallName: hall?.name || "Unknown", venueName: venue?.title || "Unknown", ...d };
        }).sort((a, b) => b.revenue - a.revenue),
      },
      occupancy: Object.entries(occupancyMap).map(([hallId, d]) => {
        const hall = hallMap.get(hallId);
        const venue = hall ? venueMap.get(hall.venueId) : undefined;
        return { hallId, hallName: hall?.name || "Unknown", venueName: venue?.title || "Unknown", totalDaysBooked: d.totalDays, bookingCount: d.count };
      }).sort((a, b) => b.totalDaysBooked - a.totalDaysBooked),
      reviews: {
        total: ownerReviews.length,
        avgRating: ownerReviews.length > 0 ? Math.round((totalRating / ownerReviews.length) * 10) / 10 : 0,
        byRating: [5, 4, 3, 2, 1].map(rating => ({ rating, count: reviewsByRating[rating] || 0 })),
        recent: recentReviews,
      },
      cancellations: {
        total: cancelledBookings.length,
        rate: allBookings.length > 0 ? Math.round((cancelledBookings.length / allBookings.length) * 100) : 0,
        byReason: Object.entries(cancelReasons).sort(([, a], [, b]) => b - a).map(([reason, count]) => ({ reason, count })),
      },
    };
  }

  async getVenueAvailabilitySummary(): Promise<Record<string, { totalHalls: number; availableToday: number }>> {
    const today = new Date().toISOString().split("T")[0];
    const activeStatuses = ["requested", "accepted", "paid", "confirmed"] as const;
    const allActiveBookings = await db.select({
      venueId: bookings.venueId,
      hallId: bookings.hallId,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
    }).from(bookings).where(
      inArray(bookings.status, activeStatuses as any)
    );

    const allHalls = await db.select({
      id: halls.id,
      venueId: halls.venueId,
    }).from(halls);

    const hallsByVenue: Record<string, string[]> = {};
    allHalls.forEach(h => {
      if (!hallsByVenue[h.venueId]) hallsByVenue[h.venueId] = [];
      hallsByVenue[h.venueId].push(h.id);
    });

    const hallBookedToday: Set<string> = new Set();
    allActiveBookings.forEach(b => {
      const start = new Date(b.startDate).toISOString().split("T")[0];
      const end = b.endDate ? new Date(b.endDate).toISOString().split("T")[0] : start;
      if (today >= start && today <= end) {
        hallBookedToday.add(b.hallId);
      }
    });

    const summary: Record<string, { totalHalls: number; availableToday: number }> = {};
    Object.entries(hallsByVenue).forEach(([venueId, venueHallIds]) => {
      const availableToday = venueHallIds.filter(hid => !hallBookedToday.has(hid)).length;
      summary[venueId] = { totalHalls: venueHallIds.length, availableToday };
    });

    return summary;
  }

  async getSiteSetting(key: string): Promise<string | undefined> {
    const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return row?.value;
  }

  async setSiteSetting(key: string, value: string): Promise<void> {
    await db.insert(siteSettings).values({ key, value }).onConflictDoUpdate({
      target: siteSettings.key,
      set: { value, updatedAt: new Date() },
    });
  }
}

export const storage = new DatabaseStorage();
