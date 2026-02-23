import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useRoute, useLocation, Link } from "wouter";
import { ArrowLeft, Plus, Trash2, Save, X, Users, DollarSign } from "lucide-react";
import type { VenueWithHalls } from "@/components/VenueCard";
import ImageUpload from "@/components/ImageUpload";
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

const VENUE_TYPES = ["Wedding", "Conference", "Party", "Concert", "Exhibition", "Corporate"];
const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Enugu"];
const STATES: Record<string, string> = {
  "Lagos": "Lagos",
  "Abuja": "FCT",
  "Port Harcourt": "Rivers",
  "Ibadan": "Oyo",
  "Enugu": "Enugu",
};
const AMENITIES_LIST = [
  "Air Conditioning", "Parking", "Security", "WiFi", "Projector",
  "Sound System", "Generator", "Changing Room", "Wheelchair Access",
  "Catering Kitchen", "Bar", "Outdoor Space", "Stage", "Lighting",
  "Tables & Chairs", "Microphone", "Video Conferencing", "Whiteboard",
  "Lounge Furniture", "Restrooms", "Valet Parking",
];

interface HallFormData {
  id?: string;
  name: string;
  description: string;
  capacity: number;
  price: number;
  depositPercentage: number;
  balanceDueDays: number;
  imageUrl: string;
  amenities: string[];
  isNew?: boolean;
}

