import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, Settings, CreditCard, Bell, HelpCircle, LogOut, ChevronRight, ShieldCheck, Heart, Building2, CalendarCheck, LayoutDashboard, Eye, EyeOff, KeyRound, Gauge, FileBarChart } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Profile() {
  const { user, isLoading, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/auth/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password updated", description: "Your password has been changed successfully." });
      setShowChangePassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      const msg = err?.message || "Failed to update password";
      let parsed = msg;
      try { parsed = JSON.parse(msg)?.message || msg; } catch {}
      toast({ title: "Error", description: parsed, variant: "destructive" });
    },
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "New passwords do not match.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Error", description: "New password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      toast({ title: "Error", description: "New password must contain at least one lowercase letter.", variant: "destructive" });
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      toast({ title: "Error", description: "New password must contain at least one uppercase letter.", variant: "destructive" });
      return;
    }
    if (!/[^a-zA-Z0-9]/.test(newPassword)) {
      toast({ title: "Error", description: "New password must contain at least one symbol.", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [isLoading, user, setLocation]);

  if (!isLoading && !user) {
    return null;
  }

  const roleLabel = user?.role === "admin" ? "Admin" : user?.role === "venue_holder" ? "Venue Owner" : "Event Planner";

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    toast({ title: "Signed out", description: "You have been signed out." });
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <div className="p-6 pt-12 flex items-center gap-4">
        <Avatar className="h-20 w-20 border-2 border-primary">
          <AvatarFallback className="bg-primary/20 text-primary font-bold text-2xl">
            {user?.name?.[0] || "U"}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-serif font-bold" data-testid="text-user-name">{user?.name || "User"}</h1>
          <p className="text-muted-foreground" data-testid="text-user-role">{roleLabel}</p>
          <div className="flex items-center gap-1.5 mt-2 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full w-fit">
            <ShieldCheck className="h-3 w-3" />
            <span>Verified Account</span>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {user?.role === "admin" && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-2 uppercase tracking-wider">Administration</h2>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <Link href="/admin">
                <MenuItem icon={LayoutDashboard} label="Admin Dashboard" />
              </Link>
            </div>
          </section>
        )}

        {(user?.role === "venue_holder" || user?.role === "admin") && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-2 uppercase tracking-wider">Venue Management</h2>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <Link href="/my-venues">
                <MenuItem icon={Building2} label="My Venues" />
              </Link>
              <Separator className="bg-secondary" />
              <Link href="/owner/bookings">
                <MenuItem icon={CalendarCheck} label="Incoming Bookings" />
              </Link>
              <Separator className="bg-secondary" />
              <Link href="/owner/reports">
                <MenuItem icon={FileBarChart} label="My Reports" />
              </Link>
            </div>
          </section>
        )}

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-2 uppercase tracking-wider">My Activity</h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <Link href="/dashboard">
              <MenuItem icon={Gauge} label="My Dashboard" />
            </Link>
            <Separator className="bg-secondary" />
            <Link href="/bookings">
              <MenuItem icon={CalendarCheck} label="My Bookings" />
            </Link>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-2 uppercase tracking-wider">Account</h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <Link href="/personal-info">
              <MenuItem icon={User} label="Personal Information" />
            </Link>
            <Separator className="bg-secondary" />
            <div onClick={() => setShowChangePassword(true)}>
              <MenuItem icon={KeyRound} label="Change Password" />
            </div>
            <Separator className="bg-secondary" />
            <Link href="/favorites">
              <MenuItem icon={Heart} label="Saved Venues" />
            </Link>
            <Separator className="bg-secondary" />
            <MenuItem icon={CreditCard} label="Payment Methods" badge="Coming Soon" />
            <Separator className="bg-secondary" />
            <Link href="/notifications">
              <MenuItem icon={Bell} label="Notifications" />
            </Link>
            <Separator className="bg-secondary" />
            <Link href="/preferences">
              <MenuItem icon={Settings} label="Preferences" />
            </Link>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-2 uppercase tracking-wider">Support</h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <Link href="/help">
              <MenuItem icon={HelpCircle} label="Help Center" />
            </Link>
            <Separator className="bg-secondary" />
            <div onClick={handleLogout}>
              <MenuItem icon={LogOut} label="Log Out" className="text-red-400 hover:text-red-300" />
            </div>
          </div>
        </section>

        <div className="text-center text-xs text-muted-foreground pt-4">
          <p data-testid="text-user-email">{user?.email}</p>
          <p className="mt-1">Eventsdey v1.0.0</p>
        </div>
      </div>

      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="bg-background border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Change Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="h-12 bg-card border-border focus:border-primary/50 pr-12 placeholder:text-white/25"
                  required
                  data-testid="input-current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowCurrent(!showCurrent)}
                >
                  {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters, uppercase, lowercase, symbol"
                  className="h-12 bg-card border-border focus:border-primary/50 pr-12 placeholder:text-white/25"
                  required
                  minLength={8}
                  data-testid="input-new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowNew(!showNew)}
                >
                  {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="h-12 bg-card border-border focus:border-primary/50 placeholder:text-white/25"
                required
                minLength={8}
                data-testid="input-confirm-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
              disabled={changePasswordMutation.isPending}
              data-testid="button-change-password-submit"
            >
              {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}

function MenuItem({ icon: Icon, label, className = "", badge }: { icon: any, label: string, className?: string, badge?: string }) {
  return (
    <div className={`flex items-center justify-between p-4 ${badge ? 'opacity-50 cursor-default' : 'hover:bg-secondary cursor-pointer'} transition-colors ${className}`} data-testid={`menu-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 opacity-70" />
        <span className="font-medium">{label}</span>
      </div>
      {badge ? (
        <span className="text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">{badge}</span>
      ) : (
        <ChevronRight className="h-4 w-4 opacity-30" />
      )}
    </div>
  );
}
