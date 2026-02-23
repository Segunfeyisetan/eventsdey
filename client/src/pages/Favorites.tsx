import { useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import VenueCard, { type VenueWithHalls } from "@/components/VenueCard";
import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

export default function Favorites() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: favorites, isLoading } = useQuery<any[]>({
    queryKey: ["/api/favorites"],
    enabled: !!user,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/auth");
    }
  }, [authLoading, user, setLocation]);

  if (!authLoading && !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <div className="p-6 sticky top-14 z-40 bg-background/80 backdrop-blur-xl border-b border-border flex items-center gap-4">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="-ml-2" data-testid="button-back">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-xl font-serif font-bold" data-testid="text-favorites-title">Saved Venues</h1>
      </div>

      {isLoading ? (
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="rounded-xl overflow-hidden bg-card border border-border">
              <Skeleton className="aspect-[4/3] w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : favorites && favorites.length > 0 ? (
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {favorites.map((fav: any) => {
            const venueData: VenueWithHalls = {
              ...fav.venue,
              halls: [],
              rating: 0,
              reviewCount: 0,
            };
            return <VenueCard key={fav.id} venue={venueData} />;
          })}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg mb-2">No saved venues yet</p>
          <p className="text-sm mb-4">Tap the heart icon on any venue to save it</p>
          <Button variant="link" asChild className="text-primary" data-testid="link-explore">
            <Link href="/search">Explore Venues</Link>
          </Button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
