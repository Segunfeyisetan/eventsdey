import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Plus, MapPin, Users, Star, Pencil, Trash2, Eye, Building2, Clock, TrendingUp, DollarSign, CalendarDays, Filter, ChevronDown, ChevronUp } from "lucide-react";
import type { VenueWithHalls } from "@/components/VenueCard";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type RevenueData = {
  totalRevenue: number;
  bookingCount: number;
  revenueByHall: { hallId: string; hallName: string; venueName: string; revenue: number; bookingCount: number }[];
  revenueByMonth: { month: string; revenue: number; bookingCount: number }[];
};

export default function MyVenues() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [revenueExpanded, setRevenueExpanded] = useState(true);
  const [dateFilter, setDateFilter] = useState<"all" | "this_month" | "last_30" | "last_90" | "this_year" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");
  const [selectedHallId, setSelectedHallId] = useState<string>("");

  const { data: venues, isLoading } = useQuery<VenueWithHalls[]>({
    queryKey: ["/api/my-venues"],
    enabled: !!user && (user.role === "venue_holder" || user.role === "admin"),
  });

  const getDateRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case "this_month":
        return { startDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`, endDate: undefined };
      case "last_30": {
        const d = new Date(now); d.setDate(d.getDate() - 30);
        return { startDate: d.toISOString().split("T")[0], endDate: undefined };
      }
      case "last_90": {
        const d = new Date(now); d.setDate(d.getDate() - 90);
        return { startDate: d.toISOString().split("T")[0], endDate: undefined };
      }
      case "this_year":
        return { startDate: `${now.getFullYear()}-01-01`, endDate: undefined };
      case "custom":
        return { startDate: customStartDate || undefined, endDate: customEndDate || undefined };
      default:
        return { startDate: undefined, endDate: undefined };
    }
  };

  const dateRange = getDateRange();
  const revenueQueryParams = new URLSearchParams();
  if (dateRange.startDate) revenueQueryParams.set("startDate", dateRange.startDate);
  if (dateRange.endDate) revenueQueryParams.set("endDate", dateRange.endDate);
  if (selectedHallId) revenueQueryParams.set("hallId", selectedHallId);
  if (selectedVenueId) revenueQueryParams.set("venueId", selectedVenueId);
  const revenueQueryString = revenueQueryParams.toString();

  const { data: revenue, isLoading: revenueLoading } = useQuery<RevenueData>({
    queryKey: ["/api/owner/revenue", revenueQueryString],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/owner/revenue${revenueQueryString ? `?${revenueQueryString}` : ""}`);
      return res.json();
    },
    enabled: !!user && (user.role === "venue_holder" || user.role === "admin"),
  });

  const allHalls = venues?.flatMap(v => v.halls.map(h => ({ ...h, venueName: v.title }))) || [];

  const deleteMutation = useMutation({
    mutationFn: async (venueId: string) => {
      await apiRequest("DELETE", `/api/venues/${venueId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-venues"] });
      toast({ title: "Venue deleted", description: "Your venue has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not delete venue.", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/auth");
    }
  }, [authLoading, user, setLocation]);

  if (!authLoading && !user) {
    return null;
  }

  if (!authLoading && user && user.role === "planner") {
    return (
      <div className="min-h-screen bg-background text-foreground pt-16 flex flex-col items-center justify-center px-6">
        <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-xl font-serif font-bold mb-2">Venue Owner Access Only</h1>
        <p className="text-muted-foreground text-center mb-6">This area is for venue owners. Switch to a venue owner account to manage venues.</p>
        <Button onClick={() => setLocation("/")} variant="outline" data-testid="button-go-home">Go Home</Button>
        <BottomNav />
      </div>
    );
  }

  if (!authLoading && user && user.role === "venue_holder" && user.approved === false) {
    return (
      <div className="min-h-screen bg-background text-foreground pt-16 flex flex-col items-center justify-center px-6">
        <div className="bg-card border border-orange-400/20 rounded-2xl p-8 text-center max-w-sm">
          <Clock className="h-16 w-16 text-orange-400 mx-auto mb-4" />
          <h1 className="text-xl font-serif font-bold mb-2" data-testid="text-pending-title">Pending Approval</h1>
          <p className="text-muted-foreground text-sm mb-4">
            Your venue owner account is awaiting admin approval. Once approved, you'll be able to list and manage your venues.
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            This usually takes 24-48 hours. If you have questions, contact us at contact@eventsdey.com
          </p>
          <Button onClick={() => setLocation("/")} variant="outline" className="border-border" data-testid="button-go-home-pending">
            Go Home
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <div className="p-6 pt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <span className="text-primary text-xs font-bold tracking-wider uppercase">Dashboard</span>
            <h1 className="text-2xl font-serif font-bold text-foreground" data-testid="text-my-venues-title">My Venues</h1>
          </div>
          <Button
            onClick={() => setLocation("/venue/new")}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            data-testid="button-add-venue"
          >
            <Plus className="h-4 w-4" /> Add Venue
          </Button>
        </div>

        <div className="mb-6">
          <button
            onClick={() => setRevenueExpanded(!revenueExpanded)}
            className="flex items-center justify-between w-full mb-3"
            data-testid="button-toggle-revenue"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-serif font-bold text-foreground">Revenue</h2>
            </div>
            {revenueExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {revenueExpanded && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card border border-border rounded-xl p-4" data-testid="stat-total-revenue">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Revenue</span>
                  </div>
                  {revenueLoading ? (
                    <Skeleton className="h-7 w-24" />
                  ) : (
                    <p className="text-xl font-bold text-foreground">₦{(revenue?.totalRevenue || 0).toLocaleString()}</p>
                  )}
                </div>
                <div className="bg-card border border-border rounded-xl p-4" data-testid="stat-booking-count">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Bookings</span>
                  </div>
                  {revenueLoading ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <p className="text-xl font-bold text-foreground">{revenue?.bookingCount || 0}</p>
                  )}
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Filter className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Filters</span>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Date Range</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                    data-testid="select-date-filter"
                  >
                    <option value="all">All Time</option>
                    <option value="this_month">This Month</option>
                    <option value="last_30">Last 30 Days</option>
                    <option value="last_90">Last 90 Days</option>
                    <option value="this_year">This Year</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {dateFilter === "custom" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">From</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                        data-testid="input-custom-start-date"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">To</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                        data-testid="input-custom-end-date"
                      />
                    </div>
                  </div>
                )}

                {venues && venues.length > 1 && (
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Venue</label>
                    <select
                      value={selectedVenueId}
                      onChange={(e) => { setSelectedVenueId(e.target.value); setSelectedHallId(""); }}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                      data-testid="select-venue-filter"
                    >
                      <option value="">All Venues</option>
                      {venues.map(v => (
                        <option key={v.id} value={v.id}>{v.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                {allHalls.length > 0 && (
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Hall</label>
                    <select
                      value={selectedHallId}
                      onChange={(e) => setSelectedHallId(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                      data-testid="select-hall-filter"
                    >
                      <option value="">All Halls</option>
                      {(selectedVenueId
                        ? allHalls.filter(h => h.venueId === selectedVenueId)
                        : allHalls
                      ).map(h => (
                        <option key={h.id} value={h.id}>{h.name} ({h.venueName})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {revenue && revenue.revenueByHall.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Revenue by Hall</h3>
                  <div className="space-y-3">
                    {revenue.revenueByHall.map((h) => {
                      const pct = revenue.totalRevenue > 0 ? (h.revenue / revenue.totalRevenue) * 100 : 0;
                      return (
                        <div key={h.hallId} data-testid={`revenue-hall-${h.hallId}`}>
                          <div className="flex justify-between items-center text-sm mb-1">
                            <div className="min-w-0 flex-1">
                              <span className="font-medium text-foreground truncate block">{h.hallName}</span>
                              <span className="text-xs text-muted-foreground">{h.venueName} · {h.bookingCount} booking{h.bookingCount !== 1 ? "s" : ""}</span>
                            </div>
                            <span className="font-bold text-foreground ml-3 shrink-0">₦{h.revenue.toLocaleString()}</span>
                          </div>
                          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {revenue && revenue.revenueByMonth.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Monthly Revenue</h3>
                  <div className="space-y-2">
                    {revenue.revenueByMonth.map((m) => (
                      <div key={m.month} className="flex justify-between items-center text-sm" data-testid={`revenue-month-${m.month}`}>
                        <span className="text-muted-foreground">{m.month}</span>
                        <div className="text-right">
                          <span className="font-bold text-foreground">₦{m.revenue.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground ml-2">({m.bookingCount})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {revenue && revenue.totalRevenue === 0 && !revenueLoading && (
                <div className="bg-card border border-border rounded-xl p-6 text-center">
                  <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">No revenue data for the selected period</p>
                  <p className="text-xs text-muted-foreground mt-1">Revenue is tracked from paid, confirmed, and completed bookings</p>
                </div>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-card border border-border rounded-xl p-4">
                <div className="flex gap-4">
                  <Skeleton className="w-28 h-28 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : venues && venues.length > 0 ? (
          <div className="space-y-4">
            {venues.map((venue) => {
              const minPrice = venue.halls.length > 0 ? Math.min(...venue.halls.map(h => h.price)) : 0;
              const maxCapacity = venue.halls.length > 0 ? Math.max(...venue.halls.map(h => h.capacity)) : 0;

              return (
                <div key={venue.id} className="bg-card border border-border rounded-xl overflow-hidden" data-testid={`card-my-venue-${venue.id}`}>
                  <div className="flex gap-4 p-4">
                    <div className="w-28 h-28 rounded-lg overflow-hidden shrink-0">
                      <img src={venue.imageUrl || "/images/hero-venue.png"} alt={venue.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <h3 className="font-serif font-semibold truncate flex-1" data-testid={`text-venue-title-${venue.id}`}>
                          {venue.title}
                        </h3>
                        {venue.verified && (
                          <Badge variant="secondary" className="bg-primary/20 text-primary border-none text-[10px] shrink-0">
                            Verified
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center text-xs text-muted-foreground mb-2">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span className="truncate">{venue.city}, {venue.state}</span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-primary fill-current" /> {venue.rating.toFixed(1)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {maxCapacity}
                        </span>
                        <span className="text-primary font-medium">
                          {venue.halls.length} Hall{venue.halls.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        From ₦{minPrice.toLocaleString()}/day
                      </p>
                    </div>
                  </div>

                  <div className="bg-secondary px-4 py-3 flex gap-2">
                    <Link href={`/venue/${venue.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full border-border hover:bg-secondary h-9 text-xs gap-1.5" data-testid={`button-view-${venue.id}`}>
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                    </Link>
                    <Link href={`/venue/${venue.id}/edit`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full border-primary/30 hover:bg-primary/10 text-primary h-9 text-xs gap-1.5" data-testid={`button-edit-${venue.id}`}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="border-red-500/30 hover:bg-red-500/10 text-red-400 h-9 text-xs gap-1.5" data-testid={`button-delete-${venue.id}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Venue?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove "{venue.title}" and all its halls. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deleteMutation.mutate(venue.id)}
                            data-testid={`button-confirm-delete-${venue.id}`}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <Building2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No venues yet</p>
            <p className="text-sm mb-6">List your first venue and start accepting bookings</p>
            <Button onClick={() => setLocation("/venue/new")} className="bg-primary text-primary-foreground gap-2" data-testid="button-add-first-venue">
              <Plus className="h-4 w-4" /> Add Your First Venue
            </Button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
