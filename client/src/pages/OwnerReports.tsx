import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Download, Loader2, ChevronDown, ChevronUp,
  FileBarChart, DollarSign, CalendarCheck, Star, XCircle, BarChart3
} from "lucide-react";
import { Link } from "wouter";
import BottomNav from "@/components/BottomNav";
import type { VenueWithHalls } from "@/components/VenueCard";

type DatePreset = "all" | "this_month" | "last_30" | "last_90" | "this_year" | "custom";

type OwnerReportsData = {
  bookings: { total: number; byStatus: { status: string; count: number }[]; byMonth: { month: string; count: number }[]; byHall: { hallId: string; hallName: string; venueName: string; count: number }[] };
  revenue: { total: number; byMonth: { month: string; revenue: number; count: number }[]; byHall: { hallId: string; hallName: string; venueName: string; revenue: number; count: number }[] };
  occupancy: { hallId: string; hallName: string; venueName: string; totalDaysBooked: number; bookingCount: number }[];
  reviews: { total: number; avgRating: number; byRating: { rating: number; count: number }[]; recent: { id: string; rating: number; comment: string | null; plannerName: string; venueName: string; createdAt: string | null }[] };
  cancellations: { total: number; rate: number; byReason: { reason: string; count: number }[] };
};

function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => {
    const val = r[h];
    const str = String(val ?? "");
    return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
  }).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const STATUS_COLORS: Record<string, string> = {
  requested: "bg-yellow-400",
  accepted: "bg-blue-400",
  paid: "bg-emerald-400",
  confirmed: "bg-green-400",
  completed: "bg-primary",
  cancelled: "bg-red-400",
  cancellation_requested: "bg-orange-400",
};

const STATUS_LABELS: Record<string, string> = {
  requested: "Pending",
  accepted: "Awaiting Payment",
  paid: "Deposit Received",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  cancellation_requested: "Cancel Review",
};

