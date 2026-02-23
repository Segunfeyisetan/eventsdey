import { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Calendar as CalendarIcon, Users, Clock, CreditCard, ShieldCheck, Info, MessageCircle, Banknote, Eye, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { VenueWithHalls } from "@/components/VenueCard";
import BottomNav from "@/components/BottomNav";

type BookingPath = null | "viewing" | "direct";

export default function BookHall() {
  const [match, params] = useRoute("/book/:venueId/:hallId");
  const venueId = params?.venueId;
  const hallId = params?.hallId;
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const searchParams = new URLSearchParams(window.location.search);
  const selectedDate = searchParams.get("date");

  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("18:00");
  const [guests, setGuests] = useState("100");
  const [bookingPath, setBookingPath] = useState<BookingPath>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [viewingMessage, setViewingMessage] = useState("");

  const { data: venue, isLoading } = useQuery<VenueWithHalls>({
    queryKey: [`/api/venues/${venueId}`],
    enabled: !!venueId,
  });

  const hall = venue?.halls.find(h => h.id === hallId);

  const depositPct = hall?.depositPercentage ?? 100;
  const balanceDueDays = hall?.balanceDueDays ?? 7;
  const totalWithFee = hall ? Math.round(hall.price * 1.05) : 0;
  const depositAmount = Math.round(totalWithFee * depositPct / 100);
  const balanceAmount = totalWithFee - depositAmount;
  const isFullPayment = depositPct === 100;
  const venueLocation = venue ? [venue.address, venue.city].filter(Boolean).join(", ") : "";

  const bookingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bookings", {
        venueId: venue!.id,
        hallId: hall!.id,
        startDate: selectedDate ? new Date(selectedDate + "T00:00:00").toISOString() : undefined,
        startTime,
        endTime,
        guests: parseInt(guests) || 100,
        totalAmount: totalWithFee,
        depositAmount,
        balanceAmount,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking Request Sent!",
        description: `Your request for ${hall!.name} at ${venue!.title} has been sent.`,
        duration: 5000,
      });
      navigate("/bookings");
    },
    onError: (err: any) => {
      const msg = err?.message || "Booking failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const viewingMutation = useMutation({
    mutationFn: async () => {
      const dateStr = selectedDate ? format(new Date(selectedDate + "T00:00:00"), "MMM dd, yyyy") : "";
      const defaultMsg = `Hi, I'm interested in viewing ${hall!.name} at ${venue!.title}. Could we arrange a visit${dateStr ? ` around ${dateStr}` : ""}? I'm planning an event for approximately ${guests} guests.`;
      const body = viewingMessage.trim() || defaultMsg;

      await apiRequest("POST", "/api/messages", {
        toUserId: venue!.ownerUserId,
        bookingId: null,
        body,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Viewing Request Sent!",
        description: "The venue owner will respond to your message shortly.",
        duration: 5000,
      });
      navigate("/messages");
    },
    onError: (err: any) => {
      const msg = err?.message || "Could not send message";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const handleAction = () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to continue." });
      navigate("/auth");
      return;
    }
    if (!acceptedTerms) {
      toast({ title: "Terms Required", description: "Please accept the terms and conditions to proceed." });
      return;
    }
    if (bookingPath === "viewing") {
      viewingMutation.mutate();
    } else {
      bookingMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const isDatePast = selectedDate ? new Date(selectedDate + "T00:00:00") < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) : false;

  if (!venue || !hall || !selectedDate || isDatePast) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-4">{isDatePast ? "Cannot book a past date" : "Booking information not found"}</p>
          <Link href={venueId ? `/venue/${venueId}` : "/search"}>
            <Button variant="outline" data-testid="link-back-search">{venueId ? "Back to Venue" : "Back to Search"}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const formattedDate = format(new Date(selectedDate + "T00:00:00"), "EEEE, MMMM d, yyyy");

  if (!bookingPath) {
    return (
      <div className="min-h-screen bg-background text-foreground pb-24 pt-16">
        <BottomNav />
        <div className="px-5">
          <div className="flex items-center gap-3 mb-6">
            <Link href={`/venue/${venueId}`}>
              <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-back-venue">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="font-serif text-2xl font-bold">Book {hall.name}</h1>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 mb-6">
            <div className="flex gap-4">
              <img src={hall.imageUrl || "/images/hero-venue.png"} className="w-20 h-20 rounded-lg object-cover" alt={hall.name} />
              <div className="flex-1 min-w-0">
                <h3 className="font-serif font-bold truncate" data-testid="text-hall-name">{hall.name}</h3>
                <p className="text-sm text-muted-foreground truncate">at {venue.title}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <CalendarIcon className="h-3 w-3 shrink-0" />
                  <span>{formattedDate}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5 mb-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Start Time</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger className="bg-card border-border h-12" data-testid="select-start-time">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="06:00">06:00 AM</SelectItem>
                    <SelectItem value="07:00">07:00 AM</SelectItem>
                    <SelectItem value="08:00">08:00 AM</SelectItem>
                    <SelectItem value="09:00">09:00 AM</SelectItem>
                    <SelectItem value="10:00">10:00 AM</SelectItem>
                    <SelectItem value="11:00">11:00 AM</SelectItem>
                    <SelectItem value="12:00">12:00 PM</SelectItem>
                    <SelectItem value="13:00">01:00 PM</SelectItem>
                    <SelectItem value="14:00">02:00 PM</SelectItem>
                    <SelectItem value="15:00">03:00 PM</SelectItem>
                    <SelectItem value="16:00">04:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> End Time</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger className="bg-card border-border h-12" data-testid="select-end-time">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12:00">12:00 PM</SelectItem>
                    <SelectItem value="13:00">01:00 PM</SelectItem>
                    <SelectItem value="14:00">02:00 PM</SelectItem>
                    <SelectItem value="15:00">03:00 PM</SelectItem>
                    <SelectItem value="16:00">04:00 PM</SelectItem>
                    <SelectItem value="17:00">05:00 PM</SelectItem>
                    <SelectItem value="18:00">06:00 PM</SelectItem>
                    <SelectItem value="19:00">07:00 PM</SelectItem>
                    <SelectItem value="20:00">08:00 PM</SelectItem>
                    <SelectItem value="21:00">09:00 PM</SelectItem>
                    <SelectItem value="22:00">10:00 PM</SelectItem>
                    <SelectItem value="23:00">11:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Number of Guests</Label>
              <Input
                type="number"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="h-12 bg-card border-border"
                placeholder="Enter number of guests"
                data-testid="input-guests"
              />
              <p className="text-xs text-muted-foreground">Max capacity: {hall.capacity} guests</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center font-medium">How would you like to proceed?</p>

            <button
              onClick={() => setBookingPath("viewing")}
              className="w-full text-left p-5 rounded-xl border transition-all hover:border-primary/50 hover:bg-primary/5 border-border bg-card"
              data-testid="button-path-viewing"
            >
              <div className="flex items-start gap-4">
                <div className="bg-blue-500/20 p-3 rounded-full shrink-0">
                  <Eye className="h-6 w-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base">Chat & Book a Viewing</h3>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Send a message to the venue owner to arrange a visit before committing.
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setBookingPath("direct")}
              className="w-full text-left p-5 rounded-xl border transition-all hover:border-primary/50 hover:bg-primary/5 border-border bg-card"
              data-testid="button-path-direct"
            >
              <div className="flex items-start gap-4">
                <div className="bg-primary/20 p-3 rounded-full shrink-0">
                  <Banknote className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base">Pay & Book Directly</h3>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Secure your date now by submitting a booking request.
                  </p>
                  <p className="text-xs text-primary font-medium mt-2">
                    From ₦{hall.price.toLocaleString()} per day
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (bookingPath === "viewing") {
    const dateStr = selectedDate ? format(new Date(selectedDate + "T00:00:00"), "MMM dd, yyyy") : "";
    return (
      <div className="min-h-screen bg-background text-foreground pb-24 pt-16">
        <BottomNav />
        <div className="px-5">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => { setBookingPath(null); setAcceptedTerms(false); }} data-testid="button-back-path">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-serif text-2xl font-bold">Request a Viewing</h1>
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex gap-4">
                <img src={hall.imageUrl || "/images/hero-venue.png"} className="w-16 h-16 rounded-lg object-cover" alt={hall.name} />
                <div>
                  <h3 className="font-serif font-bold line-clamp-1">{hall.name}</h3>
                  <p className="text-sm text-muted-foreground">at {venue.title}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <CalendarIcon className="h-3 w-3" />
                    <span>{formattedDate}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Your Message to the Venue Owner</Label>
              <textarea
                value={viewingMessage}
                onChange={(e) => setViewingMessage(e.target.value)}
                placeholder={`Hi, I'm interested in viewing ${hall.name} at ${venue.title}. Could we arrange a visit${dateStr ? ` around ${dateStr}` : ""}? I'm planning an event for approximately ${guests} guests.`}
                className="w-full min-h-[120px] bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                data-testid="input-viewing-message"
              />
              <p className="text-xs text-muted-foreground">Leave blank to send the default message above</p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex gap-3 items-start">
              <MessageCircle className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-300">
                Your message will be sent to the venue owner. They'll respond in the Messages section.
              </p>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card/80">
              <Checkbox
                id="terms-viewing"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                className="mt-0.5 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                data-testid="checkbox-terms-viewing"
              />
              <label htmlFor="terms-viewing" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                I agree to the{" "}
                <a href="/terms" target="_blank" className="text-primary hover:underline font-medium">
                  Terms & Conditions
                </a>{" "}
                of Eventsdey Nigeria and this venue's policies.
              </label>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1 h-12"
                onClick={() => { setBookingPath(null); setAcceptedTerms(false); }}
                data-testid="button-back-step"
              >
                Back
              </Button>
              <Button
                className="flex-[2] h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-600/20 gap-2"
                onClick={handleAction}
                disabled={!acceptedTerms || viewingMutation.isPending}
                data-testid="button-send-viewing"
              >
                <MessageCircle className="h-4 w-4" />
                {viewingMutation.isPending ? "Sending..." : "Send Viewing Request"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 pt-16">
      <BottomNav />
      <div className="px-5">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => { setBookingPath(null); setAcceptedTerms(false); }} data-testid="button-back-path">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-serif text-2xl font-bold">Confirm Booking</h1>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <div className="flex gap-4">
              <img src={hall.imageUrl || "/images/hero-venue.png"} className="w-20 h-20 rounded-lg object-cover" alt={hall.name} />
              <div>
                <h3 className="font-serif font-bold line-clamp-1" data-testid="text-confirm-hall">{hall.name}</h3>
                <p className="text-sm font-medium text-foreground/80">at {venue.title}</p>
                <p className="text-xs text-muted-foreground">{venueLocation}</p>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <div className="flex items-center gap-1 bg-secondary px-2 py-1 rounded">
                    <CalendarIcon className="h-3 w-3" />
                    <span>{formattedDate}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {startTime} - {endTime}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {guests} guests</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rate per day</span>
                <span>₦{hall.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service Fee</span>
                <span>₦{(hall.price * 0.05).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                <span>Total</span>
                <span className="text-primary" data-testid="text-total-amount">₦{totalWithFee.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Payment Schedule</h3>

            {isFullPayment ? (
              <div className="flex items-center justify-between p-4 rounded-xl border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/20 p-2 rounded-full text-primary">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold">Full Payment</p>
                    <p className="text-xs text-muted-foreground">Pay the full amount to secure your booking</p>
                  </div>
                </div>
                <span className="font-bold text-xl" data-testid="text-deposit-amount">₦{totalWithFee.toLocaleString()}</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 rounded-xl border border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/20 p-2 rounded-full text-primary">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold">Pay {depositPct}% Deposit Now</p>
                      <p className="text-xs text-muted-foreground">Secure your date</p>
                    </div>
                  </div>
                  <span className="font-bold text-xl" data-testid="text-deposit-amount">₦{depositAmount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="bg-secondary p-2 rounded-full">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold">Pay Balance Later</p>
                      <p className="text-xs text-muted-foreground">{balanceDueDays} days before event</p>
                    </div>
                  </div>
                  <span className="font-bold">₦{balanceAmount.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>

          {!isFullPayment && (
            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex gap-3 items-start">
              <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-300">
                The venue owner requires a {depositPct}% deposit at booking. The remaining {100 - depositPct}% balance is due {balanceDueDays} days before your event.
              </p>
            </div>
          )}

          <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg flex gap-3 items-start">
            <ShieldCheck className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <p className="text-xs text-green-400">
              Your payment is held securely until the booking is confirmed by the host.
            </p>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card/80">
            <Checkbox
              id="terms-direct"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
              className="mt-0.5 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              data-testid="checkbox-terms-direct"
            />
            <label htmlFor="terms-direct" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
              I agree to the{" "}
              <a href="/terms" target="_blank" className="text-primary hover:underline font-medium">
                Terms & Conditions
              </a>{" "}
              of Eventsdey Nigeria and this venue's booking & cancellation policies.
            </label>
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={() => { setBookingPath(null); setAcceptedTerms(false); }}
              data-testid="button-back-step"
            >
              Back
            </Button>
            <Button
              className="flex-[2] h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base shadow-lg shadow-primary/20"
              onClick={handleAction}
              disabled={!acceptedTerms || bookingMutation.isPending}
              data-testid="button-confirm-booking"
            >
              {bookingMutation.isPending ? "Submitting..." : `Submit Booking Request`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
