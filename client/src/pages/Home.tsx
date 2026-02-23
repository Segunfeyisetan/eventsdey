import { useQuery } from "@tanstack/react-query";
import VenueCard, { type VenueWithHalls } from "@/components/VenueCard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight, Mail, Phone, MapPinned, Building2 } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";


export default function Home() {
  const { data: venues, isLoading } = useQuery<VenueWithHalls[]>({
    queryKey: ["/api/venues"],
  });

  const { data: heroSetting } = useQuery<{ key: string; value: string | null }>({
    queryKey: ["/api/site-settings/hero_image"],
  });

  const heroImage = (heroSetting?.value && heroSetting.value.length > 0) ? heroSetting.value : "/images/hero-venue.png";

  const featuredVenues = venues?.filter(v => v.featured) || [];

  const categories = [
    { name: "Wedding", image: "/images/hero-venue.png" },
    { name: "Conference", image: "/images/venue-conference.png" },
    { name: "Party", image: "/images/venue-garden.png" },
    { name: "Concert", image: "/images/venue-ballroom.png" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <div className="relative h-[60vh] min-h-[400px] max-h-[600px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-black/40 z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 h-full w-full" />
        <img
          src={heroImage}
          alt="Luxury Venue"
          className="w-full h-full object-cover animate-in fade-in zoom-in duration-1000"
        />

        <div className="absolute inset-0 z-20 flex flex-col justify-start px-6 pt-20">
          <span className="text-primary font-medium tracking-widest text-sm mb-4 animate-in slide-in-from-bottom-4 duration-700 delay-100" data-testid="text-brand">
            EVENTSDEY NIGERIA
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl font-bold text-white leading-[1.1] mb-6 animate-in slide-in-from-bottom-6 duration-700 delay-200" data-testid="text-hero-title">
            Host <span className="gold-gradient-text">Memorable</span> Events.
          </h1>
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 animate-in slide-in-from-bottom-10 duration-700 delay-400 w-[85%] max-w-md flex flex-col gap-2">
          <Link href="/search">
            <div className="glass-panel rounded-2xl p-3 flex items-center gap-3 cursor-pointer group hover:bg-card/80 transition-all" data-testid="button-search-cta">
              <div className="bg-primary/20 p-2 rounded-full text-primary">
                <Search className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-foreground font-semibold text-sm">Find your perfect space</p>
              </div>
              <div className="bg-primary/10 p-2 rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>
          </Link>
          <Link href="/auth?tab=register&role=venue_holder">
            <div className="glass-panel rounded-2xl p-3 flex items-center gap-3 cursor-pointer group hover:bg-card/80 transition-all" data-testid="button-list-venue-hero">
              <div className="bg-primary/20 p-2 rounded-full text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-foreground font-semibold text-sm">Own a venue? List it here</p>
              </div>
              <div className="bg-primary/10 p-2 rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>
          </Link>
        </div>
      </div>

      <section className="py-8 px-6">
        <h2 className="text-xl font-serif font-semibold mb-4 text-foreground" data-testid="text-categories-title">Browse by Category</h2>
        <div className="flex gap-4 justify-center pb-4 flex-wrap">
          {categories.map((cat) => (
            <Link key={cat.name} href={`/search?type=${cat.name}`}>
              <div className="snap-start shrink-0 w-32 md:w-40 flex flex-col gap-2 cursor-pointer group" data-testid={`card-category-${cat.name}`}>
                <div className="aspect-square rounded-2xl overflow-hidden border border-border relative shadow-sm">
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                </div>
                <span className="text-sm font-medium text-center text-foreground/80 group-hover:text-primary transition-colors">{cat.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-6 py-4">
        <div className="flex justify-between items-end mb-6">
          <div>
            <span className="text-primary text-xs font-bold tracking-wider uppercase">Curated</span>
            <h2 className="text-2xl font-serif font-bold text-foreground" data-testid="text-featured-title">Featured Spaces</h2>
          </div>
          <Link href="/search" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1" data-testid="link-view-all">
              View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-xl overflow-hidden bg-card border border-border shadow-sm">
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredVenues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>
        )}
      </section>

      <footer className="mt-8 bg-card/80 border-t border-border">
        <div className="px-6 py-10">
          <div className="text-center mb-8">
            <span className="text-primary font-serif text-2xl font-bold tracking-wide">Eventsdey</span>
            <p className="text-muted-foreground text-sm mt-1">Nigeria's premium venue marketplace</p>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-8">
            <Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-about">About Us</Link>
            <Link href="/testimonials" className="text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-testimonials">Testimonials</Link>
            <Link href="/faq" className="text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-faq">FAQ</Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-terms">Terms</Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-privacy">Privacy</Link>
          </div>

          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4 text-primary" />
              <span>contact@eventsdey.com</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4 text-primary" />
              <span>+234 903 411 8323</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPinned className="h-4 w-4 text-primary shrink-0" />
              <span>Lekki Phase 1, Lagos</span>
            </div>
          </div>

          <div className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Eventsdey Nigeria. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <BottomNav />
    </div>
  );
}
