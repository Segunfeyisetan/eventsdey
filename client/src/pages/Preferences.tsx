import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MapPin, Palette, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import BottomNav from "@/components/BottomNav";

type Preferences = {
  defaultCity: string | null;
  theme: string;
  emailBookingUpdates: boolean;
  emailMessages: boolean;
  emailReviews: boolean;
  emailPromotions: boolean;
  emailExpiry: boolean;
};

const CITIES = [
  { value: "Lagos", label: "Lagos" },
  { value: "Abuja", label: "Abuja" },
  { value: "Port Harcourt", label: "Port Harcourt" },
  { value: "Ibadan", label: "Ibadan" },
  { value: "Kano", label: "Kano" },
  { value: "Enugu", label: "Enugu" },
  { value: "Benin City", label: "Benin City" },
  { value: "Calabar", label: "Calabar" },
];

export default function Preferences() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { theme: currentTheme, setTheme: applyTheme } = useTheme();
  const queryClient = useQueryClient();

  const { data: prefs, isLoading: prefsLoading } = useQuery<Preferences>({
    queryKey: ["/api/preferences"],
    enabled: !!user,
  });

  const updatePrefMutation = useMutation({
    mutationFn: async (data: Partial<Preferences>) => {
      if (data.theme) {
        applyTheme(data.theme as "light" | "dark" | "system");
      }
      const res = await apiRequest("PUT", "/api/preferences", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      toast({ title: "Preferences saved", description: "Your settings have been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save preferences.", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!authLoading && !user) setLocation("/auth");
  }, [authLoading, user, setLocation]);

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground pt-16 pb-24">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/profile")} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-serif font-bold">Preferences</h1>
      </div>

      {prefsLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="p-4 space-y-4 max-w-lg mx-auto">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Search Defaults</h3>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4 text-primary" />
                Default City
              </Label>
              <p className="text-xs text-muted-foreground">Venues in this city will show first when you search</p>
              <Select
                value={prefs?.defaultCity || "none"}
                onValueChange={(val) => updatePrefMutation.mutate({ defaultCity: val === "none" ? null : val })}
              >
                <SelectTrigger className="h-12 bg-background border-border" data-testid="select-default-city">
                  <SelectValue placeholder="Select a city" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No default (show all)</SelectItem>
                  {CITIES.map(city => (
                    <SelectItem key={city.value} value={city.value}>{city.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Appearance</h3>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Palette className="h-4 w-4 text-primary" />
                Theme
              </Label>
              <p className="text-xs text-muted-foreground">Choose how Eventsdey looks on your device</p>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { value: "light", label: "Light", preview: "bg-amber-50 border-2" },
                  { value: "dark", label: "Dark", preview: "bg-gray-900 border-2" },
                  { value: "system", label: "Auto", preview: "bg-gradient-to-r from-amber-50 to-gray-900 border-2" },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => updatePrefMutation.mutate({ theme: option.value })}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                      currentTheme === option.value
                        ? "border-2 border-primary bg-primary/5"
                        : "border border-border hover:border-primary/30"
                    }`}
                    data-testid={`button-theme-${option.value}`}
                  >
                    <div className={`w-10 h-10 rounded-lg ${option.preview} ${currentTheme === option.value ? "border-primary" : "border-border"}`} />
                    <span className="text-xs font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {currentTheme === "system"
                  ? "Theme will follow your device settings"
                  : `Currently using ${currentTheme} theme`}
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">About</h3>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-muted-foreground">App Version</span>
              <span className="text-sm font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-muted-foreground">Region</span>
              <span className="text-sm font-medium">Nigeria</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-muted-foreground">Currency</span>
              <span className="text-sm font-medium">NGN (&#8358;)</span>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
