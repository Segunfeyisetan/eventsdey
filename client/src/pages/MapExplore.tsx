import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { type VenueWithHalls } from "@/components/VenueCard";
import BottomNav from "@/components/BottomNav";
import { Link, useSearch } from "wouter";
import { ArrowLeft, List, MapPin, Star, Users, X, Navigation, Loader2, ChevronLeft, ChevronRight, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type VenueWithDistance = VenueWithHalls & { distance?: number };
type AvailabilitySummary = Record<string, { totalHalls: number; availableToday: number }>;

const NIGERIA_CENTER = { lat: 9.0820, lng: 8.6753 };
const CITY_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
  Lagos: { lat: 6.5244, lng: 3.3792, zoom: 12 },
  Abuja: { lat: 9.0579, lng: 7.4951, zoom: 12 },
  "Port Harcourt": { lat: 4.8156, lng: 7.0498, zoom: 12 },
};

function createPriceOverlayClass() {
  class PriceOverlay extends google.maps.OverlayView {
    private div: HTMLDivElement | null = null;
    private pos: google.maps.LatLng;
    private label: string;
    private available: boolean;
    private selected: boolean;
    private clickHandler: () => void;

    constructor(pos: google.maps.LatLng, label: string, available: boolean, selected: boolean, map: google.maps.Map, clickHandler: () => void) {
      super();
      this.pos = pos;
      this.label = label;
      this.available = available;
      this.selected = selected;
      this.clickHandler = clickHandler;
      this.setMap(map);
    }

    onAdd() {
      this.div = document.createElement("div");
      this.applyStyles();
      this.div.textContent = this.label;
      this.div.addEventListener("click", (e) => {
        e.stopPropagation();
        this.clickHandler();
      });
      this.getPanes()?.overlayMouseTarget.appendChild(this.div);
    }

    draw() {
      if (!this.div) return;
      const proj = this.getProjection();
      if (!proj) return;
      const point = proj.fromLatLngToDivPixel(this.pos);
      if (point) {
        this.div.style.left = point.x + "px";
        this.div.style.top = point.y + "px";
      }
    }

    onRemove() {
      if (this.div?.parentNode) {
        this.div.parentNode.removeChild(this.div);
        this.div = null;
      }
    }

    private applyStyles() {
      if (!this.div) return;
      const bg = this.selected ? "#c9a84c" : this.available ? "#ffffff" : "#f3f4f6";
      const color = this.selected ? "#ffffff" : this.available ? "#1a1a1a" : "#9ca3af";
      const border = this.selected ? "#c9a84c" : this.available ? "#e0e0e0" : "#d1d5db";
      this.div.style.cssText = `
        position: absolute;
        background: ${bg};
        color: ${color};
        padding: 5px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 700;
        font-family: 'Plus Jakarta Sans', sans-serif;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        border: 2px solid ${border};
        cursor: pointer;
        white-space: nowrap;
        transform: translate(-50%, -50%) ${this.selected ? "scale(1.15)" : "scale(1)"};
        transition: all 0.2s ease;
        z-index: ${this.selected ? 10 : 1};
        user-select: none;
        ${!this.available && !this.selected ? "opacity: 0.7;" : ""}
      `;
    }
  }
  return PriceOverlay;
}

