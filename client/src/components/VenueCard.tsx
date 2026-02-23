import { Badge } from "@/components/ui/badge";
import { Heart, MapPin, Star, Users } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface VenueWithHalls {
  id: string;
  ownerUserId: string;
  title: string;
  description: string;
  address: string | null;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
  imageUrl: string | null;
  type: string;
  verified: boolean | null;
  featured: boolean | null;
  instantBook: boolean | null;
  rating: number;
  reviewCount: number;
  halls: {
    id: string;
    name: string;
    description: string | null;
    capacity: number;
    price: number;
    depositPercentage: number;
    balanceDueDays: number;
    imageUrl: string | null;
    amenities: string[];
    venueId: string;
  }[];
}

interface VenueCardProps {
  venue: VenueWithHalls;
  distance?: number;
}

export default function VenueCard({ venue, distance }: VenueCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const minPrice = venue.halls.length > 0 ? Math.min(...venue.halls.map(h => h.price)) : 0;
  const maxCapacity = venue.halls.length > 0 ? Math.max(...venue.halls.map(h => h.capacity)) : 0;

  const favMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/favorites/${venue.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    },
  });

  const priceDisplay = venue.halls.length > 1
    ? `From ₦${minPrice.toLocaleString()}`
    : `₦${minPrice.toLocaleString()}`;

  const location = [venue.address, venue.city].filter(Boolean).join(", ");

  return (
    <Link href={`/venue/${venue.id}`}>
      <div className="group relative overflow-hidden rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 cursor-pointer shadow-sm" data-testid={`card-venue-${venue.id}`}>
        <div className="aspect-[4/3] overflow-hidden relative">
          <img
            src={venue.imageUrl || "/images/hero-venue.png"}
            alt={venue.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

          <div className="absolute top-3 left-3 flex gap-2">
            {venue.verified && (
              <Badge variant="secondary" className="bg-primary/90 text-primary-foreground backdrop-blur-sm border-none shadow-lg">
                Verified
              </Badge>
            )}
            {venue.featured && (
              <Badge variant="outline" className="bg-black/50 text-white border-white/30 backdrop-blur-sm">
                Featured
              </Badge>
            )}
          </div>

          <Button
            size="icon"
            variant="ghost"
            className="absolute top-3 right-3 rounded-full bg-black/30 hover:bg-black/50 text-white hover:text-primary backdrop-blur-md"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!user) {
                toast({ title: "Sign in required", description: "Please sign in to save venues." });
                return;
              }
              favMutation.mutate();
            }}
            data-testid={`button-favorite-${venue.id}`}
          >
            <Heart className="h-5 w-5" />
          </Button>

          <div className="absolute bottom-3 left-3">
            <span className="text-xl font-bold text-white" data-testid={`text-price-${venue.id}`}>{priceDisplay}</span>
            <span className="text-xs text-white/80 font-medium"> / day</span>
          </div>
        </div>

        <div className="p-4 space-y-2">
          <div className="flex justify-between items-start">
            <h3 className="font-serif text-lg font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors" data-testid={`text-venue-title-${venue.id}`}>
              {venue.title}
            </h3>
            <div className="flex items-center gap-1 text-primary text-sm font-medium">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span data-testid={`text-rating-${venue.id}`}>{venue.rating.toFixed(1)}</span>
            </div>
          </div>

          <div className="flex items-center text-muted-foreground text-sm">
            <MapPin className="h-3.5 w-3.5 mr-1 shrink-0" />
            <span className="truncate" data-testid={`text-location-${venue.id}`}>{location}</span>
            {distance !== undefined && distance > 0 && (
              <span className="ml-auto shrink-0 text-xs text-primary font-medium" data-testid={`text-distance-${venue.id}`}>
                {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 pt-3 border-t border-border">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span>Up to {maxCapacity} guests</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${venue.instantBook ? 'bg-green-500' : 'bg-blue-500'}`} />
              <span>{venue.instantBook ? 'Instant Book' : 'Request to Book'}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