export default function VenueForm() {
  const [matchEdit] = useRoute("/venue/:id/edit");
  const [matchNew] = useRoute("/venue/new");
  const [, params] = useRoute("/venue/:id/edit");
  const venueId = params?.id;
  const isEditing = !!matchEdit && !!venueId;
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Lagos");
  const [type, setType] = useState("Wedding");
  const [imageUrl, setImageUrl] = useState("");
  const [instantBook, setInstantBook] = useState(false);
  const [hallsList, setHallsList] = useState<HallFormData[]>([]);
  const [editingHallIdx, setEditingHallIdx] = useState<number | null>(null);

  const { data: existingVenue, isLoading } = useQuery<VenueWithHalls>({
    queryKey: [`/api/venues/${venueId}`],
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingVenue) {
      setTitle(existingVenue.title);
      setDescription(existingVenue.description);
      setAddress(existingVenue.address || "");
      setCity(existingVenue.city);
      setType(existingVenue.type);
      setImageUrl(existingVenue.imageUrl || "");
      setInstantBook(existingVenue.instantBook || false);
      setHallsList(existingVenue.halls.map(h => ({
        id: h.id,
        name: h.name,
        description: h.description || "",
        capacity: h.capacity,
        price: h.price,
        depositPercentage: h.depositPercentage ?? 100,
        balanceDueDays: h.balanceDueDays ?? 7,
        imageUrl: h.imageUrl || "",
        amenities: h.amenities || [],
      })));
    }
  }, [existingVenue]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const venueData = {
        title,
        description,
        address,
        city,
        state: STATES[city] || city,
        type,
        imageUrl: imageUrl || null,
        instantBook,
      };

      let savedVenueId = venueId;

      if (isEditing) {
        await apiRequest("PUT", `/api/venues/${venueId}`, venueData);
      } else {
        const res = await apiRequest("POST", "/api/venues", venueData);
        const newVenue = await res.json();
        savedVenueId = newVenue.id;
      }

      for (const hall of hallsList) {
        const hallData = {
          name: hall.name,
          description: hall.description || null,
          capacity: hall.capacity,
          price: hall.price,
          depositPercentage: hall.depositPercentage,
          balanceDueDays: hall.balanceDueDays,
          imageUrl: hall.imageUrl || null,
          amenities: hall.amenities,
        };

        if (hall.id && !hall.isNew) {
          await apiRequest("PUT", `/api/halls/${hall.id}`, hallData);
        } else {
          await apiRequest("POST", `/api/venues/${savedVenueId}/halls`, hallData);
        }
      }

      return savedVenueId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-venues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/venues"] });
      if (venueId) queryClient.invalidateQueries({ queryKey: [`/api/venues/${venueId}`] });
      toast({ title: isEditing ? "Venue updated!" : "Venue created!", description: "Your changes have been saved." });
      setLocation("/my-venues");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Could not save venue.", variant: "destructive" });
    },
  });

  const deleteHallMutation = useMutation({
    mutationFn: async (hallId: string) => {
      await apiRequest("DELETE", `/api/halls/${hallId}`);
    },
    onSuccess: () => {
      toast({ title: "Hall removed" });
    },
  });

  const addNewHall = () => {
    setHallsList([...hallsList, {
      name: "",
      description: "",
      capacity: 100,
      price: 200000,
      depositPercentage: 100,
      balanceDueDays: 7,
      imageUrl: "",
      amenities: [],
      isNew: true,
    }]);
    setEditingHallIdx(hallsList.length);
  };

  const updateHall = (idx: number, field: keyof HallFormData, value: any) => {
    const updated = [...hallsList];
    (updated[idx] as any)[field] = value;
    setHallsList(updated);
  };

  const removeHall = (idx: number) => {
    const hall = hallsList[idx];
    if (hall.id && !hall.isNew) {
      deleteHallMutation.mutate(hall.id);
    }
    setHallsList(hallsList.filter((_, i) => i !== idx));
    setEditingHallIdx(null);
  };

  const toggleHallAmenity = (idx: number, amenity: string) => {
    const hall = hallsList[idx];
    const amenities = hall.amenities.includes(amenity)
      ? hall.amenities.filter(a => a !== amenity)
      : [...hall.amenities, amenity];
    updateHall(idx, "amenities", amenities);
  };

  if (!user) {
    setLocation("/auth");
    return null;
  }

  if (isEditing && isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <div className="sticky top-14 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-4 flex items-center gap-3">
        <Link href="/my-venues" className="p-2 -ml-2 hover:bg-secondary rounded-full" data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-serif text-xl font-bold flex-1" data-testid="text-form-title">
          {isEditing ? "Edit Venue" : "Add New Venue"}
        </h1>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !title || !description || !city}
          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
          data-testid="button-save-venue"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="px-5 py-6 space-y-8">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Venue Details</h2>

          <div className="space-y-2">
            <Label>Venue Name *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. The Grand Ballroom"
              className="h-12 bg-card border-border focus:border-primary/50"
              data-testid="input-title"
            />
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your venue, its features, and what makes it special..."
              className="min-h-[120px] bg-card border-border focus:border-primary/50"
              data-testid="input-description"
            />
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 12 Admiralty Way, Lekki"
              className="h-12 bg-card border-border focus:border-primary/50"
              data-testid="input-address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>City *</Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className="h-12 bg-card border-border" data-testid="select-city">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Venue Type *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-12 bg-card border-border" data-testid="select-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VENUE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cover Image</Label>
            <ImageUpload
              value={imageUrl}
              onChange={setImageUrl}
              label="Upload venue cover photo"
              data-testid="input-image-url"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
            <div>
              <Label className="text-base">Instant Booking</Label>
              <p className="text-xs text-muted-foreground">Allow planners to book without your approval</p>
            </div>
            <Switch checked={instantBook} onCheckedChange={setInstantBook} data-testid="switch-instant-book" />
          </div>
        </section>

        <Separator className="bg-secondary" />

        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Halls & Spaces</h2>
              <p className="text-xs text-muted-foreground mt-1">Add the individual bookable spaces within your venue</p>
            </div>
            <Button variant="outline" size="sm" onClick={addNewHall} className="border-primary/30 text-primary hover:bg-primary/10 gap-1.5" data-testid="button-add-hall">
              <Plus className="h-3.5 w-3.5" /> Add Hall
            </Button>
          </div>

          {hallsList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
              <p className="mb-2">No halls added yet</p>
              <p className="text-sm">Add at least one hall so planners can book your venue</p>
            </div>
          ) : (
            <div className="space-y-4">
              {hallsList.map((hall, idx) => (
                <div key={idx} className="bg-card border border-border rounded-xl overflow-hidden" data-testid={`card-hall-form-${idx}`}>
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary transition-colors"
                    onClick={() => setEditingHallIdx(editingHallIdx === idx ? null : idx)}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate" data-testid={`text-hall-name-${idx}`}>
                        {hall.name || "Untitled Hall"}
                      </h3>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {hall.capacity}</span>
                        <span className="flex items-center gap-1 text-primary"><DollarSign className="h-3 w-3" /> ₦{hall.price.toLocaleString()}</span>
                        <span>{hall.depositPercentage < 100 ? `${hall.depositPercentage}% deposit` : "Full payment"}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={(e) => e.stopPropagation()} data-testid={`button-remove-hall-${idx}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Hall?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove "{hall.name || "this hall"}" from your venue.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => removeHall(idx)}>Remove</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {editingHallIdx === idx && (
                    <div className="border-t border-border p-4 space-y-4">
                      <div className="space-y-2">
                        <Label>Hall Name *</Label>
                        <Input
                          value={hall.name}
                          onChange={(e) => updateHall(idx, "name", e.target.value)}
                          placeholder="e.g. Grand Ballroom"
                          className="h-11 bg-background border-border"
                          data-testid={`input-hall-name-${idx}`}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={hall.description}
                          onChange={(e) => updateHall(idx, "description", e.target.value)}
                          placeholder="Describe this hall..."
                          className="min-h-[80px] bg-background border-border"
                          data-testid={`input-hall-description-${idx}`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Capacity *</Label>
                          <Input
                            type="number"
                            value={hall.capacity}
                            onChange={(e) => updateHall(idx, "capacity", parseInt(e.target.value) || 0)}
                            className="h-11 bg-background border-border"
                            data-testid={`input-hall-capacity-${idx}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Price (₦/day) *</Label>
                          <Input
                            type="number"
                            value={hall.price}
                            onChange={(e) => updateHall(idx, "price", parseInt(e.target.value) || 0)}
                            className="h-11 bg-background border-border"
                            data-testid={`input-hall-price-${idx}`}
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-4">
                        <div>
                          <Label className="text-primary text-sm font-semibold">Payment Terms</Label>
                          <p className="text-xs text-muted-foreground mt-0.5">Configure how planners pay for this hall</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Deposit (%)</Label>
                            <Input
                              type="number"
                              min={10}
                              max={100}
                              value={hall.depositPercentage}
                              onChange={(e) => updateHall(idx, "depositPercentage", Math.min(100, Math.max(10, parseInt(e.target.value) || 100)))}
                              className="h-11 bg-background border-border"
                              data-testid={`input-hall-deposit-${idx}`}
                            />
                            <p className="text-[10px] text-muted-foreground">
                              {hall.depositPercentage === 100
                                ? "Full payment upfront"
                                : `${hall.depositPercentage}% upfront, ${100 - hall.depositPercentage}% later`}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Balance Due (days before)</Label>
                            <Input
                              type="number"
                              min={1}
                              max={90}
                              value={hall.balanceDueDays}
                              onChange={(e) => updateHall(idx, "balanceDueDays", Math.min(90, Math.max(1, parseInt(e.target.value) || 7)))}
                              className="h-11 bg-background border-border"
                              disabled={hall.depositPercentage === 100}
                              data-testid={`input-hall-balance-days-${idx}`}
                            />
                            <p className="text-[10px] text-muted-foreground">
                              {hall.depositPercentage === 100
                                ? "Not applicable"
                                : `Balance due ${hall.balanceDueDays} days before event`}
                            </p>
                          </div>
                        </div>
                        {hall.depositPercentage < 100 && (
                          <div className="text-xs text-primary/80 bg-primary/10 px-3 py-2 rounded-lg">
                            Example: For ₦{hall.price.toLocaleString()}, deposit = ₦{Math.round(hall.price * hall.depositPercentage / 100).toLocaleString()}, balance = ₦{Math.round(hall.price * (100 - hall.depositPercentage) / 100).toLocaleString()}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Hall Image</Label>
                        <ImageUpload
                          value={hall.imageUrl}
                          onChange={(url) => updateHall(idx, "imageUrl", url)}
                          label="Upload hall photo"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Amenities</Label>
                        <div className="flex flex-wrap gap-2">
                          {AMENITIES_LIST.map(am => {
                            const selected = hall.amenities.includes(am);
                            return (
                              <Badge
                                key={am}
                                variant={selected ? "default" : "outline"}
                                className={`cursor-pointer px-3 py-1.5 text-xs rounded-full transition-all ${
                                  selected
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "border-border hover:border-primary/50"
                                }`}
                                onClick={() => toggleHallAmenity(idx, am)}
                                data-testid={`badge-amenity-${idx}-${am}`}
                              >
                                {am}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => setEditingHallIdx(null)}
                        data-testid={`button-collapse-hall-${idx}`}
                      >
                        Collapse
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 border-t border-border backdrop-blur-xl z-40 fixed-bottom-safe">
        <div className="flex gap-3">
          <Link href="/my-venues" className="flex-1">
            <Button variant="outline" className="w-full h-12 border-border" data-testid="button-cancel">
              Cancel
            </Button>
          </Link>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !title || !description || !city}
            className="flex-[2] h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
            data-testid="button-save-bottom"
          >
            {saveMutation.isPending ? "Saving..." : isEditing ? "Update Venue" : "Create Venue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