export default function MapExplore() {
  const searchParams = new URLSearchParams(useSearch());
  const urlLat = searchParams.get("lat");
  const urlLng = searchParams.get("lng");
  const urlQuery = searchParams.get("q") || "";

  const hasUrlCoords = !!(urlLat && urlLng);
  const urlCoords = hasUrlCoords ? { lat: parseFloat(urlLat!), lng: parseFloat(urlLng!) } : null;

  const getInitialCity = () => {
    if (hasUrlCoords) return "";
    const q = urlQuery.toLowerCase();
    if (q.includes("lagos") || q.includes("lekki") || q.includes("ikeja") || q.includes("victoria island") || q.includes("yaba") || q.includes("ikoyi") || q.includes("surulere") || q.includes("ajah")) return "Lagos";
    if (q.includes("abuja") || q.includes("wuse") || q.includes("maitama") || q.includes("garki") || q.includes("asokoro") || q.includes("gwarinpa")) return "Abuja";
    if (q.includes("port harcourt") || q.includes("portharcourt") || q.includes("ph") || q.includes("gra")) return "Port Harcourt";
    return "";
  };

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<any[]>([]);
  const overlayClassRef = useRef<ReturnType<typeof createPriceOverlayClass> | null>(null);
  const initialFitDoneRef = useRef(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<VenueWithDistance | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>(getInitialCity());
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [currentHallIndex, setCurrentHallIndex] = useState(0);

  const { data: venues, isLoading } = useQuery<VenueWithDistance[]>({
    queryKey: ["/api/venues"],
  });

  const { data: availability } = useQuery<AvailabilitySummary>({
    queryKey: ["/api/venues/availability-summary"],
  });

  useEffect(() => {
    let authFailed = false;

    (window as any).gm_authFailure = () => {
      authFailed = true;
      setMapError("Google Maps API key is invalid or the Maps JavaScript API is not enabled. Please enable it in the Google Cloud Console.");
    };

    const loadGoogleMaps = async () => {
      try {
        const res = await fetch("/api/maps-key");
        const { key } = await res.json();
        if (!key) {
          setMapError("Google Maps API key is not configured.");
          return;
        }

        if (window.google?.maps?.Map) {
          setMapsLoaded(true);
          setTimeout(() => {
            if (authFailed) {
              setMapsLoaded(false);
            }
          }, 2000);
          return;
        }

        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
          existingScript.remove();
          delete (window as any).google;
        }

        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
        script.async = true;
        script.onerror = () => {
          setMapError("Failed to load Google Maps. Please check your internet connection.");
        };
        script.onload = () => {
          setTimeout(() => {
            if (authFailed) {
              return;
            }
            if (window.google?.maps?.Map) {
              setMapsLoaded(true);
            } else {
              setMapError("Google Maps failed to initialize properly.");
            }
          }, 1000);
        };
        document.head.appendChild(script);
      } catch (err) {
        setMapError("Failed to load Google Maps.");
      }
    };
    loadGoogleMaps();

    return () => {
      delete (window as any).gm_authFailure;
    };
  }, []);

  useEffect(() => {
    if (!mapsLoaded || !mapRef.current || mapInstanceRef.current) return;

    const initialCity = getInitialCity();
    const initialCenter = urlCoords
      ? urlCoords
      : initialCity && CITY_CENTERS[initialCity]
        ? CITY_CENTERS[initialCity]
        : CITY_CENTERS.Lagos;
    const initialZoom = urlCoords ? 14 : (initialCity ? CITY_CENTERS[initialCity]?.zoom || 12 : 12);
    if (urlCoords || initialCity) {
      initialFitDoneRef.current = true;
    }

    try {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "greedy",
        styles: [
          { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
          { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
        ],
      });

      overlayClassRef.current = createPriceOverlayClass();

      mapInstanceRef.current.addListener("click", () => {
        setSelectedVenue(null);
      });
    } catch (err) {
      setMapError("Google Maps failed to initialize. The Maps JavaScript API may not be enabled for the configured API key.");
    }
  }, [mapsLoaded]);

  const filteredVenues = venues?.filter(v => {
    if (!v.lat || !v.lng) return false;
    if (selectedCity && v.city !== selectedCity) return false;
    return true;
  }) || [];

  useEffect(() => {
    if (!mapsLoaded || !mapInstanceRef.current || !venues || !overlayClassRef.current) return;

    overlaysRef.current.forEach(o => o.setMap(null));
    overlaysRef.current = [];

    const OverlayClass = overlayClassRef.current;

    filteredVenues.forEach(venue => {
      if (!venue.lat || !venue.lng) return;
      const minPrice = venue.halls.length > 0 ? Math.min(...venue.halls.map(h => h.price)) : 0;
      const priceLabel = minPrice >= 1000000
        ? `₦${(minPrice / 1000000).toFixed(1)}M`
        : `₦${(minPrice / 1000).toFixed(0)}K`;

      const venueAvail = availability?.[venue.id];
      const isAvailableToday = venueAvail ? venueAvail.availableToday > 0 : true;

      const overlay = new OverlayClass(
        new google.maps.LatLng(venue.lat, venue.lng),
        priceLabel,
        isAvailableToday,
        selectedVenue?.id === venue.id,
        mapInstanceRef.current!,
        () => {
          setSelectedVenue(venue);
          setCurrentHallIndex(0);
          mapInstanceRef.current?.panTo({ lat: venue.lat!, lng: venue.lng! });
        }
      );
      overlaysRef.current.push(overlay);
    });

    if (filteredVenues.length > 0 && !initialFitDoneRef.current && !selectedCity && !userLocation) {
      const bounds = new google.maps.LatLngBounds();
      filteredVenues.forEach(v => bounds.extend({ lat: v.lat!, lng: v.lng! }));
      mapInstanceRef.current.fitBounds(bounds, 60);
      initialFitDoneRef.current = true;
    }
  }, [mapsLoaded, venues, filteredVenues.length, selectedVenue?.id, selectedCity, userLocation, availability]);

  const handleCityFilter = (city: string) => {
    if (selectedCity === city) {
      setSelectedCity("");
      if (mapInstanceRef.current && venues) {
        const venuesWithCoords = venues.filter(v => v.lat && v.lng);
        if (venuesWithCoords.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          venuesWithCoords.forEach(v => bounds.extend({ lat: v.lat!, lng: v.lng! }));
          mapInstanceRef.current.fitBounds(bounds, 60);
        }
      }
      return;
    }
    setSelectedCity(city);
    setSelectedVenue(null);
    const center = CITY_CENTERS[city];
    if (center && mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: center.lat, lng: center.lng });
      mapInstanceRef.current.setZoom(center.zoom);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setIsGeolocating(false);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo(loc);
          mapInstanceRef.current.setZoom(13);
        }
      },
      () => setIsGeolocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const venueCount = filteredVenues.length;
  const selectedAvail = selectedVenue ? availability?.[selectedVenue.id] : null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" data-testid="page-map-explore">
      <BottomNav />

      <div className="fixed top-14 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/search" className="p-2 -ml-2 hover:bg-secondary rounded-full text-muted-foreground hover:text-foreground" data-testid="link-back-search">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-serif font-bold flex-1" data-testid="text-map-title">Map View</h1>
          <Link href="/search" data-testid="link-list-view">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full text-xs">
              <List className="h-3.5 w-3.5" /> List
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-full text-xs"
            onClick={useCurrentLocation}
            disabled={isGeolocating}
            data-testid="button-locate-me"
          >
            {isGeolocating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
            Near me
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {Object.keys(CITY_CENTERS).map(city => (
            <button
              key={city}
              onClick={() => handleCityFilter(city)}
              className={`px-3.5 py-1.5 text-xs rounded-full border whitespace-nowrap transition-all font-medium ${
                selectedCity === city
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-card hover:bg-secondary"
              }`}
              data-testid={`button-city-${city.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {city}
            </button>
          ))}
          <span className="px-3 py-1.5 text-xs text-muted-foreground whitespace-nowrap" data-testid="text-venue-count">
            {venueCount} venue{venueCount !== 1 ? "s" : ""} on map
          </span>
        </div>
      </div>

      <div className="flex-1 pt-[132px] relative">
        {mapError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary/30" style={{ top: "132px" }}>
            <div className="flex flex-col items-center gap-4 px-6 text-center max-w-md">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <MapPin className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="font-serif font-bold text-lg text-foreground">Map Unavailable</h3>
              <p className="text-sm text-muted-foreground">{mapError}</p>
              <Link href="/search">
                <Button variant="outline" className="gap-2 rounded-full">
                  <List className="h-4 w-4" /> Browse venues in list view
                </Button>
              </Link>
            </div>
          </div>
        ) : (!mapsLoaded || isLoading) ? (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary/30" style={{ top: "132px" }}>
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        ) : null}

        <div ref={mapRef} className="w-full h-[calc(100vh-132px)]" data-testid="map-container" />

        {selectedVenue && (
          <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300" data-testid="venue-info-card">
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-w-lg mx-auto relative">
              <button
                onClick={() => setSelectedVenue(null)}
                className="absolute top-3 right-3 z-10 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
                data-testid="button-close-info"
              >
                <X className="h-4 w-4" />
              </button>

              <Link href={`/venue/${selectedVenue.id}`}>
                <div className="flex gap-0">
                  <div className="w-[140px] shrink-0 relative">
                    <img
                      src={selectedVenue.imageUrl || "/images/hero-venue.png"}
                      alt={selectedVenue.title}
                      className="w-full h-full object-cover min-h-[160px]"
                    />
                    {selectedVenue.verified && (
                      <Badge variant="secondary" className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-[10px] px-1.5 py-0.5">
                        Verified
                      </Badge>
                    )}
                  </div>

                  <div className="flex-1 p-3 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-serif font-bold text-sm text-foreground line-clamp-1" data-testid="text-info-title">
                        {selectedVenue.title}
                      </h3>
                      <div className="flex items-center gap-0.5 text-primary text-xs font-medium shrink-0">
                        <Star className="h-3 w-3 fill-current" />
                        <span>{selectedVenue.rating.toFixed(1)}</span>
                      </div>
                    </div>

                    <div className="flex items-center text-muted-foreground text-xs mb-2">
                      <MapPin className="h-3 w-3 mr-1 shrink-0" />
                      <span className="truncate">{[selectedVenue.address, selectedVenue.city].filter(Boolean).join(", ")}</span>
                    </div>

                    {selectedAvail && (
                      <div className="flex items-center gap-1.5 mb-2" data-testid="text-availability">
                        <CalendarCheck className="h-3 w-3 shrink-0" style={{ color: selectedAvail.availableToday > 0 ? "#22c55e" : "#ef4444" }} />
                        <span className={`text-[11px] font-semibold ${selectedAvail.availableToday > 0 ? "text-green-600" : "text-red-500"}`}>
                          {selectedAvail.availableToday > 0
                            ? `${selectedAvail.availableToday} of ${selectedAvail.totalHalls} hall${selectedAvail.totalHalls !== 1 ? "s" : ""} available today`
                            : "Fully booked today"}
                        </span>
                      </div>
                    )}

                    {selectedVenue.halls.length > 0 && (
                      <div className="bg-secondary/50 rounded-lg p-2 mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                            {selectedVenue.halls.length > 1 ? `Hall ${currentHallIndex + 1} of ${selectedVenue.halls.length}` : "Hall"}
                          </span>
                          {selectedVenue.halls.length > 1 && (
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentHallIndex(i => Math.max(0, i - 1)); }}
                                disabled={currentHallIndex === 0}
                                className="p-0.5 rounded hover:bg-secondary disabled:opacity-30"
                                data-testid="button-prev-hall"
                              >
                                <ChevronLeft className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentHallIndex(i => Math.min(selectedVenue.halls.length - 1, i + 1)); }}
                                disabled={currentHallIndex === selectedVenue.halls.length - 1}
                                className="p-0.5 rounded hover:bg-secondary disabled:opacity-30"
                                data-testid="button-next-hall"
                              >
                                <ChevronRight className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-foreground truncate">{selectedVenue.halls[currentHallIndex].name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-primary font-bold">
                            ₦{selectedVenue.halls[currentHallIndex].price.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {selectedVenue.halls[currentHallIndex].capacity}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${selectedVenue.instantBook ? 'bg-green-500' : 'bg-blue-500'}`} />
                      <span className="text-[11px] text-muted-foreground">
                        {selectedVenue.instantBook ? 'Instant Book' : 'Request to Book'}
                      </span>
                      <span className="text-[11px] text-muted-foreground ml-auto">
                        {selectedVenue.type}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
