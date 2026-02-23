import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Calendar, MapPin, User, Check, X, Building2, AlertTriangle, Ban, Clock, CreditCard, CheckCircle2, XCircle, CircleDot, Users } from "lucide-react";
import { format } from "date-fns";

type StatusFilter = "all" | "requested" | "accepted" | "paid" | "confirmed" | "completed" | "cancelled" | "cancellation_requested";

const STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string; description: string }> = {
  requested: {
    label: "Pending Approval",
    color: "bg-yellow-500/20 text-yellow-400 border-none",
    dotColor: "bg-yellow-400",
    description: "Awaiting your review and approval",
  },
  accepted: {
    label: "Awaiting Payment",
    color: "bg-blue-500/20 text-blue-400 border-none",
    dotColor: "bg-blue-400",
    description: "Approved — waiting for planner to submit payment",
  },
  paid: {
    label: "Deposit Received",
    color: "bg-emerald-500/20 text-emerald-400 border-none",
    dotColor: "bg-emerald-400",
    description: "Deposit paid — pending final confirmation",
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-green-500/20 text-green-400 border-none",
    dotColor: "bg-green-400",
    description: "Fully confirmed and scheduled",
  },
  completed: {
    label: "Completed",
    color: "bg-primary/20 text-primary border-none",
    dotColor: "bg-primary",
    description: "Event successfully completed",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-500/20 text-red-400 border-none",
    dotColor: "bg-red-400",
    description: "Booking has been cancelled",
  },
  cancellation_requested: {
    label: "Cancellation Review",
    color: "bg-orange-500/20 text-orange-400 border-none",
    dotColor: "bg-orange-400",
    description: "Planner has requested cancellation — needs your decision",
  },
};

