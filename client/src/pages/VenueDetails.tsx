import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Heart, Star, MapPin, Users, ShieldCheck, ChevronRight, MessageSquare, Send, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import HallAvailabilityCalendar from "@/components/HallAvailabilityCalendar";
import type { VenueWithHalls } from "@/components/VenueCard";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface HallDateState {
  date: string | null;
  status: "available" | "booked" | "blocked" | "past" | null;
}

export default function VenueDetails() {
  const [match, params] = useRoute("/venue/:id");
  const venueId = params?.id;
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [hallDates, setHallDates] = useState<Record<string, HallDateState>>({});

  const { data: venue, isLoading } = useQuery<VenueWithHalls>({
    queryKey: [`/api/venues/${venueId}`],
    enabled: !!venueId,
  });

  const { data: reviews } = useQuery<any[]>({
    queryKey: [`/api/venues/${venueId}/reviews`],
    enabled: !!venueId,
  });

  const favMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/favorites/${venueId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({ title: "Updated!", description: "Favorites updated." });
    },
  });

  const handleDateSelect = (hallId: string, dateStr: string | null, status: "available" | "booked" | "blocked" | "past") => {
    setHallDates(prev => ({
      ...prev,
      [hallId]: { date: dateStr, status },
    }));
  };

  const handleProceedToBook = (hallId: string) => {
    const hallState = hallDates[hallId];
    if (!hallState || hallState.status !== "available" || !hallState.date) return;

    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to make a booking." });
      navigate("/auth");
      return;
    }

    navigate(`/book/${venueId}/${hallId}?date=${hallState.date}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-[50vh] w-full" />
        <div className="px-5 mt-6 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-4">Venue not found</p>
          <Link href="/search">
            <Button variant="outline" data-testid="link-back-search">Back to Search</Button>
          </Link>
        </div>
      </div>
    );
  }

  const allAmenities = Array.from(new Set(venue.halls.flatMap(h => h.amenities || [])));
  const maxCapacity = venue.halls.length > 0 ? Math.max(...venue.halls.map(h => h.capacity)) : 0;
  const location = [venue.address, venue.city].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-background text-foreground pb-10 pt-0">
      <div className="relative h-[45vh] min-h-[300px] max-h-[450px] w-full">
        <img src={venue.imageUrl || "/images/hero-venue.png"} alt={venue.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-90" />

        <div className="absolute top-0 left-0 right-0 p-4 pt-16 flex justify-between items-center z-20">
          <Link href="/search">
            <Button variant="secondary" size="icon" className="rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 border-none" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button variant="secondary" size="icon" className="rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 border-none" data-testid="button-share">
              <Share2 className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 border-none"
              onClick={() => {
                if (!user) {
                  toast({ title: "Sign in required", description: "Please sign in to save venues." });
                  return;
                }
                favMutation.mutate();
              }}
              data-testid="button-favorite"
            >
              <Heart className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-10 relative z-10">
        <div className="flex justify-between items-start mb-2">
          <h1 className="font-serif text-3xl font-bold text-foreground leading-tight flex-1 mr-4" data-testid="text-venue-title">
            {venue.title}
          </h1>
          {venue.verified && (
            <div className="bg-primary/20 p-2 rounded-full border border-primary/50">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-6" data-testid="text-venue-location">
          <MapPin className="h-4 w-4" />
          {location}
        </div>

        <div className="flex gap-4 mb-8 overflow-x-auto scrollbar-hide">
          <div className="bg-card border border-border p-3 rounded-xl min-w-[100px] flex flex-col gap-1">
            <div className="flex items-center gap-1 text-primary text-sm font-bold">
              <Star className="h-3.5 w-3.5 fill-current" /> {venue.rating.toFixed(1)}
            </div>
            <span className="text-xs text-muted-foreground" data-testid="text-review-count">{venue.reviewCount} Reviews</span>
          </div>
          <div className="bg-card border border-border p-3 rounded-xl min-w-[100px] flex flex-col gap-1">
            <div className="flex items-center gap-1 text-foreground text-sm font-bold">
              <Users className="h-3.5 w-3.5" /> {maxCapacity}
            </div>
            <span className="text-xs text-muted-foreground">Max Capacity</span>
          </div>
          <div className="bg-card border border-border p-3 rounded-xl min-w-[100px] flex flex-col gap-1">
            <div className="flex items-center gap-1 text-foreground text-sm font-bold">
              {venue.type}
            </div>
            <span className="text-xs text-muted-foreground">Type</span>
          </div>
        </div>

        <Separator className="bg-secondary mb-6" />

        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">About this space</h2>
          <p className="text-muted-foreground leading-relaxed" data-testid="text-venue-description">
            {venue.description}
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4" data-testid="text-halls-title">Available Halls ({venue.halls.length})</h2>
          <div className="space-y-4">
            {venue.halls.map((hall) => {
              const hallState = hallDates[hall.id];
              const isAvailable = hallState?.status === "available" && !!hallState.date;
              const isUnavailable = hallState?.status === "booked" || hallState?.status === "blocked";

              return (
                <div key={hall.id} className="bg-card border border-border rounded-xl overflow-hidden" data-testid={`card-hall-${hall.id}`}>
                  <div className="aspect-video w-full relative">
                    <img src={hall.imageUrl || "/images/hero-venue.png"} alt={hall.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-3 left-3">
                      <h3 className="text-lg font-bold text-white" data-testid={`text-hall-name-${hall.id}`}>{hall.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-white/80">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {hall.capacity} guests</span>
                        <span className="flex items-center gap-1 font-bold text-primary"><TagIcon /> ₦{hall.price.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="text-sm text-muted-foreground mb-3">{hall.description}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {(hall.amenities || []).slice(0, 4).map(am => (
                        <Badge key={am} variant="secondary" className="bg-secondary text-xs font-normal">
                          {am}
                        </Badge>
                      ))}
                      {(hall.amenities || []).length > 4 && (
                        <Badge variant="secondary" className="bg-secondary text-xs font-normal">
                          +{hall.amenities.length - 4} more
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mb-3">Select an available date to proceed with booking</p>

                    <HallAvailabilityCalendar
                      hallId={hall.id}
                      hallName={hall.name}
                      venueOwnerId={venue.ownerUserId}
                      isOwnerView={user?.role === "venue_holder" && venue.ownerUserId === user.id}
                      selectedDate={hallState?.date || null}
                      onDateSelect={(dateStr, status) => handleDateSelect(hall.id, dateStr, status)}
                    />

                    {isUnavailable && (
                      <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20" data-testid={`text-unavailable-${hall.id}`}>
                        <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                        <span className="text-sm text-red-300">Not available for booking</span>
                      </div>
                    )}

                    {isAvailable && hallState.date && (
                      <p className="mt-3 text-sm text-green-400 font-medium" data-testid={`text-selected-date-${hall.id}`}>
                        Selected: {format(new Date(hallState.date + "T00:00:00"), "EEEE, MMMM d, yyyy")}
                      </p>
                    )}

                    <Button
                      className="w-full mt-3 font-bold text-base h-12"
                      disabled={!isAvailable}
                      onClick={() => handleProceedToBook(hall.id)}
                      data-testid={`button-book-${hall.id}`}
                      variant={isAvailable ? "default" : "secondary"}
                    >
                      {isAvailable
                        ? (venue.instantBook ? "Proceed and Book" : "Proceed and Book")
                        : "Select an available date"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {reviews && reviews.length > 0 && (
          <>
            <Separator className="bg-secondary mb-6" />
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Reviews ({reviews.length})</h2>
                {reviews.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const avg = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length;
                        return (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < Math.round(avg) ? "text-primary fill-current" : "text-white/20"}`}
                          />
                        );
                      })}
                    </div>
                    <span className="text-sm font-bold text-foreground" data-testid="text-avg-rating">
                      {(reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {reviews.map((review: any) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    isOwner={user?.role === "venue_holder" && venue.ownerUserId === user.id}
                    venueId={venueId!}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        <Separator className="bg-secondary mb-6" />

        <div className="flex items-center gap-4 mb-8">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-orange-500" />
          <div className="flex-1">
            <h3 className="font-semibold">Hosted by Eventsdey</h3>
            <p className="text-xs text-muted-foreground">Joined December 2025</p>
          </div>
          <Button variant="ghost" className="text-primary hover:text-primary/80 hover:bg-transparent p-0" data-testid="button-contact">
            Contact <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReviewCard({ review, isOwner, venueId }: { review: any; isOwner: boolean; venueId: string }) {
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseText, setResponseText] = useState("");
  const { toast } = useToast();

  const responseMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/reviews/${review.id}/response`, { response: responseText });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/venues/${venueId}/reviews`] });
      setShowResponseForm(false);
      setResponseText("");
      toast({ title: "Response posted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not post response.", variant: "destructive" });
    },
  });

  return (
    <div className="bg-card border border-border rounded-xl p-4" data-testid={`card-review-${review.id}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
            {review.user?.name?.[0] || "U"}
          </div>
          <div>
            <p className="font-medium text-sm">{review.user?.name || "User"}</p>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${i < review.rating ? "text-primary fill-current" : "text-white/20"}`}
                />
              ))}
            </div>
          </div>
        </div>
        {review.createdAt && (
          <span className="text-xs text-muted-foreground">{format(new Date(review.createdAt), "MMM dd, yyyy")}</span>
        )}
      </div>

      {review.comment && <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>}

      {review.ownerResponse && (
        <div className="mt-3 pl-4 border-l-2 border-primary/30 bg-primary/5 rounded-r-lg p-3" data-testid={`owner-response-${review.id}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <MessageSquare className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium text-primary">Venue Owner's Response</span>
            {review.ownerResponseDate && (
              <span className="text-xs text-muted-foreground ml-auto">{format(new Date(review.ownerResponseDate), "MMM dd, yyyy")}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{review.ownerResponse}</p>
        </div>
      )}

      {isOwner && !review.ownerResponse && (
        <>
          {!showResponseForm ? (
            <button
              onClick={() => setShowResponseForm(true)}
              className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
              data-testid={`button-respond-${review.id}`}
            >
              <MessageSquare className="h-3.5 w-3.5" /> Respond to this review
            </button>
          ) : (
            <div className="mt-3 space-y-2" data-testid={`form-response-${review.id}`}>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Write your response..."
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                rows={3}
                data-testid={`input-response-${review.id}`}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground h-8"
                  onClick={() => { setShowResponseForm(false); setResponseText(""); }}
                  data-testid={`button-cancel-response-${review.id}`}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 h-8"
                  onClick={() => responseMutation.mutate()}
                  disabled={!responseText.trim() || responseMutation.isPending}
                  data-testid={`button-submit-response-${review.id}`}
                >
                  <Send className="h-3 w-3" /> Post Response
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TagIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-tag"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l5 5a2 2 0 0 0 2.828 0l7-7a2 2 0 0 0 0-2.828l-5-5z"/><path d="M6 9h.01"/></svg>
  );
}
