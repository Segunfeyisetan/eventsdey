import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, doublePrecision, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export { sessions } from "./models/auth";

export const userRoleEnum = pgEnum("user_role", ["admin", "venue_holder", "planner"]);
export const bookingStatusEnum = pgEnum("booking_status", ["requested", "accepted", "paid", "confirmed", "completed", "cancelled", "cancellation_requested"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "completed", "failed", "refunded"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  role: userRoleEnum("role").notNull().default("planner"),
  suspended: boolean("suspended").default(false),
  approved: boolean("approved").default(true),
  passwordHash: text("password_hash"),
  googleId: text("google_id").unique(),
  facebookId: text("facebook_id").unique(),
  appleId: text("apple_id").unique(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const venues = pgTable("venues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerUserId: varchar("owner_user_id").references(() => users.id),
  createdByAdmin: boolean("created_by_admin").default(false),
  title: text("title").notNull(),
  description: text("description").notNull(),
  address: text("address"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  imageUrl: text("image_url"),
  type: text("type").notNull().default("Wedding"),
  verified: boolean("verified").default(false),
  featured: boolean("featured").default(false),
  instantBook: boolean("instant_book").default(false),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const halls = pgTable("halls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  venueId: varchar("venue_id").notNull().references(() => venues.id),
  name: text("name").notNull(),
  description: text("description"),
  capacity: integer("capacity").notNull(),
  price: integer("price").notNull(),
  depositPercentage: integer("deposit_percentage").notNull().default(100),
  balanceDueDays: integer("balance_due_days").notNull().default(7),
  imageUrl: text("image_url"),
  amenities: jsonb("amenities").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  venueId: varchar("venue_id").notNull().references(() => venues.id),
  hallId: varchar("hall_id").notNull().references(() => halls.id),
  plannerUserId: varchar("planner_user_id").notNull().references(() => users.id),
  status: bookingStatusEnum("status").notNull().default("requested"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  guests: integer("guests"),
  totalAmount: integer("total_amount").notNull(),
  depositAmount: integer("deposit_amount"),
  balanceAmount: integer("balance_amount"),
  depositPaid: boolean("deposit_paid").default(false),
  balancePaid: boolean("balance_paid").default(false),
  cancellationReason: text("cancellation_reason"),
  paymentStatus: paymentStatusEnum("payment_status").default("pending"),
  acceptedAt: timestamp("accepted_at"),
  expiryNotificationSent: boolean("expiry_notification_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  venueId: varchar("venue_id").notNull().references(() => venues.id),
  bookingId: varchar("booking_id").references(() => bookings.id),
  plannerUserId: varchar("planner_user_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  ownerResponse: text("owner_response"),
  ownerResponseDate: timestamp("owner_response_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").references(() => bookings.id),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id),
  toUserId: varchar("to_user_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  venueId: varchar("venue_id").notNull().references(() => venues.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const hallBlockedDates = pgTable("hall_blocked_dates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hallId: varchar("hall_id").notNull().references(() => halls.id),
  date: timestamp("date").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationTypeEnum = pgEnum("notification_type", [
  "booking_request", "booking_accepted", "booking_cancelled", "booking_completed",
  "booking_expiry", "new_message", "new_review", "review_response",
  "venue_approved", "venue_verified", "account_approved", "system"
]);

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  read: boolean("read").default(false),
  linkUrl: text("link_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  defaultCity: text("default_city"),
  theme: text("theme").default("light"),
  emailBookingUpdates: boolean("email_booking_updates").default(true),
  emailMessages: boolean("email_messages").default(true),
  emailReviews: boolean("email_reviews").default(true),
  emailPromotions: boolean("email_promotions").default(false),
  emailExpiry: boolean("email_expiry").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const siteSettings = pgTable("site_settings", {
  key: varchar("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, passwordHash: true }).extend({
  password: z.string().min(6),
});
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export const insertVenueSchema = createInsertSchema(venues).omit({ id: true, createdAt: true });
export const insertHallSchema = createInsertSchema(halls).omit({ id: true, createdAt: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true, status: true, paymentStatus: true, depositPaid: true, balancePaid: true, acceptedAt: true, expiryNotificationSent: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true, ownerResponse: true, ownerResponseDate: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertHallBlockedDateSchema = createInsertSchema(hallBlockedDates).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, read: true });
export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({ id: true, createdAt: true });

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
});

export const updatePreferencesSchema = z.object({
  defaultCity: z.string().nullable().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  emailBookingUpdates: z.boolean().optional(),
  emailMessages: z.boolean().optional(),
  emailReviews: z.boolean().optional(),
  emailPromotions: z.boolean().optional(),
  emailExpiry: z.boolean().optional(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Venue = typeof venues.$inferSelect;
export type InsertVenue = z.infer<typeof insertVenueSchema>;
export type Hall = typeof halls.$inferSelect;
export type InsertHall = z.infer<typeof insertHallSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Favorite = typeof favorites.$inferSelect;
export type HallBlockedDate = typeof hallBlockedDates.$inferSelect;
export type InsertHallBlockedDate = z.infer<typeof insertHallBlockedDateSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