export default function OwnerReports() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedVenueId, setSelectedVenueId] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    bookings: true, revenue: true, occupancy: true, reviews: true, cancellations: true,
  });

  const getDateRange = () => {
    if (datePreset === "custom") return { startDate: customStart || undefined, endDate: customEnd || undefined };
    const now = new Date();
    switch (datePreset) {
      case "this_month": return { startDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01` };
      case "last_30": { const d = new Date(); d.setDate(d.getDate() - 30); return { startDate: d.toISOString().split("T")[0] }; }
      case "last_90": { const d = new Date(); d.setDate(d.getDate() - 90); return { startDate: d.toISOString().split("T")[0] }; }
      case "this_year": return { startDate: `${now.getFullYear()}-01-01` };
      default: return {};
    }
  };

  const dateRange = getDateRange();
  const queryParams = new URLSearchParams();
  if (dateRange.startDate) queryParams.set("startDate", dateRange.startDate);
  if (dateRange.endDate) queryParams.set("endDate", dateRange.endDate);
  if (selectedVenueId) queryParams.set("venueId", selectedVenueId);
  const qs = queryParams.toString();

  const { data: reports, isLoading } = useQuery<OwnerReportsData>({
    queryKey: ["/api/owner/reports", qs],
    queryFn: () => fetch(`/api/owner/reports${qs ? `?${qs}` : ""}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!user && (user.role === "venue_holder" || user.role === "admin"),
  });

  const { data: venues } = useQuery<VenueWithHalls[]>({
    queryKey: ["/api/my-venues"],
    enabled: !!user && (user.role === "venue_holder" || user.role === "admin"),
  });

  if (authLoading) return null;
  if (!user || (user.role !== "venue_holder" && user.role !== "admin")) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-serif font-bold" data-testid="text-access-denied">Access Denied</h1>
          <p className="text-muted-foreground mt-2">Venue owner access required</p>
          <Button onClick={() => setLocation("/")} className="mt-4" data-testid="button-go-home">Go Home</Button>
        </div>
      </div>
    );
  }

  const toggle = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const presets: { key: DatePreset; label: string }[] = [
    { key: "all", label: "All Time" },
    { key: "this_month", label: "This Month" },
    { key: "last_30", label: "Last 30 Days" },
    { key: "last_90", label: "Last 90 Days" },
    { key: "this_year", label: "This Year" },
    { key: "custom", label: "Custom" },
  ];

  const fmt = (n: number) => `₦${n.toLocaleString()}`;

  return (
    <div className="min-h-screen bg-background text-foreground pt-16 pb-24">
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <Link href="/my-venues">
          <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-reports-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-serif font-bold" data-testid="text-reports-title">My Reports</h1>
          <p className="text-xs text-muted-foreground">View your venue performance and analytics</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {presets.map(p => (
            <button
              key={p.key}
              onClick={() => setDatePreset(p.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                datePreset === p.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              data-testid={`filter-${p.key}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {datePreset === "custom" && (
          <div className="flex gap-2">
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" data-testid="input-custom-start" />
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" data-testid="input-custom-end" />
          </div>
        )}

        {venues && venues.length > 1 && (
          <select
            value={selectedVenueId}
            onChange={e => setSelectedVenueId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            data-testid="select-venue-filter"
          >
            <option value="">All Venues</option>
            {venues.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
          </select>
        )}

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {reports && (
          <div className="space-y-4">
            {/* Revenue Report */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <button onClick={() => toggle("revenue")} className="w-full flex items-center justify-between p-4" data-testid="toggle-revenue">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Revenue Report</span>
                </div>
                {expandedSections.revenue ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {expandedSections.revenue && (
                <div className="px-4 pb-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold" data-testid="text-total-revenue">{fmt(reports.revenue.total)}</p>
                      <p className="text-xs text-muted-foreground">Total Revenue</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => downloadCSV("revenue_report.csv", reports.revenue.byMonth.map(r => ({ Month: r.month, Revenue: r.revenue, Bookings: r.count })))} data-testid="button-download-revenue">
                      <Download className="h-3.5 w-3.5 mr-1" /> CSV
                    </Button>
                  </div>

                  {reports.revenue.byHall.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">By Hall</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="pb-2 pr-4">Hall</th><th className="pb-2 pr-4">Venue</th><th className="pb-2 pr-4 text-right">Revenue</th><th className="pb-2 text-right">Bookings</th></tr></thead>
                          <tbody>
                            {reports.revenue.byHall.map(r => (
                              <tr key={r.hallId} className="border-b border-border/50"><td className="py-2 pr-4">{r.hallName}</td><td className="py-2 pr-4 text-muted-foreground">{r.venueName}</td><td className="py-2 pr-4 text-right font-medium">{fmt(r.revenue)}</td><td className="py-2 text-right">{r.count}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {reports.revenue.byMonth.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">By Month</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="pb-2 pr-4">Month</th><th className="pb-2 pr-4 text-right">Revenue</th><th className="pb-2 text-right">Bookings</th></tr></thead>
                          <tbody>
                            {reports.revenue.byMonth.map(r => (
                              <tr key={r.month} className="border-b border-border/50"><td className="py-2 pr-4">{r.month}</td><td className="py-2 pr-4 text-right font-medium">{fmt(r.revenue)}</td><td className="py-2 text-right">{r.count}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bookings Report */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <button onClick={() => toggle("bookings")} className="w-full flex items-center justify-between p-4" data-testid="toggle-bookings">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Bookings Report</span>
                </div>
                {expandedSections.bookings ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {expandedSections.bookings && (
                <div className="px-4 pb-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold" data-testid="text-total-bookings">{reports.bookings.total}</p>
                      <p className="text-xs text-muted-foreground">Total Bookings</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => downloadCSV("bookings_report.csv", reports.bookings.byStatus.map(s => ({ Status: STATUS_LABELS[s.status] || s.status, Count: s.count })))} data-testid="button-download-bookings">
                      <Download className="h-3.5 w-3.5 mr-1" /> CSV
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {reports.bookings.byStatus.map(s => (
                      <div key={s.status} className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[s.status] || "bg-gray-400"}`} />
                        <span className="text-sm flex-1">{STATUS_LABELS[s.status] || s.status}</span>
                        <span className="text-sm font-medium">{s.count}</span>
                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${STATUS_COLORS[s.status] || "bg-gray-400"}`} style={{ width: `${reports.bookings.total > 0 ? (s.count / reports.bookings.total) * 100 : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {reports.bookings.byHall.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">By Hall</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="pb-2 pr-4">Hall</th><th className="pb-2 pr-4">Venue</th><th className="pb-2 text-right">Count</th></tr></thead>
                          <tbody>
                            {reports.bookings.byHall.map(h => (
                              <tr key={h.hallId} className="border-b border-border/50"><td className="py-2 pr-4">{h.hallName}</td><td className="py-2 pr-4 text-muted-foreground">{h.venueName}</td><td className="py-2 text-right font-medium">{h.count}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {reports.bookings.byMonth.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">By Month</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="pb-2 pr-4">Month</th><th className="pb-2 text-right">Bookings</th></tr></thead>
                          <tbody>
                            {reports.bookings.byMonth.map(m => (
                              <tr key={m.month} className="border-b border-border/50"><td className="py-2 pr-4">{m.month}</td><td className="py-2 text-right font-medium">{m.count}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Occupancy Report */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <button onClick={() => toggle("occupancy")} className="w-full flex items-center justify-between p-4" data-testid="toggle-occupancy">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Occupancy Report</span>
                </div>
                {expandedSections.occupancy ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {expandedSections.occupancy && (
                <div className="px-4 pb-4 space-y-4">
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => downloadCSV("occupancy_report.csv", reports.occupancy.map(o => ({ Hall: o.hallName, Venue: o.venueName, "Days Booked": o.totalDaysBooked, Bookings: o.bookingCount })))} data-testid="button-download-occupancy">
                      <Download className="h-3.5 w-3.5 mr-1" /> CSV
                    </Button>
                  </div>
                  {reports.occupancy.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="pb-2 pr-4">Hall</th><th className="pb-2 pr-4">Venue</th><th className="pb-2 pr-4 text-right">Days Booked</th><th className="pb-2 text-right">Bookings</th></tr></thead>
                        <tbody>
                          {reports.occupancy.map(o => (
                            <tr key={o.hallId} className="border-b border-border/50"><td className="py-2 pr-4">{o.hallName}</td><td className="py-2 pr-4 text-muted-foreground">{o.venueName}</td><td className="py-2 pr-4 text-right font-medium">{o.totalDaysBooked}</td><td className="py-2 text-right">{o.bookingCount}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-4">No occupancy data available</p>
                  )}
                </div>
              )}
            </div>

            {/* Review Summary */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <button onClick={() => toggle("reviews")} className="w-full flex items-center justify-between p-4" data-testid="toggle-reviews">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Review Summary</span>
                </div>
                {expandedSections.reviews ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {expandedSections.reviews && (
                <div className="px-4 pb-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold" data-testid="text-avg-rating">{reports.reviews.avgRating}</p>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`h-4 w-4 ${s <= Math.round(reports.reviews.avgRating) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{reports.reviews.total} total reviews</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => downloadCSV("reviews_report.csv", reports.reviews.recent.map(r => ({ Rating: r.rating, Comment: r.comment || "", Planner: r.plannerName, Venue: r.venueName })))} data-testid="button-download-reviews">
                      <Download className="h-3.5 w-3.5 mr-1" /> CSV
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    {reports.reviews.byRating.map(r => (
                      <div key={r.rating} className="flex items-center gap-2">
                        <span className="text-xs w-8 text-right">{r.rating}★</span>
                        <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${reports.reviews.total > 0 ? (r.count / reports.reviews.total) * 100 : 0}%` }} />
                        </div>
                        <span className="text-xs w-8 text-muted-foreground">{r.count}</span>
                      </div>
                    ))}
                  </div>

                  {reports.reviews.recent.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Recent Reviews</p>
                      <div className="space-y-3">
                        {reports.reviews.recent.map(r => (
                          <div key={r.id} className="border border-border/50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{r.plannerName}</span>
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star key={s} className={`h-3 w-3 ${s <= r.rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`} />
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">{r.venueName}</p>
                            {r.comment && <p className="text-sm">{r.comment}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cancellation Report */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <button onClick={() => toggle("cancellations")} className="w-full flex items-center justify-between p-4" data-testid="toggle-cancellations">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-400" />
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cancellation Report</span>
                </div>
                {expandedSections.cancellations ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {expandedSections.cancellations && (
                <div className="px-4 pb-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-6">
                      <div>
                        <p className="text-2xl font-bold" data-testid="text-total-cancellations">{reports.cancellations.total}</p>
                        <p className="text-xs text-muted-foreground">Total Cancellations</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-400">{reports.cancellations.rate}%</p>
                        <p className="text-xs text-muted-foreground">Cancellation Rate</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => downloadCSV("cancellation_report.csv", reports.cancellations.byReason.map(r => ({ Reason: r.reason, Count: r.count })))} data-testid="button-download-cancellations">
                      <Download className="h-3.5 w-3.5 mr-1" /> CSV
                    </Button>
                  </div>

                  {reports.cancellations.byReason.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">By Reason</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="pb-2 pr-4">Reason</th><th className="pb-2 text-right">Count</th></tr></thead>
                          <tbody>
                            {reports.cancellations.byReason.map((r, i) => (
                              <tr key={i} className="border-b border-border/50"><td className="py-2 pr-4">{r.reason}</td><td className="py-2 text-right font-medium">{r.count}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {reports.cancellations.total === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">No cancellations — great job!</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}