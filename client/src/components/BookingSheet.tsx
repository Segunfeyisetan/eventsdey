import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarIcon, Users, Clock, CreditCard, ShieldCheck, Info, MessageCircle, Banknote, Eye, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { VenueWithHalls } from "@/components/VenueCard";

interface BookingSheetProps {
  venue: VenueWithHalls;
  hall: VenueWithHalls["halls"][0];
  trigger: React.ReactNode;
}

type BookingPath = null | "viewing" | "direct";

export default function BookingSheet({ venue, hall, trigger }: BookingSheetProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [guests, setGuests] = useState("100");
  const [step, setStep] = useState(1);
  const [bookingPath, setBookingPath] = useState<BookingPath>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [viewingMessage, setViewingMessage] = useState("");
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const depositPct = hall.depositPercentage ?? 100;
  const balanceDueDays = hall.balanceDueDays ?? 7;
  const totalWithFee = Math.round(hall.price * 1.05);
  const depositAmount = Math.round(totalWithFee * depositPct / 100);
  const balanceAmount = totalWithFee - depositAmount;
  const isFullPayment = depositPct === 100;

  const resetState = () => {
    setStep(1);
    setBookingPath(null);
    setAcceptedTerms(false);
    setViewingMessage("");
    setDate(new Date());
    setGuests("100");
  };

  const bookingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bookings", {
        venueId: venue.id,
        hallId: hall.id,
        startDate: date?.toISOString(),
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
        description: `Your request for ${hall.name} at ${venue.title} has been sent. Once accepted, please complete payment within 24 hours to secure your booking.`,
        duration: 8000,
      });
      setOpen(false);
      resetState();
    },
    onError: (err: any) => {
      const msg = err?.message || "Booking failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const viewingMutation = useMutation({
    mutationFn: async () => {
      const defaultMsg = `Hi, I'm interested in viewing ${hall.name} at ${venue.title}. Could we arrange a visit${date ? ` around ${format(date, "MMM dd, yyyy")}` : ""}? I'm planning an event for approximately ${guests} guests.`;
      const body = viewingMessage.trim() || defaultMsg;

      await apiRequest("POST", "/api/messages", {
        toUserId: venue.ownerUserId,
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
      setOpen(false);
      resetState();
    },
    onError: (err: any) => {
      const msg = err?.message || "Could not send message";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const handleAction = () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to continue." });
      setLocation("/auth");
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

  const location = [venue.address, venue.city].filter(Boolean).join(", ");

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
      <SheetTrigger asChild onClick={(e) => {
        if (!user) {
          e.preventDefault();
          toast({ title: "Sign in required", description: "Please sign in to make a booking." });
          setLocation("/auth");
        }
      }}>
        {trigger}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] max-h-[85dvh] rounded-t-3xl border-border bg-background/95 backdrop-blur-xl flex flex-col">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center font-serif text-2xl" data-testid="text-booking-title">
            {step === 1 ? `Book ${hall.name}` : step === 2 ? "How would you like to proceed?" : bookingPath === "viewing" ? "Request a Viewing" : "Confirm Booking"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pb-24">
          {step === 1 && (
            <div className="space-y-6 px-1">
              <div className="space-y-2">
                <Label>Select Date</Label>
                <div className="border border-border rounded-xl p-4 bg-card/80 flex justify-center">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-md border-none"
                    classNames={{
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      day_today: "bg-secondary text-accent-foreground",
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Select defaultValue="10:00">
                    <SelectTrigger className="bg-card border-border h-12" data-testid="select-start-time">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="08:00">08:00 AM</SelectItem>
                      <SelectItem value="10:00">10:00 AM</SelectItem>
                      <SelectItem value="12:00">12:00 PM</SelectItem>
                      <SelectItem value="14:00">02:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Select defaultValue="18:00">
                    <SelectTrigger className="bg-card border-border h-12" data-testid="select-end-time">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:00">04:00 PM</SelectItem>
                      <SelectItem value="18:00">06:00 PM</SelectItem>
                      <SelectItem value="20:00">08:00 PM</SelectItem>
                      <SelectItem value="22:00">10:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Number of Guests</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="number"
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="pl-10 h-12 bg-card border-border"
                    data-testid="input-guests"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Max capacity: {hall.capacity}</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 px-1">
              <div className="bg-card border border-border rounded-xl p-4 mb-2">
                <div className="flex gap-4">
                  <img src={hall.imageUrl || "/images/hero-venue.png"} className="w-16 h-16 rounded-lg object-cover" alt="Hall" />
                  <div>
                    <h3 className="font-serif font-bold line-clamp-1">{hall.name}</h3>
                    <p className="text-sm text-muted-foreground">at {venue.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <CalendarIcon className="h-3 w-3" />
                      <span>{date ? format(date, "MMM dd, yyyy") : "No date"}</span>
                      <Users className="h-3 w-3 ml-2" />
                      <span>{guests} guests</span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground text-center">Choose how you'd like to proceed</p>

              <button
                onClick={() => { setBookingPath("viewing"); setStep(3); }}
                className={`w-full text-left p-5 rounded-xl border transition-all hover:border-primary/50 hover:bg-primary/5 border-border bg-card`}
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
                      Send a message to the venue owner to arrange a visit before committing. Great for first-time visits.
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => { setBookingPath("direct"); setStep(3); }}
                className={`w-full text-left p-5 rounded-xl border transition-all hover:border-primary/50 hover:bg-primary/5 border-border bg-card`}
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
                      Secure your date now by submitting a booking request with payment details.
                    </p>
                    <p className="text-xs text-primary font-medium mt-2">
                      From ₦{hall.price.toLocaleString()} per day
                    </p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {step === 3 && bookingPath === "viewing" && (
            <div className="space-y-6 px-1">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex gap-4">
                  <img src={hall.imageUrl || "/images/hero-venue.png"} className="w-16 h-16 rounded-lg object-cover" alt="Hall" />
                  <div>
                    <h3 className="font-serif font-bold line-clamp-1">{hall.name}</h3>
                    <p className="text-sm text-muted-foreground">at {venue.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <CalendarIcon className="h-3 w-3" />
                      <span>{date ? format(date, "MMM dd, yyyy") : "No date"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Your Message to the Venue Owner</Label>
                <textarea
                  value={viewingMessage}
                  onChange={(e) => setViewingMessage(e.target.value)}
                  placeholder={`Hi, I'm interested in viewing ${hall.name} at ${venue.title}. Could we arrange a visit${date ? ` around ${format(date, "MMM dd, yyyy")}` : ""}? I'm planning an event for approximately ${guests} guests.`}
                  className="w-full min-h-[120px] bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                  data-testid="input-viewing-message"
                />
                <p className="text-xs text-muted-foreground">Leave blank to send the default message above</p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex gap-3 items-start">
                <MessageCircle className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-300">
                  Your message will be sent to the venue owner. They'll respond in the Messages section. You can then decide to proceed with booking.
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
            </div>
          )}

          {step === 3 && bookingPath === "direct" && (
            <div className="space-y-6 px-1">
              <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                <div className="flex gap-4">
                  <img src={hall.imageUrl || "/images/hero-venue.png"} className="w-20 h-20 rounded-lg object-cover" alt="Hall" />
                  <div>
                    <h3 className="font-serif font-bold line-clamp-1" data-testid="text-confirm-hall">{hall.name}</h3>
                    <p className="text-sm font-medium text-foreground/80">at {venue.title}</p>
                    <p className="text-xs text-muted-foreground">{location}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs bg-secondary px-2 py-1 rounded w-fit">
                      <CalendarIcon className="h-3 w-3" />
                      <span>{date ? format(date, "MMM dd, yyyy") : "Select date"}</span>
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

              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg flex gap-3 items-start" data-testid="notice-expiry-policy">
                <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  <span className="font-semibold">Important:</span> Once the venue owner accepts your booking, payment must be completed within 24 hours. Unpaid bookings are automatically cancelled after this deadline.
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
            </div>
          )}
        </div>

        <SheetFooter className="absolute bottom-0 left-0 right-0 p-6 bg-background/95 border-t border-border backdrop-blur-xl fixed-bottom-safe">
          <div className="w-full flex gap-4">
            {step > 1 && (
              <Button
                variant="outline"
                className="flex-1 h-12"
                onClick={() => {
                  if (step === 3) { setStep(2); setAcceptedTerms(false); }
                  else setStep(1);
                }}
                data-testid="button-back"
              >
                Back
              </Button>
            )}
            {step === 1 && (
              <Button
                className="flex-[2] h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base shadow-lg shadow-primary/20"
                onClick={() => setStep(2)}
                disabled={!date}
                data-testid="button-booking-continue"
              >
                Continue
              </Button>
            )}
            {step === 2 && (
              <div className="flex-[2] text-center text-xs text-muted-foreground flex items-center justify-center">
                Select an option above to continue
              </div>
            )}
            {step === 3 && bookingPath === "viewing" && (
              <Button
                className="flex-[2] h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-600/20 gap-2"
                onClick={handleAction}
                disabled={!acceptedTerms || viewingMutation.isPending}
                data-testid="button-send-viewing"
              >
                <MessageCircle className="h-4 w-4" />
                {viewingMutation.isPending ? "Sending..." : "Send Viewing Request"}
              </Button>
            )}
            {step === 3 && bookingPath === "direct" && (
              <Button
                className="flex-[2] h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base shadow-lg shadow-primary/20"
                onClick={handleAction}
                disabled={!acceptedTerms || bookingMutation.isPending}
                data-testid="button-booking-action"
              >
                {bookingMutation.isPending
                  ? "Submitting..."
                  : isFullPayment
                    ? `Pay ₦${totalWithFee.toLocaleString()}`
                    : `Pay Deposit ₦${depositAmount.toLocaleString()}`}
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
