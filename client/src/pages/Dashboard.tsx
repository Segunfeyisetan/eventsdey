import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import VenueCard, { type VenueWithHalls } from "@/components/VenueCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays, TrendingUp, CheckCircle2, Heart, Search,
  ArrowRight, Clock, MapPin, Sparkles, BookOpen
} from "lucide-react";
import { format } from "date-fns";

interface DashboardData {
  stats: {
    totalBookings: number;
    upcomingBookings: number;
    completedBookings: number;
    totalSpent: number;
    favoritesCount: number;
  };
  recentBookings: {
    id: string;
    venueId: string;
    hallId: string;
    status: string;
    startDate: string;
    totalAmount: number;
    createdAt: string;
    venue: { id: string; title: string; city: string; imageUrl: string | null };
    hall: { id: string; name: string; capacity: number; price: number };
  }[];
  recommendations: VenueWithHalls[];
}

const statusColor = (status: string) => {
  switch (status) {
    case "confirmed": case "completed": case "paid": return "bg-green-500/20 text-green-400 border-none";
    case "requested": case "accepted": return "bg-yellow-500/20 text-yellow-400 border-none";
    case "cancellation_requested": return "bg-orange-500/20 text-orange-400 border-none";
    case "cancelled": return "bg-red-500/20 text-red-400 border-none";
    default: return "bg-secondary text-white/60 border-none";
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case "requested": return "Pending";
    case "accepted": return "Accepted";
    case "paid": return "Paid";
    case "confirmed": return "Confirmed";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    case "cancellation_requested": return "Cancel Requested";
    default: return status;
  }
};

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/auth");
    }
  }, [authLoading, user, setLocation]);

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    enabled: !!user,
  });

  if (authLoading) return null;
  if (!user) return null;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const firstName = user.name?.split(" ")[0] || "there";

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <BottomNav />

      <div className="p-6 pt-10 pb-4">
        <p className="text-primary font-medium tracking-widest text-xs mb-1" data-testid="text-dashboard-greeting">{greeting()},</p>
        <h1 className="font-serif text-3xl font-bold" data-testid="text-dashboard-name">{firstName}</h1>
        <p className="text-muted-foreground text-sm mt-1">Here's what's happening with your events</p>
      </div>

      <div className="px-6 pb-6">
        <div className="grid grid-cols-2 gap-3" data-testid="section-stats">
          {isLoading ? (
            <>
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </>
          ) : (
            <>
              <StatCard
                icon={CalendarDays}
                label="Total Bookings"
                value={data?.stats.totalBookings || 0}
                accent="primary"
              />
              <StatCard
                icon={TrendingUp}
                label="Upcoming"
                value={data?.stats.upcomingBookings || 0}
                accent="blue"
              />
              <StatCard
                icon={CheckCircle2}
                label="Completed"
                value={data?.stats.completedBookings || 0}
                accent="green"
              />
              <StatCard
                icon={Heart}
                label="Saved Venues"
                value={data?.stats.favoritesCount || 0}
                accent="pink"
              />
            </>
          )}
        </div>
      </div>

      {data && data.stats.totalBookings > 0 && (
        <div className="px-6 pb-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Total Invested</span>
            </div>
            <p className="text-2xl font-bold font-serif" data-testid="text-total-spent">
              ₦{(data.stats.totalSpent || 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Across all your bookings</p>
          </div>
        </div>
      )}

      <div className="px-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h2 className="font-serif text-lg font-semibold">Recent Bookings</h2>
        </div>
        {(data?.recentBookings?.length || 0) > 0 && (
          <Link href="/bookings">
            <span className="text-xs text-primary font-medium flex items-center gap-1 cursor-pointer" data-testid="link-view-all-bookings">
              View All <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        )}
      </div>

      <div className="px-6 pb-8" data-testid="section-recent-bookings">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : !data?.recentBookings?.length ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm mb-1">No bookings yet</p>
            <p className="text-muted-foreground/60 text-xs mb-4">Start planning your next event</p>
            <Button variant="outline" size="sm" asChild className="border-primary/30 text-primary hover:bg-primary/10">
              <Link href="/search" data-testid="link-find-venue-empty">
                <Search className="h-3.5 w-3.5 mr-1.5" /> Find a Venue
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {data.recentBookings.map((booking) => (
              <Link key={booking.id} href={`/venue/${booking.venueId}`}>
                <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all cursor-pointer" data-testid={`card-recent-booking-${booking.id}`}>
                  <div className="flex gap-3 p-3">
                    <img
                      src={booking.venue?.imageUrl || "/images/hero-venue.png"}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      alt={booking.venue?.title}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm truncate" data-testid={`text-recent-venue-${booking.id}`}>
                          {booking.venue?.title}
                        </h3>
                        <Badge variant="secondary" className={`${statusColor(booking.status)} text-[10px] px-1.5 py-0.5 flex-shrink-0`}>
                          {statusLabel(booking.status)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{booking.hall?.name}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(booking.startDate), "MMM d, yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {booking.venue?.city}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="px-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-serif text-lg font-semibold">Recommended for You</h2>
        </div>
        <Link href="/search">
          <span className="text-xs text-primary font-medium flex items-center gap-1 cursor-pointer" data-testid="link-explore-all">
            Explore All <ArrowRight className="h-3 w-3" />
          </span>
        </Link>
      </div>

      <div className="px-6 pb-8" data-testid="section-recommendations">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        ) : !data?.recommendations?.length ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <Search className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No recommendations available yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.recommendations.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>
        )}
      </div>

      <div className="px-6 pb-8">
        <div className="bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20 rounded-xl p-5 text-center">
          <Sparkles className="h-6 w-6 text-primary mx-auto mb-2" />
          <h3 className="font-serif text-lg font-semibold mb-1">Ready to plan your next event?</h3>
          <p className="text-xs text-muted-foreground mb-4">Browse hundreds of premium venues across Nigeria</p>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6">
            <Link href="/search" data-testid="button-explore-venues">
              <Search className="h-4 w-4 mr-2" /> Explore Venues
            </Link>
          </Button>
        </div>
      </div>

      <div className="h-20" />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: {
  icon: React.ElementType;
  label: string;
  value: number;
  accent: "primary" | "blue" | "green" | "pink";
}) {
  const colors = {
    primary: { bg: "bg-primary/10", text: "text-primary", icon: "text-primary" },
    blue: { bg: "bg-blue-500/10", text: "text-blue-400", icon: "text-blue-400" },
    green: { bg: "bg-green-500/10", text: "text-green-400", icon: "text-green-400" },
    pink: { bg: "bg-pink-500/10", text: "text-pink-400", icon: "text-pink-400" },
  };
  const c = colors[accent];

  return (
    <div className="bg-card border border-border rounded-xl p-4" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className={`${c.bg} w-8 h-8 rounded-lg flex items-center justify-center mb-2`}>
        <Icon className={`h-4 w-4 ${c.icon}`} />
      </div>
      <p className="text-2xl font-bold font-serif">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
