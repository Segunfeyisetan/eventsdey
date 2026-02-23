import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Users, Building2, CalendarCheck, Star, BarChart3,
  ShieldCheck, ShieldOff, CheckCircle, XCircle, Trash2, Crown, Ban, Clock, UserCheck,
  Settings, ImageIcon, Upload, Loader2, FileBarChart, Download, ChevronDown, ChevronUp
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

type Tab = "overview" | "users" | "venues" | "bookings" | "reviews" | "reports" | "settings";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-serif font-bold" data-testid="text-admin-denied">Access Denied</h1>
          <p className="text-muted-foreground mt-2">Admin access required</p>
          <Button onClick={() => setLocation("/")} className="mt-4" data-testid="button-go-home">Go Home</Button>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users },
    { id: "venues", label: "Venues", icon: Building2 },
    { id: "bookings", label: "Bookings", icon: CalendarCheck },
    { id: "reviews", label: "Reviews", icon: Star },
    { id: "reports", label: "Reports", icon: FileBarChart },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-admin-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-serif font-bold" data-testid="text-admin-title">Admin Dashboard</h1>
          <p className="text-xs text-muted-foreground">Platform Management</p>
        </div>
      </div>

      <div className="flex overflow-x-auto border-b border-border px-2 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "users" && <UsersTab />}
        {activeTab === "venues" && <VenuesTab />}
        {activeTab === "bookings" && <BookingsTab />}
        {activeTab === "reviews" && <ReviewsTab />}
        {activeTab === "reports" && <ReportsTab />}
        {activeTab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color = "text-primary" }: { label: string; value: string | number; icon: any; color?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function OverviewTab() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: () => fetch("/api/admin/stats", { credentials: "include" }).then(r => r.json()),
  });

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading stats...</div>;

  const formatCurrency = (n: number) => `₦${(n || 0).toLocaleString()}`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Users" value={stats?.totalUsers || 0} icon={Users} />
        <StatCard label="Total Venues" value={stats?.totalVenues || 0} icon={Building2} />
        <StatCard label="Total Bookings" value={stats?.totalBookings || 0} icon={CalendarCheck} />
        <StatCard label="Revenue" value={formatCurrency(stats?.totalRevenue)} icon={BarChart3} color="text-green-400" />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Users by Role</h3>
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          {stats?.usersByRole?.map((r: any) => (
            <div key={r.role} className="flex items-center justify-between">
              <span className="text-sm capitalize">{r.role.replace("_", " ")}</span>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">{r.count}</Badge>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Bookings by Status</h3>
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          {stats?.bookingsByStatus?.map((b: any) => (
            <div key={b.status} className="flex items-center justify-between">
              <span className="text-sm capitalize">{b.status.replace("_", " ")}</span>
              <Badge variant="outline">{b.count}</Badge>
            </div>
          ))}
          {(!stats?.bookingsByStatus || stats.bookingsByStatus.length === 0) && (
            <p className="text-sm text-muted-foreground">No bookings yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: userList, isLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: () => fetch("/api/admin/users", { credentials: "include" }).then(r => r.json()),
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "User updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading users...</div>;

  const roleColors: Record<string, string> = {
    admin: "bg-red-500/10 text-red-400 border-red-400/30",
    venue_holder: "bg-blue-500/10 text-blue-400 border-blue-400/30",
    planner: "bg-green-500/10 text-green-400 border-green-400/30",
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{userList?.length || 0} users total</p>
      {userList?.map((u: any) => (
        <div key={u.id} className="bg-card border border-border rounded-xl p-4" data-testid={`user-card-${u.id}`}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-semibold">{u.name}</p>
              <p className="text-xs text-muted-foreground">{u.email}</p>
            </div>
            <Badge variant="outline" className={roleColors[u.role] || ""}>
              {u.role === "venue_holder" ? "Venue Owner" : u.role}
            </Badge>
          </div>

          <div className="flex gap-1.5 flex-wrap mb-2">
            {u.suspended && (
              <Badge variant="destructive">Suspended</Badge>
            )}
            {u.role === "venue_holder" && u.approved === false && (
              <Badge className="bg-orange-500/10 text-orange-400 border-orange-400/30">Pending Approval</Badge>
            )}
            {u.role === "venue_holder" && u.approved !== false && (
              <Badge className="bg-green-500/10 text-green-400 border-green-400/30">Approved</Badge>
            )}
          </div>

          <div className="flex gap-2 mt-3 flex-wrap">
            {u.role !== "admin" && (
              <>
                {u.role === "venue_holder" && u.approved === false && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8 border-green-400/30 text-green-400 hover:bg-green-400/10"
                    onClick={() => updateUserMutation.mutate({
                      id: u.id,
                      data: { approved: true },
                    })}
                    disabled={updateUserMutation.isPending}
                    data-testid={`button-approve-${u.id}`}
                  >
                    <UserCheck className="h-3 w-3 mr-1" /> Approve
                  </Button>
                )}
                {u.role === "venue_holder" && u.approved !== false && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8 border-orange-400/30 text-orange-400 hover:bg-orange-400/10"
                    onClick={() => updateUserMutation.mutate({
                      id: u.id,
                      data: { approved: false },
                    })}
                    disabled={updateUserMutation.isPending}
                    data-testid={`button-revoke-${u.id}`}
                  >
                    <Clock className="h-3 w-3 mr-1" /> Revoke Approval
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8"
                  onClick={() => updateUserMutation.mutate({
                    id: u.id,
                    data: { suspended: !u.suspended },
                  })}
                  disabled={updateUserMutation.isPending}
                  data-testid={`button-suspend-${u.id}`}
                >
                  {u.suspended ? <><ShieldCheck className="h-3 w-3 mr-1" /> Activate</> : <><Ban className="h-3 w-3 mr-1" /> Suspend</>}
                </Button>

                {u.role === "planner" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8"
                    onClick={() => updateUserMutation.mutate({
                      id: u.id,
                      data: { role: "venue_holder" },
                    })}
                    disabled={updateUserMutation.isPending}
                    data-testid={`button-promote-${u.id}`}
                  >
                    <Crown className="h-3 w-3 mr-1" /> Make Venue Owner
                  </Button>
                )}
                {u.role === "venue_holder" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8"
                    onClick={() => updateUserMutation.mutate({
                      id: u.id,
                      data: { role: "planner" },
                    })}
                    disabled={updateUserMutation.isPending}
                    data-testid={`button-demote-${u.id}`}
                  >
                    <Users className="h-3 w-3 mr-1" /> Make Planner
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function VenuesTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: venueList, isLoading } = useQuery({
    queryKey: ["/api/admin/venues"],
    queryFn: () => fetch("/api/admin/venues", { credentials: "include" }).then(r => r.json()),
  });

  const updateVenueMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/venues/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/venues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Venue updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading venues...</div>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{venueList?.length || 0} venues total</p>
      {venueList?.map((v: any) => (
        <div key={v.id} className="bg-card border border-border rounded-xl p-4" data-testid={`venue-admin-card-${v.id}`}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-semibold">{v.title}</p>
              <p className="text-xs text-muted-foreground">{v.city}, {v.state}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Owner: {v.ownerName || "N/A"}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {v.verified && <Badge className="bg-green-500/10 text-green-400 border-green-400/30 text-[10px]">Verified</Badge>}
              {v.featured && <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px]">Featured</Badge>}
              {v.status !== "active" && <Badge variant="destructive" className="text-[10px]">{v.status}</Badge>}
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-3">{v.halls?.length || 0} hall(s) · {v.type}</p>

          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className={`text-xs h-8 ${v.verified ? "border-green-400/30 text-green-400" : ""}`}
              onClick={() => updateVenueMutation.mutate({
                id: v.id,
                data: { verified: !v.verified },
              })}
              disabled={updateVenueMutation.isPending}
              data-testid={`button-verify-${v.id}`}
            >
              {v.verified ? <><XCircle className="h-3 w-3 mr-1" /> Unverify</> : <><CheckCircle className="h-3 w-3 mr-1" /> Verify</>}
            </Button>

            <Button
              size="sm"
              variant="outline"
              className={`text-xs h-8 ${v.featured ? "border-primary/30 text-primary" : ""}`}
              onClick={() => updateVenueMutation.mutate({
                id: v.id,
                data: { featured: !v.featured },
              })}
              disabled={updateVenueMutation.isPending}
              data-testid={`button-feature-${v.id}`}
            >
              {v.featured ? <><Star className="h-3 w-3 mr-1 fill-current" /> Unfeature</> : <><Star className="h-3 w-3 mr-1" /> Feature</>}
            </Button>

            <Button
              size="sm"
              variant="outline"
              className={`text-xs h-8 ${v.status !== "active" ? "border-red-400/30 text-red-400" : ""}`}
              onClick={() => updateVenueMutation.mutate({
                id: v.id,
                data: { status: v.status === "active" ? "suspended" : "active" },
              })}
              disabled={updateVenueMutation.isPending}
              data-testid={`button-venue-status-${v.id}`}
            >
              {v.status === "active" ? <><ShieldOff className="h-3 w-3 mr-1" /> Suspend</> : <><ShieldCheck className="h-3 w-3 mr-1" /> Activate</>}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function BookingsTab() {
  const { data: bookingList, isLoading } = useQuery({
    queryKey: ["/api/admin/bookings"],
    queryFn: () => fetch("/api/admin/bookings", { credentials: "include" }).then(r => r.json()),
  });

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading bookings...</div>;

  const formatCurrency = (n: number) => `₦${(n || 0).toLocaleString()}`;
  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });

  const statusColors: Record<string, string> = {
    requested: "bg-yellow-500/10 text-yellow-400 border-yellow-400/30",
    accepted: "bg-blue-500/10 text-blue-400 border-blue-400/30",
    paid: "bg-green-500/10 text-green-400 border-green-400/30",
    confirmed: "bg-emerald-500/10 text-emerald-400 border-emerald-400/30",
    completed: "bg-primary/10 text-primary border-primary/30",
    cancelled: "bg-red-500/10 text-red-400 border-red-400/30",
    cancellation_requested: "bg-orange-500/10 text-orange-400 border-orange-400/30",
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{bookingList?.length || 0} bookings total</p>
      {bookingList?.map((b: any) => (
        <div key={b.id} className="bg-card border border-border rounded-xl p-4" data-testid={`booking-admin-card-${b.id}`}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-semibold text-sm">{b.venue?.title || "Unknown Venue"}</p>
              <p className="text-xs text-muted-foreground">{b.hall?.name || "Unknown Hall"}</p>
            </div>
            <Badge variant="outline" className={statusColors[b.status] || ""}>
              {b.status.replace("_", " ")}
            </Badge>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Planner: {b.planner?.name || "Unknown"} ({b.planner?.email})</p>
            <p>Date: {formatDate(b.startDate)}</p>
            <p>Total: {formatCurrency(b.totalAmount)} · Deposit: {formatCurrency(b.depositAmount)} · Balance: {formatCurrency(b.balanceAmount)}</p>
            {b.guests && <p>Guests: {b.guests}</p>}
            {b.cancellationReason && (
              <p className="text-orange-400">Cancellation reason: {b.cancellationReason}</p>
            )}
          </div>
        </div>
      ))}
      {(!bookingList || bookingList.length === 0) && (
        <div className="text-center py-8 text-muted-foreground">No bookings yet</div>
      )}
    </div>
  );
}

function ReviewsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: reviewList, isLoading } = useQuery({
    queryKey: ["/api/admin/reviews"],
    queryFn: () => fetch("/api/admin/reviews", { credentials: "include" }).then(r => r.json()),
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/reviews/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      toast({ title: "Review deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading reviews...</div>;

  const renderStars = (rating: number) => "★".repeat(rating) + "☆".repeat(5 - rating);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{reviewList?.length || 0} reviews total</p>
      {reviewList?.map((r: any) => (
        <div key={r.id} className="bg-card border border-border rounded-xl p-4" data-testid={`review-admin-card-${r.id}`}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-semibold text-sm">{r.venueName}</p>
              <p className="text-xs text-muted-foreground">by {r.user?.name || "Unknown"}</p>
            </div>
            <span className="text-primary text-sm">{renderStars(r.rating)}</span>
          </div>
          {r.comment && <p className="text-sm text-muted-foreground mb-3">{r.comment}</p>}
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 text-red-400 border-red-400/30 hover:bg-red-400/10"
            onClick={() => deleteReviewMutation.mutate(r.id)}
            disabled={deleteReviewMutation.isPending}
            data-testid={`button-delete-review-${r.id}`}
          >
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </Button>
        </div>
      ))}
      {(!reviewList || reviewList.length === 0) && (
        <div className="text-center py-8 text-muted-foreground">No reviews yet</div>
      )}
    </div>
  );
}

type AdminReports = {
  revenue: { total: number; byMonth: { month: string; revenue: number; count: number }[]; byCity: { city: string; revenue: number; count: number }[]; byVenueType: { type: string; revenue: number; count: number }[] };
  bookings: { total: number; byStatus: { status: string; count: number }[]; byMonth: { month: string; count: number }[] };
  venuePerformance: { venueId: string; title: string; city: string; bookingCount: number; revenue: number; avgRating: number; reviewCount: number }[];
  userGrowth: { total: number; byRole: { role: string; count: number }[]; byMonth: { month: string; count: number }[] };
  cancellations: { total: number; rate: number; byReason: { reason: string; count: number }[]; byMonth: { month: string; count: number }[] };
  reviewSummary: { total: number; avgRating: number; byRating: { rating: number; count: number }[]; byMonth: { month: string; count: number; avgRating: number }[] };
};

function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(","),
    ...rows.map(row => headers.map(h => {
      const val = row[h];
      const str = String(val ?? "");
      return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(","))
  ].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

type DatePreset = "all" | "this_month" | "last_30" | "last_90" | "this_year" | "custom";

function ReportsTab() {
  const [preset, setPreset] = useState<DatePreset>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    revenue: true, bookings: true, venuePerformance: true, userGrowth: true, cancellations: true, reviewSummary: true,
  });

  const getDateRange = (): { startDate?: string; endDate?: string } => {
    const now = new Date();
    switch (preset) {
      case "this_month": {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { startDate: format(start, "yyyy-MM-dd"), endDate: format(now, "yyyy-MM-dd") };
      }
      case "last_30": {
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { startDate: format(start, "yyyy-MM-dd"), endDate: format(now, "yyyy-MM-dd") };
      }
      case "last_90": {
        const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        return { startDate: format(start, "yyyy-MM-dd"), endDate: format(now, "yyyy-MM-dd") };
      }
      case "this_year": {
        const start = new Date(now.getFullYear(), 0, 1);
        return { startDate: format(start, "yyyy-MM-dd"), endDate: format(now, "yyyy-MM-dd") };
      }
      case "custom":
        return { startDate: customStart || undefined, endDate: customEnd || undefined };
      default:
        return {};
    }
  };

  const dateRange = getDateRange();
  const queryParams = new URLSearchParams();
  if (dateRange.startDate) queryParams.set("startDate", dateRange.startDate);
  if (dateRange.endDate) queryParams.set("endDate", dateRange.endDate);
  const queryString = queryParams.toString();

  const { data: reports, isLoading } = useQuery<AdminReports>({
    queryKey: ["/api/admin/reports", queryString],
    queryFn: () => fetch(`/api/admin/reports${queryString ? `?${queryString}` : ""}`, { credentials: "include" }).then(r => r.json()),
  });

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const formatCurrency = (n: number) => `₦${(n || 0).toLocaleString()}`;
  const renderStars = (rating: number) => {
    const full = Math.round(rating);
    return "★".repeat(Math.min(full, 5)) + "☆".repeat(Math.max(5 - full, 0));
  };

  const presets: { id: DatePreset; label: string }[] = [
    { id: "all", label: "All Time" },
    { id: "this_month", label: "This Month" },
    { id: "last_30", label: "Last 30 Days" },
    { id: "last_90", label: "Last 90 Days" },
    { id: "this_year", label: "This Year" },
    { id: "custom", label: "Custom" },
  ];

  const statusDotColors: Record<string, string> = {
    requested: "bg-yellow-400",
    accepted: "bg-blue-400",
    paid: "bg-green-400",
    confirmed: "bg-emerald-400",
    completed: "bg-primary",
    cancelled: "bg-red-400",
    cancellation_requested: "bg-orange-400",
  };

  const SectionHeader = ({ title, sectionKey, onDownload }: { title: string; sectionKey: string; onDownload?: () => void }) => (
    <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection(sectionKey)} data-testid={`section-toggle-${sectionKey}`}>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        {expandedSections[sectionKey] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {title}
      </h3>
      {onDownload && expandedSections[sectionKey] && (
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(); }}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          data-testid={`button-download-${sectionKey}`}
        >
          <Download className="h-3.5 w-3.5" /> CSV
        </button>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16" data-testid="reports-loading">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="reports-tab">
      <div className="flex flex-wrap gap-2 items-center" data-testid="reports-date-filter">
        {presets.map(p => (
          <button
            key={p.id}
            onClick={() => setPreset(p.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              preset === p.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            data-testid={`preset-${p.id}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="flex flex-wrap gap-3 items-center" data-testid="reports-custom-dates">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">From:</label>
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="bg-muted border border-border rounded-lg px-3 py-1.5 text-sm"
              data-testid="input-start-date"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">To:</label>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="bg-muted border border-border rounded-lg px-3 py-1.5 text-sm"
              data-testid="input-end-date"
            />
          </div>
        </div>
      )}

      {/* Revenue Report */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4" data-testid="section-revenue">
        <SectionHeader
          title="Revenue Report"
          sectionKey="revenue"
          onDownload={() => downloadCSV("revenue_by_month", reports?.revenue?.byMonth || [])}
        />
        {expandedSections.revenue && reports?.revenue && (
          <div className="space-y-4">
            <div className="text-2xl font-bold text-primary" data-testid="text-total-revenue">
              {formatCurrency(reports.revenue.total)}
            </div>

            {reports.revenue.byMonth.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Revenue by Month</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-revenue-month">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-muted-foreground font-medium">Month</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium">Revenue</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium">Bookings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.revenue.byMonth.map((m, i) => (
                        <tr key={m.month} className={`border-b border-border/50 ${i % 2 === 1 ? "bg-muted/30" : ""}`}>
                          <td className="py-2 px-2">{m.month}</td>
                          <td className="py-2 px-2 text-right">{formatCurrency(m.revenue)}</td>
                          <td className="py-2 px-2 text-right">{m.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reports.revenue.byCity.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Revenue by City</p>
                  <button onClick={() => downloadCSV("revenue_by_city", reports.revenue.byCity)} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80" data-testid="button-download-revenue-city">
                    <Download className="h-3 w-3" /> CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-revenue-city">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-muted-foreground font-medium">City</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium">Revenue</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium">Bookings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.revenue.byCity.map((c, i) => (
                        <tr key={c.city} className={`border-b border-border/50 ${i % 2 === 1 ? "bg-muted/30" : ""}`}>
                          <td className="py-2 px-2">{c.city}</td>
                          <td className="py-2 px-2 text-right">{formatCurrency(c.revenue)}</td>
                          <td className="py-2 px-2 text-right">{c.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reports.revenue.byVenueType.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Revenue by Venue Type</p>
                  <button onClick={() => downloadCSV("revenue_by_type", reports.revenue.byVenueType)} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80" data-testid="button-download-revenue-type">
                    <Download className="h-3 w-3" /> CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-revenue-type">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-muted-foreground font-medium">Type</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium">Revenue</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium">Bookings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.revenue.byVenueType.map((t, i) => (
                        <tr key={t.type} className={`border-b border-border/50 ${i % 2 === 1 ? "bg-muted/30" : ""}`}>
                          <td className="py-2 px-2 capitalize">{t.type}</td>
                          <td className="py-2 px-2 text-right">{formatCurrency(t.revenue)}</td>
                          <td className="py-2 px-2 text-right">{t.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bookings Overview */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4" data-testid="section-bookings">
        <SectionHeader
          title="Bookings Overview"
          sectionKey="bookings"
          onDownload={() => downloadCSV("bookings_by_month", reports?.bookings?.byMonth || [])}
        />
        {expandedSections.bookings && reports?.bookings && (
          <div className="space-y-4">
            <p className="text-2xl font-bold" data-testid="text-total-bookings">{reports.bookings.total}</p>

            {reports.bookings.byStatus.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">By Status</p>
                {reports.bookings.byStatus.map(s => {
                  const pct = reports.bookings.total > 0 ? (s.count / reports.bookings.total) * 100 : 0;
                  return (
                    <div key={s.status} className="flex items-center gap-3" data-testid={`status-bar-${s.status}`}>
                      <div className="flex items-center gap-2 w-36 shrink-0">
                        <span className={`w-2.5 h-2.5 rounded-full ${statusDotColors[s.status] || "bg-gray-400"}`} />
                        <span className="text-sm capitalize">{s.status.replace("_", " ")}</span>
                      </div>
                      <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                        <div className={`h-full rounded-full ${statusDotColors[s.status] || "bg-gray-400"}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                      </div>
                      <span className="text-sm font-medium w-10 text-right">{s.count}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {reports.bookings.byMonth.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Bookings by Month</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-bookings-month">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-muted-foreground font-medium">Month</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.bookings.byMonth.map((m, i) => (
                        <tr key={m.month} className={`border-b border-border/50 ${i % 2 === 1 ? "bg-muted/30" : ""}`}>
                          <td className="py-2 px-2">{m.month}</td>
                          <td className="py-2 px-2 text-right">{m.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Venue Performance */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4" data-testid="section-venue-performance">
        <SectionHeader
          title="Venue Performance (Top 20)"
          sectionKey="venuePerformance"
          onDownload={() => downloadCSV("venue_performance", (reports?.venuePerformance || []).map(v => ({
            Venue: v.title, City: v.city, Bookings: v.bookingCount, Revenue: v.revenue, "Avg Rating": v.avgRating, Reviews: v.reviewCount,
          })))}
        />
        {expandedSections.venuePerformance && reports?.venuePerformance && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-venue-performance">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Venue</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">City</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Bookings</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Revenue</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Avg Rating</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Reviews</th>
                </tr>
              </thead>
              <tbody>
                {reports.venuePerformance.map((v, i) => (
                  <tr key={v.venueId} className={`border-b border-border/50 ${i % 2 === 1 ? "bg-muted/30" : ""}`} data-testid={`venue-perf-row-${v.venueId}`}>
                    <td className="py-2 px-2 font-medium">{v.title}</td>
                    <td className="py-2 px-2">{v.city}</td>
                    <td className="py-2 px-2 text-right">{v.bookingCount}</td>
                    <td className="py-2 px-2 text-right">{formatCurrency(v.revenue)}</td>
                    <td className="py-2 px-2 text-right">
                      <span className="text-primary">{v.avgRating > 0 ? v.avgRating.toFixed(1) : "—"}</span>
                    </td>
                    <td className="py-2 px-2 text-right">{v.reviewCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reports.venuePerformance.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No venue data available</p>
            )}
          </div>
        )}
      </div>

      {/* User Growth */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4" data-testid="section-user-growth">
        <SectionHeader
          title="User Growth"
          sectionKey="userGrowth"
          onDownload={() => downloadCSV("user_growth", reports?.userGrowth?.byMonth || [])}
        />
        {expandedSections.userGrowth && reports?.userGrowth && (
          <div className="space-y-4">
            <p className="text-2xl font-bold" data-testid="text-total-users">{reports.userGrowth.total}</p>

            {reports.userGrowth.byRole.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {reports.userGrowth.byRole.map(r => (
                  <div key={r.role} className="bg-muted/50 border border-border rounded-lg p-3 text-center" data-testid={`user-role-card-${r.role}`}>
                    <p className="text-lg font-bold">{r.count}</p>
                    <p className="text-xs text-muted-foreground capitalize">{r.role.replace("_", " ")}</p>
                  </div>
                ))}
              </div>
            )}

            {reports.userGrowth.byMonth.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Users by Month</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-user-growth">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-muted-foreground font-medium">Month</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium">New Users</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.userGrowth.byMonth.map((m, i) => (
                        <tr key={m.month} className={`border-b border-border/50 ${i % 2 === 1 ? "bg-muted/30" : ""}`}>
                          <td className="py-2 px-2">{m.month}</td>
                          <td className="py-2 px-2 text-right">{m.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cancellation Report */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4" data-testid="section-cancellations">
        <SectionHeader
          title="Cancellation Report"
          sectionKey="cancellations"
          onDownload={() => downloadCSV("cancellations", reports?.cancellations?.byMonth || [])}
        />
        {expandedSections.cancellations && reports?.cancellations && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <p className="text-2xl font-bold" data-testid="text-total-cancellations">{reports.cancellations.total}</p>
              <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-400/30" data-testid="text-cancellation-rate">
                {reports.cancellations.rate.toFixed(1)}% cancellation rate
              </Badge>
            </div>

            {reports.cancellations.byReason.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Cancellation Reasons</p>
                  <button onClick={() => downloadCSV("cancellation_reasons", reports.cancellations.byReason)} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80" data-testid="button-download-cancel-reasons">
                    <Download className="h-3 w-3" /> CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-cancel-reasons">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-muted-foreground font-medium">Reason</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.cancellations.byReason.map((r, i) => (
                        <tr key={r.reason} className={`border-b border-border/50 ${i % 2 === 1 ? "bg-muted/30" : ""}`}>
                          <td className="py-2 px-2">{r.reason}</td>
                          <td className="py-2 px-2 text-right">{r.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reports.cancellations.byMonth.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Cancellations by Month</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-cancel-month">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-muted-foreground font-medium">Month</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.cancellations.byMonth.map((m, i) => (
                        <tr key={m.month} className={`border-b border-border/50 ${i % 2 === 1 ? "bg-muted/30" : ""}`}>
                          <td className="py-2 px-2">{m.month}</td>
                          <td className="py-2 px-2 text-right">{m.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review Summary */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4" data-testid="section-review-summary">
        <SectionHeader
          title="Review Summary"
          sectionKey="reviewSummary"
          onDownload={() => downloadCSV("reviews_by_month", (reports?.reviewSummary?.byMonth || []).map(m => ({
            Month: m.month, Count: m.count, "Avg Rating": m.avgRating.toFixed(1),
          })))}
        />
        {expandedSections.reviewSummary && reports?.reviewSummary && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <p className="text-2xl font-bold" data-testid="text-total-reviews">{reports.reviewSummary.total}</p>
              <span className="text-primary text-lg" data-testid="text-avg-rating">
                {renderStars(Math.round(reports.reviewSummary.avgRating))}
                <span className="text-sm text-muted-foreground ml-2">({reports.reviewSummary.avgRating.toFixed(1)})</span>
              </span>
            </div>

            {reports.reviewSummary.byRating.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Rating Distribution</p>
                {[5, 4, 3, 2, 1].map(star => {
                  const entry = reports.reviewSummary.byRating.find(r => r.rating === star);
                  const count = entry?.count || 0;
                  const pct = reports.reviewSummary.total > 0 ? (count / reports.reviewSummary.total) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-3" data-testid={`rating-bar-${star}`}>
                      <span className="text-sm w-16 text-right">{star} star{star !== 1 ? "s" : ""}</span>
                      <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(pct, 1)}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-16 text-right">{pct.toFixed(0)}% ({count})</span>
                    </div>
                  );
                })}
              </div>
            )}

            {reports.reviewSummary.byMonth.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Reviews by Month</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-reviews-month">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-muted-foreground font-medium">Month</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium">Count</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium">Avg Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.reviewSummary.byMonth.map((m, i) => (
                        <tr key={m.month} className={`border-b border-border/50 ${i % 2 === 1 ? "bg-muted/30" : ""}`}>
                          <td className="py-2 px-2">{m.month}</td>
                          <td className="py-2 px-2 text-right">{m.count}</td>
                          <td className="py-2 px-2 text-right">
                            <span className="text-primary">{m.avgRating.toFixed(1)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: heroSetting, isLoading } = useQuery({
    queryKey: ["/api/site-settings/hero_image"],
    queryFn: () => fetch("/api/site-settings/hero_image", { credentials: "include" }).then(r => r.json()),
  });

  const [uploading, setUploading] = useState(false);

  const updateHeroMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const res = await apiRequest("PUT", "/api/site-settings/hero_image", { value: imageUrl });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings/hero_image"] });
      toast({ title: "Hero image updated", description: "The home page background has been changed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update hero image.", variant: "destructive" });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Invalid file", description: "Please select a JPG, PNG, or WebP image.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Image must be less than 10MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/object-storage/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      updateHeroMutation.mutate(data.objectPath);
    } catch {
      toast({ title: "Upload failed", description: "Could not upload the image. Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeHero = () => {
    updateHeroMutation.mutate("");
  };

  const currentImage = heroSetting?.value || "";

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Home Page Hero Image</h3>
        <p className="text-sm text-muted-foreground">
          Upload a background image for the home page hero section. Use a high-quality landscape image (recommended size: 1920x1080 or similar).
        </p>

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          id="hero-upload"
          onChange={handleFileUpload}
          data-testid="input-hero-upload"
        />

        {currentImage ? (
          <div className="relative rounded-xl overflow-hidden border border-border">
            <img
              src={currentImage}
              alt="Current hero background"
              className="w-full h-48 object-cover"
              data-testid="img-hero-preview"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 flex items-end justify-between">
              <span className="text-white text-sm font-medium">Current hero image</span>
              <div className="flex gap-2">
                <label
                  htmlFor="hero-upload"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur text-white text-xs font-medium cursor-pointer hover:bg-white/30 transition-colors"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Change
                </label>
                <button
                  onClick={removeHero}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/80 text-white text-xs font-medium hover:bg-red-600 transition-colors"
                  data-testid="button-remove-hero"
                >
                  Reset to Default
                </button>
              </div>
            </div>
          </div>
        ) : (
          <label
            htmlFor="hero-upload"
            className="flex flex-col items-center justify-center gap-3 w-full h-40 rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/30 cursor-pointer transition-colors"
          >
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">Uploading...</span>
              </>
            ) : (
              <>
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to upload hero image</span>
                <span className="text-xs text-muted-foreground/60">JPG, PNG, WebP up to 10MB</span>
              </>
            )}
          </label>
        )}

        {!currentImage && (
          <p className="text-xs text-muted-foreground">
            No custom hero image set. The default image is being used.
          </p>
        )}
      </div>
    </div>
  );
}
