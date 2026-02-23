import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, MapPin, Clock, X, AlertTriangle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

export default function Bookings() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);

  const { data: bookings, isLoading } = useQuery<any[]>({
    queryKey: ["/api/bookings"],
    enabled: !!user,
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ bookingId, status, reason }: { bookingId: string; status: string; reason?: string }) => {
      await apiRequest("PATCH", `/api/bookings/${bookingId}/status`, {
        status,
        cancellationReason: reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setCancellingBookingId(null);
      setCancellationReason("");
      toast({ title: "Done", description: "Your request has been submitted." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Could not process request.", variant: "destructive" });
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

  const statusColor = (status: string) => {
    switch (status) {
      case "confirmed": case "completed": case "paid": return "bg-green-500/20 text-green-400 hover:bg-green-500/30 border-none";
      case "requested": case "accepted": return "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border-none";
      case "cancellation_requested": return "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-none";
      case "cancelled": return "bg-red-500/20 text-red-400 hover:bg-red-500/30 border-none";
      default: return "bg-secondary text-white/60 border-none";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "cancellation_requested": return "Cancellation Pending";
      default: return status;
    }
  };

  const canDirectCancel = (status: string) => {
    return status === "requested" || status === "accepted";
  };

  const needsCancellationRequest = (status: string) => {
    return status === "paid" || status === "confirmed";
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-16 p-6">
      <h1 className="text-2xl font-serif font-bold mb-6" data-testid="text-bookings-title">My Bookings</h1>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-card border border-border rounded-xl p-4">
              <div className="flex gap-4">
                <Skeleton className="w-24 h-24 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : bookings && bookings.length > 0 ? (
        <div className="space-y-4">
          {bookings.map((booking: any) => (
            <div key={booking.id} className="bg-card border border-border rounded-xl overflow-hidden group" data-testid={`card-booking-${booking.id}`}>
              <div className="flex gap-4 p-4">
                <img src={booking.venue?.imageUrl || "/images/hero-venue.png"} className="w-24 h-24 rounded-lg object-cover" alt="Venue" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-serif font-semibold truncate pr-2" data-testid={`text-booking-venue-${booking.id}`}>
                      {booking.venue?.title || "Venue"}
                    </h3>
                    <Badge variant="secondary" className={statusColor(booking.status)} data-testid={`badge-status-${booking.id}`}>
                      {statusLabel(booking.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-primary font-medium mb-1">{booking.hall?.name || "Hall"}</p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{booking.startDate ? format(new Date(booking.startDate), "MMM dd, yyyy") : "TBD"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">{booking.venue?.city || ""}</span>
                    </div>
                  </div>
                </div>
              </div>

              {booking.status === "accepted" && (
                <div className="mx-4 mt-0 mb-0 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2" data-testid={`banner-expiry-${booking.id}`}>
                  <Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="text-xs text-amber-600 dark:text-amber-400">
                    <span className="font-semibold">Payment required within 24 hours.</span>{" "}
                    This booking will be automatically cancelled if payment is not completed{booking.acceptedAt ? ` by ${format(new Date(new Date(booking.acceptedAt).getTime() + 24 * 60 * 60 * 1000), "MMM dd, yyyy 'at' h:mm a")}` : " within 24 hours"}.
                  </div>
                </div>
              )}

              <div className="bg-secondary px-4 py-3">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total:</span>{" "}
                    <span className="font-bold text-foreground" data-testid={`text-booking-amount-${booking.id}`}>
                      ₦{booking.totalAmount?.toLocaleString() || "0"}
                    </span>
                  </div>
                  {booking.depositAmount && booking.balanceAmount > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Deposit: ₦{booking.depositAmount?.toLocaleString()} | Balance: ₦{booking.balanceAmount?.toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {canDirectCancel(booking.status) && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1.5 h-8 text-xs" data-testid={`button-cancel-booking-${booking.id}`}>
                          <X className="h-3.5 w-3.5" /> Cancel Booking
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to cancel this booking for {booking.venue?.title}?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-border">Keep Booking</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => cancelMutation.mutate({ bookingId: booking.id, status: "cancelled" })}
                          >
                            Yes, Cancel
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  {needsCancellationRequest(booking.status) && (
                    <AlertDialog open={cancellingBookingId === booking.id} onOpenChange={(open) => {
                      if (!open) {
                        setCancellingBookingId(null);
                        setCancellationReason("");
                      }
                    }}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 gap-1.5 h-8 text-xs"
                          onClick={() => setCancellingBookingId(booking.id)}
                          data-testid={`button-request-cancel-${booking.id}`}
                        >
                          <AlertTriangle className="h-3.5 w-3.5" /> Request Cancellation
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Request Cancellation</AlertDialogTitle>
                          <AlertDialogDescription>
                            Since you've already made a payment, cancellation requires approval from the venue owner. Please provide a reason for your request.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-2">
                          <Textarea
                            placeholder="Reason for cancellation (e.g., change of plans, date conflict)..."
                            value={cancellationReason}
                            onChange={(e) => setCancellationReason(e.target.value)}
                            className="bg-background border-border min-h-[100px]"
                            data-testid="input-cancellation-reason"
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-border">Keep Booking</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-orange-600 hover:bg-orange-700"
                            disabled={!cancellationReason.trim() || cancelMutation.isPending}
                            onClick={() => cancelMutation.mutate({
                              bookingId: booking.id,
                              status: "cancellation_requested",
                              reason: cancellationReason.trim(),
                            })}
                          >
                            {cancelMutation.isPending ? "Submitting..." : "Submit Request"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  {booking.status === "cancellation_requested" && (
                    <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-500/10 px-3 py-1.5 rounded-lg">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Awaiting venue owner's approval</span>
                    </div>
                  )}
                </div>
              </div>

              {booking.cancellationReason && (booking.status === "cancellation_requested" || booking.status === "cancelled") && (
                <div className="px-4 py-2 bg-white/[0.02] text-xs text-muted-foreground border-t border-border">
                  <span className="font-medium">Cancellation reason:</span> {booking.cancellationReason}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg mb-2">No bookings yet</p>
          <p className="text-sm mb-4">Find a venue and create your first booking</p>
          <Button variant="link" asChild className="text-primary" data-testid="link-find-venue">
            <Link href="/search">Find a venue</Link>
          </Button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
