import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import VenueCard, { type VenueWithHalls } from "@/components/VenueCard";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, ArrowLeft, MapPin, Wallet, Users, X, Navigation, Loader2, Map } from "lucide-react";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const BUDGET_OPTIONS = [
  { label: "Under ₦200K", max: 200000 },
  { label: "Under ₦500K", max: 500000 },
  { label: "Under ₦1M", max: 1000000 },
  { label: "Under ₦2.5M", max: 2500000 },
  { label: "Under ₦5M", max: 5000000 },
  { label: "Any Budget", max: 0 },
];
const CAPACITY_OPTIONS = [
  { label: "50+", value: 50 },
  { label: "100+", value: 100 },
  { label: "200+", value: 200 },
  { label: "500+", value: 500 },
  { label: "1000+", value: 1000 },
  { label: "Any Size", value: 0 },
];

type VenueWithDistance = VenueWithHalls & { distance?: number };

export default function Search() {
  const searchParams = new URLSearchParams(useSearch());
  const initialType = searchParams.get("type") || "";

  const [searchTerm, setSearchTerm] = useState("");
  const [activeType, setActiveType] = useState(initialType);
  const [maxPrice, setMaxPrice] = useState(0);
  const [minCapacity, setMinCapacity] = useState(0);
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadGoogleMaps = async () => {
      if (window.google?.maps?.places) {
        setMapsLoaded(true);
        return;
      }
      try {
        const res = await fetch("/api/maps-key");
        const { key } = await res.json();
        if (!key) return;
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
        script.async = true;
        script.onload = () => setMapsLoaded(true);
        document.head.appendChild(script);
      } catch {}
    };
    loadGoogleMaps();
  }, []);

  useEffect(() => {
    if (mapsLoaded && window.google?.maps?.places) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
      const div = document.createElement("div");
      placesServiceRef.current = new google.maps.places.PlacesService(div);
    }
  }, [mapsLoaded]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          searchInputRef.current && !searchInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback((input: string) => {
    if (!autocompleteServiceRef.current || input.length < 2) {
      setSuggestions([]);
      return;
    }
    autocompleteServiceRef.current.getPlacePredictions(
      { input, componentRestrictions: { country: "ng" } },
      (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
        }
      }
    );
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (value.length >= 2 && mapsLoaded) {
      debounceTimerRef.current = setTimeout(() => fetchSuggestions(value), 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
    if (!value) {
      setLocationCoords(null);
      setLocationLabel("");
    }
  };

  const selectSuggestion = (prediction: google.maps.places.AutocompletePrediction) => {
    setShowSuggestions(false);
    setSearchTerm(prediction.structured_formatting.main_text);
    setLocationLabel(prediction.description);

    if (placesServiceRef.current) {
      placesServiceRef.current.getDetails(
        { placeId: prediction.place_id, fields: ["geometry"] },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
            setLocationCoords({
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            });
          }
        }
      );
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSearchTerm("Near me");
        setLocationLabel("Current location");
        setIsGeolocating(false);
        setShowSuggestions(false);
      },
      () => setIsGeolocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const queryString = new URLSearchParams();
  if (activeType) queryString.set("type", activeType);
  if (searchTerm && !locationCoords) queryString.set("search", searchTerm);
  if (maxPrice > 0) queryString.set("maxPrice", maxPrice.toString());
  if (minCapacity > 0) queryString.set("minCapacity", minCapacity.toString());
  if (locationCoords) {
    queryString.set("lat", locationCoords.lat.toString());
    queryString.set("lng", locationCoords.lng.toString());
  }

  const { data: venues, isLoading } = useQuery<VenueWithDistance[]>({
    queryKey: [`/api/venues?${queryString.toString()}`],
  });

  const activeFiltersCount = [activeType, maxPrice > 0, minCapacity > 0, locationCoords].filter(Boolean).length;

  const clearAllFilters = () => {
    setActiveType("");
    setMaxPrice(0);
    setMinCapacity(0);
    setSearchTerm("");
    setLocationCoords(null);
    setLocationLabel("");
    setSuggestions([]);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-16 flex flex-col">
      <header className="sticky top-14 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/" className="p-2 -ml-2 hover:bg-secondary rounded-full text-muted-foreground hover:text-foreground" data-testid="link-back">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <Link href={`/map${locationCoords ? `?lat=${locationCoords.lat}&lng=${locationCoords.lng}&q=${encodeURIComponent(searchTerm)}` : searchTerm ? `?q=${encodeURIComponent(searchTerm)}` : ""}`} data-testid="link-map-view">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full text-xs">
              <Map className="h-3.5 w-3.5" /> Map
            </Button>
          </Link>
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search venue name or location..."
              className="pl-9 pr-10 bg-card border-border focus:border-primary/50 rounded-full h-10"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              autoFocus
              data-testid="input-search"
            />
            <button
              onClick={useCurrentLocation}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
              title="Use my location"
              data-testid="button-use-location"
            >
              {isGeolocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
            </button>

            {showSuggestions && suggestions.length > 0 && (
              <div ref={suggestionsRef} className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50" data-testid="suggestions-dropdown">
                {suggestions.map((s) => (
                  <button
                    key={s.place_id}
                    onClick={() => selectSuggestion(s)}
                    className="w-full text-left px-4 py-3 hover:bg-secondary flex items-start gap-3 border-b border-border last:border-0 transition-colors"
                    data-testid={`suggestion-${s.place_id}`}
                  >
                    <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.structured_formatting.main_text}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.structured_formatting.secondary_text}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {locationLabel && (
          <div className="flex items-center gap-2 mb-3 px-1">
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs text-primary font-medium truncate">{locationLabel}</span>
            <button
              onClick={() => { setLocationCoords(null); setLocationLabel(""); setSearchTerm(""); }}
              className="ml-auto text-muted-foreground hover:text-foreground p-1"
              data-testid="button-clear-location"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Wallet className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Budget</span>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {BUDGET_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => setMaxPrice(maxPrice === opt.max ? 0 : opt.max)}
                  className={`px-3.5 py-1.5 text-sm rounded-full border whitespace-nowrap transition-all ${
                    (opt.max === 0 && maxPrice === 0) || maxPrice === opt.max
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-card hover:bg-secondary"
                  }`}
                  data-testid={`button-budget-${opt.max}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Hall Capacity</span>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {CAPACITY_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => setMinCapacity(minCapacity === opt.value ? 0 : opt.value)}
                  className={`px-3.5 py-1.5 text-sm rounded-full border whitespace-nowrap transition-all ${
                    (opt.value === 0 && minCapacity === 0) || minCapacity === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-card hover:bg-secondary"
                  }`}
                  data-testid={`button-capacity-${opt.value}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeFiltersCount > 0 && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground">{activeFiltersCount} filter{activeFiltersCount !== 1 ? "s" : ""} active</span>
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              data-testid="button-clear-all"
            >
              <X className="h-3 w-3" /> Clear all
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 px-4 py-6">
        <h1 className="text-xl font-serif font-bold mb-1" data-testid="text-results-count">
          {isLoading ? "Searching..." : `${venues?.length || 0} Venues found`}
        </h1>
        <p className="text-sm text-muted-foreground mb-6" data-testid="text-results-location">
          {locationLabel || "All locations"}
          {maxPrice > 0 ? ` · Up to ₦${maxPrice.toLocaleString()}` : ""}
          {minCapacity > 0 ? ` · ${minCapacity}+ guests` : ""}
          {activeType ? ` · ${activeType}` : ""}
        </p>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-xl overflow-hidden bg-card border border-border">
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : venues && venues.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} distance={venue.distance} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <SearchIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-2">No venues found</p>
            <p className="text-sm mb-4">Try adjusting your filters or search terms</p>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-primary hover:text-primary/80 text-sm font-medium"
                data-testid="button-clear-empty"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