const FILTER_TABS: { key: StatusFilter; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "All", icon: <CircleDot className="h-3.5 w-3.5" /> },
  { key: "requested", label: "Pending", icon: <Clock className="h-3.5 w-3.5" /> },
  { key: "accepted", label: "Awaiting Payment", icon: <CreditCard className="h-3.5 w-3.5" /> },
  { key: "paid", label: "Deposit Received", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  { key: "confirmed", label: "Confirmed", icon: <Check className="h-3.5 w-3.5" /> },
  { key: "completed", label: "Completed", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  { key: "cancellation_requested", label: "Cancel Review", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  { key: "cancelled", label: "Cancelled", icon: <XCircle className="h-3.5 w-3.5" /> },
];

export default function OwnerBookings() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("all");

  const { data: bookings, isLoading } = useQuery<any[]>({
    queryKey: ["/api/owner/bookings"],
    enabled: !!user && (user.role === "venue_holder" || user.role === "admin"),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      await apiRequest("PATCH", `/api/bookings/${bookingId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/revenue"] });
      toast({ title: "Booking updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not update booking.", variant: "destructive" });
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
        <p className="text-muted-foreground text-center">This area is for venue owners to manage incoming booking requests.</p>
        <BottomNav />
      </div>
    );
  }

  const filteredBookings = activeFilter === "all"
    ? bookings
    : bookings?.filter(b => b.status === activeFilter);

  const statusCounts = bookings?.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const actionableCount = (statusCounts["requested"] || 0) + (statusCounts["cancellation_requested"] || 0);

  const getPaymentInfo = (booking: any) => {
    const deposit = booking.depositAmount || 0;
    const balance = booking.balanceAmount || 0;
    const total = booking.totalAmount || 0;
    const depositPaid = booking.depositPaid;
    const balancePaid = booking.balancePaid;

    if (depositPaid && balancePaid) return { label: "Fully Settled", color: "text-green-400", progress: 100 };
    if (depositPaid && !balancePaid && balance > 0) return { label: "Deposit Paid", color: "text-emerald-400", progress: deposit > 0 ? Math.round((deposit / total) * 100) : 50 };
    if (booking.status === "paid") return { label: "Deposit Received", color: "text-emerald-400", progress: deposit > 0 ? Math.round((deposit / total) * 100) : 50 };
    return { label: "Unpaid", color: "text-muted-foreground", progress: 0 };
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <div className="p-6 pt-8">
        <div className="mb-4">
          <span className="text-primary text-xs font-bold tracking-wider uppercase">Dashboard</span>
          <h1 className="text-2xl font-serif font-bold text-foreground" data-testid="text-owner-bookings-title">Booking Management</h1>
          {actionableCount > 0 && (
            <p className="text-sm text-yellow-400 mt-1" data-testid="text-actionable-count">
              {actionableCount} booking{actionableCount !== 1 ? "s" : ""} require your attention
            </p>
          )}
        </div>

        {!isLoading && bookings && bookings.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-5" data-testid="booking-summary-stats">
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-yellow-400">{statusCounts["requested"] || 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">Pending</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-blue-400">{statusCounts["accepted"] || 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">Awaiting Pay</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-green-400">{(statusCounts["confirmed"] || 0) + (statusCounts["paid"] || 0)}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">Active</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-primary">{statusCounts["completed"] || 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">Completed</p>
            </div>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-6 px-6 scrollbar-hide" data-testid="booking-status-tabs">
          {FILTER_TABS.map(tab => {
            const count = tab.key === "all" ? (bookings?.length || 0) : (statusCounts[tab.key] || 0);
            if (tab.key !== "all" && count === 0) return null;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                  activeFilter === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-border"
                }`}
                data-testid={`tab-filter-${tab.key}`}
              >
                {tab.icon}
                {tab.label}
                {count > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeFilter === tab.key ? "bg-white/20" : "bg-secondary"
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card border border-border rounded-xl p-4">
                <div className="flex gap-4">
                  <Skeleton className="w-20 h-20 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredBookings && filteredBookings.length > 0 ? (
          <div className="space-y-4">
            {filteredBookings.map((booking: any) => {
              const config = STATUS_CONFIG[booking.status] || { label: booking.status, color: "bg-secondary text-white/60 border-none", dotColor: "bg-white/40", description: "" };
              const payment = getPaymentInfo(booking);

              return (
                <div
                  key={booking.id}
                  className={`bg-card border rounded-xl overflow-hidden ${
                    booking.status === "requested" ? "border-yellow-500/30" :
                    booking.status === "cancellation_requested" ? "border-orange-500/30" :
                    "border-border"
                  }`}
                  data-testid={`card-owner-booking-${booking.id}`}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif font-semibold truncate" data-testid={`text-booking-venue-${booking.id}`}>
                          {booking.venue?.title || "Venue"}
                        </h3>
                        <p className="text-xs text-primary font-medium">{booking.hall?.name || "Hall"}</p>
                      </div>
                      <Badge variant="secondary" className={config.color} data-testid={`badge-status-${booking.id}`}>
                        {config.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground mb-3">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        <span className="truncate">{booking.planner?.name || "Planner"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{booking.startDate ? format(new Date(booking.startDate), "MMM dd, yyyy") : "TBD"}</span>
                      </div>
                      {booking.guestCount && (
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          <span>{booking.guestCount} guests</span>
                        </div>
                      )}
                      {booking.eventType && (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" />
                          <span>{booking.eventType}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Total:</span>{" "}
                          <span className="font-bold text-foreground" data-testid={`text-booking-amount-${booking.id}`}>
                            ₦{booking.totalAmount?.toLocaleString() || "0"}
                          </span>
                        </div>
                        <span className={`text-xs font-medium ${payment.color}`} data-testid={`text-payment-status-${booking.id}`}>
                          {payment.label}
                        </span>
                      </div>

                      {booking.depositAmount > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">
                              Deposit: ₦{booking.depositAmount?.toLocaleString()}
                              {booking.depositPaid && <Check className="h-3 w-3 inline ml-1 text-green-400" />}
                            </span>
                            <span className="text-muted-foreground">
                              Balance: ₦{booking.balanceAmount?.toLocaleString()}
                              {booking.balancePaid && <Check className="h-3 w-3 inline ml-1 text-green-400" />}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${payment.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {booking.status === "requested" && (
                    <div className="bg-yellow-500/5 border-t border-yellow-500/20 px-4 py-3">
                      <p className="text-xs text-yellow-400/80 mb-2.5">{config.description}</p>
                      <div className="flex gap-3">
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1.5 h-9"
                          onClick={() => statusMutation.mutate({ bookingId: booking.id, status: "accepted" })}
                          disabled={statusMutation.isPending}
                          data-testid={`button-accept-${booking.id}`}
                        >
                          <Check className="h-4 w-4" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1.5 h-9"
                          onClick={() => statusMutation.mutate({ bookingId: booking.id, status: "cancelled" })}
                          disabled={statusMutation.isPending}
                          data-testid={`button-reject-${booking.id}`}
                        >
                          <X className="h-4 w-4" /> Decline
                        </Button>
                      </div>
                    </div>
                  )}

                  {booking.status === "cancellation_requested" && (
                    <div className="border-t border-orange-500/20">
                      {booking.cancellationReason && (
                        <div className="px-4 py-3 bg-orange-500/5">
                          <p className="text-xs text-muted-foreground mb-1 font-medium">Planner's reason:</p>
                          <p className="text-sm text-orange-300">{booking.cancellationReason}</p>
                        </div>
                      )}
                      <div className="px-4 py-3 flex gap-3 bg-orange-500/5 border-t border-orange-500/10">
                        <Button
                          size="sm"
                          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white gap-1.5 h-9"
                          onClick={() => statusMutation.mutate({ bookingId: booking.id, status: "cancelled" })}
                          disabled={statusMutation.isPending}
                          data-testid={`button-approve-cancel-${booking.id}`}
                        >
                          <Ban className="h-4 w-4" /> Approve Cancellation
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10 gap-1.5 h-9"
                          onClick={() => statusMutation.mutate({ bookingId: booking.id, status: "confirmed" })}
                          disabled={statusMutation.isPending}
                          data-testid={`button-deny-cancel-${booking.id}`}
                        >
                          <Check className="h-4 w-4" /> Keep Booking
                        </Button>
                      </div>
                    </div>
                  )}

                  {booking.status === "accepted" && (
                    <div className="bg-blue-500/5 border-t border-blue-500/20 px-4 py-3">
                      <p className="text-xs text-blue-400">{config.description}</p>
                    </div>
                  )}

                  {booking.status === "paid" && (
                    <div className="bg-emerald-500/5 border-t border-emerald-500/20 px-4 py-3">
                      <p className="text-xs text-emerald-400">{config.description}</p>
                    </div>
                  )}

                  {booking.status === "completed" && (
                    <div className="bg-primary/5 border-t border-primary/20 px-4 py-3">
                      <p className="text-xs text-primary">{config.description}</p>
                    </div>
                  )}

                  {booking.planner?.email && (
                    <div className="px-4 py-2 bg-white/[0.02] text-xs text-muted-foreground border-t border-border">
                      Contact: {booking.planner.email}{booking.planner.phone ? ` | ${booking.planner.phone}` : ""}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
            {activeFilter === "all" ? (
              <>
                <p className="text-lg mb-2">No bookings yet</p>
                <p className="text-sm">When planners book your venues, their requests will appear here</p>
              </>
            ) : (
              <>
                <p className="text-lg mb-2">No {STATUS_CONFIG[activeFilter]?.label.toLowerCase()} bookings</p>
                <p className="text-sm">There are no bookings with this status right now</p>
                <Button
                  variant="ghost"
                  className="mt-4 text-primary hover:text-primary/80"
                  onClick={() => setActiveFilter("all")}
                  data-testid="button-show-all"
                >
                  View all bookings
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
