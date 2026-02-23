import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, Check } from "lucide-react";

const AMENITIES_LIST = [
  "Air Conditioning", "Parking", "Security", "WiFi", "Projector",
  "Sound System", "Generator", "Changing Room", "Wheelchair Access",
  "Catering Service", "Bar", "Outdoor Space"
];

interface SearchFiltersProps {
  maxPrice: number;
  minCapacity: number;
  instantBook: boolean;
  onApply: (filters: { maxPrice: number; minCapacity: number; instantBook: boolean }) => void;
}

export default function SearchFilters({ maxPrice, minCapacity, instantBook, onApply }: SearchFiltersProps) {
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice);
  const [localMinCapacity, setLocalMinCapacity] = useState(minCapacity);
  const [localInstantBook, setLocalInstantBook] = useState(instantBook);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const toggleAmenity = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter(a => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  const handleApply = () => {
    onApply({ maxPrice: localMaxPrice, minCapacity: localMinCapacity, instantBook: localInstantBook });
    setOpen(false);
  };

  const handleClear = () => {
    setLocalMaxPrice(10000000);
    setLocalMinCapacity(0);
    setLocalInstantBook(false);
    setSelectedAmenities([]);
    onApply({ maxPrice: 10000000, minCapacity: 0, instantBook: false });
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="bg-card border-border hover:bg-secondary gap-2" data-testid="button-filters">
          <SlidersHorizontal className="h-4 w-4" />
          More Filters
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl border-border bg-background/95 backdrop-blur-xl">
        <SheetHeader>
          <SheetTitle className="text-center font-serif text-2xl">More Filters</SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-8 overflow-y-auto max-h-[calc(85vh-120px)] pb-20">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-lg">Budget</h3>
              <span className="text-primary font-bold" data-testid="text-price-range">Up to ₦{localMaxPrice.toLocaleString()}</span>
            </div>
            <Slider
              value={[localMaxPrice]}
              max={10000000}
              min={50000}
              step={50000}
              onValueChange={(v) => setLocalMaxPrice(v[0])}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>₦50,000</span>
              <span>₦10,000,000</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-lg">Min. Capacity</h3>
              <span className="text-primary font-bold" data-testid="text-capacity-range">{localMinCapacity > 0 ? `${localMinCapacity}+ guests` : "Any"}</span>
            </div>
            <Slider
              value={[localMinCapacity]}
              max={2000}
              min={0}
              step={50}
              onValueChange={(v) => setLocalMinCapacity(v[0])}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Any</span>
              <span>2,000+</span>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-lg">Booking Options</h3>
            <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
              <div className="space-y-0.5">
                <Label className="text-base">Instant Book</Label>
                <p className="text-xs text-muted-foreground">Book without waiting for approval</p>
              </div>
              <Switch checked={localInstantBook} onCheckedChange={setLocalInstantBook} data-testid="switch-instant-book" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-lg">Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {AMENITIES_LIST.map((amenity) => {
                const isSelected = selectedAmenities.includes(amenity);
                return (
                  <Badge
                    key={amenity}
                    variant={isSelected ? "default" : "outline"}
                    className={`cursor-pointer px-4 py-2 text-sm rounded-full transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => toggleAmenity(amenity)}
                    data-testid={`badge-amenity-${amenity}`}
                  >
                    {amenity}
                    {isSelected && <Check className="ml-2 h-3 w-3" />}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>

        <SheetFooter className="absolute bottom-0 left-0 right-0 p-6 bg-background/95 border-t border-border backdrop-blur-xl">
          <div className="flex gap-4 w-full">
            <Button variant="ghost" className="flex-1" onClick={handleClear} data-testid="button-clear-filters">
              Clear all
            </Button>
            <Button className="flex-[2] bg-primary text-primary-foreground hover:bg-primary/90 font-bold" onClick={handleApply} data-testid="button-apply-filters">
              Apply Filters
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
