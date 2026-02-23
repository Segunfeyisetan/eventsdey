import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, User, Mail, Phone, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import BottomNav from "@/components/BottomNav";

export default function PersonalInfo() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setHasChanges(
        name !== (user.name || "") ||
        email !== (user.email || "") ||
        phone !== (user.phone || "")
      );
    }
  }, [name, email, phone, user]);

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; phone: string }) => {
      const res = await apiRequest("PUT", "/api/auth/profile", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Profile updated", description: "Your personal information has been saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setHasChanges(false);
    },
    onError: (err: any) => {
      let msg = "Failed to update profile";
      try { msg = JSON.parse(err?.message)?.message || msg; } catch { msg = err?.message || msg; }
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Error", description: "Name is required.", variant: "destructive" });
      return;
    }
    if (!email.trim()) {
      toast({ title: "Error", description: "Email is required.", variant: "destructive" });
      return;
    }
    updateMutation.mutate({ name: name.trim(), email: email.trim(), phone: phone.trim() || "" });
  };

  useEffect(() => {
    if (!isLoading && !user) setLocation("/auth");
  }, [isLoading, user, setLocation]);

  if (isLoading || !user) return null;

  const isOAuthUser = (user as any).googleId || (user as any).facebookId || (user as any).appleId;

  return (
    <div className="min-h-screen bg-background text-foreground pt-16 pb-24">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/profile")} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-serif font-bold">Personal Information</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6 max-w-lg mx-auto">
        <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-primary" />
              Full Name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 bg-background border-border focus:border-primary/50"
              data-testid="input-name"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4 text-primary" />
              Email Address
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-background border-border focus:border-primary/50"
              data-testid="input-email"
            />
            {isOAuthUser && (
              <p className="text-xs text-muted-foreground">
                Your email is linked to your social login. Changing it here won't affect your social login.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Phone className="h-4 w-4 text-primary" />
              Phone Number
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 08012345678"
              className="h-12 bg-background border-border focus:border-primary/50"
              data-testid="input-phone"
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Account Details</h3>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted-foreground">Role</span>
            <span className="text-sm font-medium" data-testid="text-role">
              {user.role === "admin" ? "Administrator" : user.role === "venue_holder" ? "Venue Owner" : "Event Planner"}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted-foreground">Member Since</span>
            <span className="text-sm font-medium" data-testid="text-member-since">
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-NG", { month: "long", year: "numeric" }) : "N/A"}
            </span>
          </div>
          {isOAuthUser && (
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Login Method</span>
              <span className="text-sm font-medium">Social Login</span>
            </div>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
          disabled={!hasChanges || updateMutation.isPending}
          data-testid="button-save-profile"
        >
          {updateMutation.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
          ) : (
            <><Save className="h-4 w-4 mr-2" /> Save Changes</>
          )}
        </Button>
      </form>

      <BottomNav />
    </div>
  );
}
