# Eventsdey Nigeria -- Release Notes

## Version: February 14, 2026

---

### Security & Stability
- Comprehensive security audit with critical fixes: booking ownership verification, data validation on all inputs, 1MB request size limits, and password strength enforcement
- Suspended and unapproved users are now properly blocked from accessing platform features
- Blocked date ownership verification ensures venue owners can only manage their own calendars

### Booking System Improvements
- **Auto-decline conflicting bookings** -- When a venue owner accepts a booking, all other pending requests for the same hall and date are automatically cancelled, with notifications sent to affected planners
- **24-hour payment window** -- Accepted bookings now expire 24 hours after acceptance (previously expired at midnight). Clear expiry notices shown on booking confirmation, success toast, and My Bookings page
- **Expiry warning emails** -- Automated warning emails sent to both planner and venue owner within 6 hours before a booking expires

### Reporting & Analytics
- **Admin Reports** -- Revenue by month/city/venue type, bookings by status, top venue performance, user growth, cancellation stats, and review summaries with date range filters and CSV download
- **Owner Reports** -- Revenue by hall and month, bookings by status/hall/month, hall occupancy tracking, review summaries, and cancellation stats with date range filters and CSV download

### Notifications & Messaging
- New booking request notifications for venue owners
- Booking accepted/cancelled/completed notifications for planners
- Payment confirmation messages sent automatically
- Booking expiry warnings delivered via in-app notifications and email

### Design & User Experience
- Light and dark theme support with system preference detection
- Admin-configurable homepage hero/background image
- Updated social media sharing preview image
- Improved navigation bar visibility with bolder, darker text
- Centered search bar and category layout on homepage

### Account & Profile
- Personal info editing (name, email, phone)
- User preferences page with default city, theme selection, and email notification toggles
- Profile page with links to venue management and reports (for venue owners)

### Image Uploads
- Venue and hall image uploads via cloud storage
- Supported formats: JPG, PNG, WebP, GIF (max 10MB)
