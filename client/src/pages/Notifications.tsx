import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Bell, BellOff, CheckCheck, CalendarCheck, MessageSquare, Star, ShieldCheck, AlertTriangle, Info, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import BottomNav from "@/components/BottomNav";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  linkUrl: string | null;
  createdAt: string;
};

type Preferences = {
  emailBookingUpdates: boolean;
  emailMessages: boolean;
  emailReviews: boolean;
  emailPromotions: boolean;
  emailExpiry: boolean;
};

const notificationIcon = (type: string) => {
  switch (type) {
    case "booking_request":
    case "booking_accepted":
    case "booking_completed":
      return <CalendarCheck className="h-5 w-5 text-primary" />;
    case "booking_cancelled":
    case "booking_expiry":
      return <AlertTriangle className="h-5 w-5 text-destructive" />;
    case "new_message":
      return <MessageSquare className="h-5 w-5 text-blue-500" />;
    case "new_review":
    case "review_response":
      return <Star className="h-5 w-5 text-amber-500" />;
    case "venue_approved":
    case "venue_verified":
    case "account_approved":
      return <ShieldCheck className="h-5 w-5 text-green-500" />;
    default:
      return <Info className="h-5 w-5 text-muted-foreground" />;
  }
};

export default function Notifications() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"all" | "settings">("all");

  const { data: notifications = [], isLoading: notifLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
  });

  const { data: prefs } = useQuery<Preferences>({
    queryKey: ["/api/preferences"],
    enabled: !!user,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({ title: "Done", description: "All notifications marked as read." });
    },
  });

  const updatePrefMutation = useMutation({
    mutationFn: async (data: Partial<Preferences>) => {
      const res = await apiRequest("PUT", "/api/preferences", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
    },
  });

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.read) {
      markReadMutation.mutate(notif.id);
    }
    if (notif.linkUrl) {
      setLocation(notif.linkUrl);
    }
  };

  const togglePref = (key: keyof Preferences) => {
    if (!prefs) return;
    updatePrefMutation.mutate({ [key]: !prefs[key] });
  };

  useEffect(() => {
    if (!authLoading && !user) setLocation("/auth");
  }, [authLoading, user, setLocation]);

  if (authLoading || !user) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-background text-foreground pt-16 pb-24">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/profile")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-serif font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full" data-testid="badge-unread-count">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="text-primary text-xs"
            data-testid="button-mark-all-read"
          >
            <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
          </Button>
        )}
      </div>

      <div className="flex border-b border-border">
        <button
          onClick={() => setTab("all")}
          className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${tab === "all" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          data-testid="tab-notifications"
        >
          Notifications
        </button>
        <button
          onClick={() => setTab("settings")}
          className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${tab === "settings" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          data-testid="tab-settings"
        >
          Email Settings
        </button>
      </div>

      {tab === "all" && (
        <div className="divide-y divide-border">
          {notifLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <BellOff className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-serif font-bold text-lg mb-1">No notifications yet</h3>
              <p className="text-sm text-muted-foreground">You'll see updates about your bookings, messages, and reviews here.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`flex gap-3 p-4 cursor-pointer transition-colors hover:bg-secondary/50 ${!notif.read ? "bg-primary/5" : ""}`}
                data-testid={`notification-${notif.id}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {notificationIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${!notif.read ? "font-semibold" : "font-medium"}`}>{notif.title}</p>
                    {!notif.read && <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "settings" && (
        <div className="p-4 space-y-4 max-w-lg mx-auto">
          <p className="text-sm text-muted-foreground px-1">
            Choose which email notifications you'd like to receive. In-app notifications are always active.
          </p>

          <div className="bg-card border border-border rounded-2xl divide-y divide-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <CalendarCheck className="h-5 w-5 text-primary" />
                <div>
                  <Label className="text-sm font-medium">Booking Updates</Label>
                  <p className="text-xs text-muted-foreground">When bookings are requested, accepted, or completed</p>
                </div>
              </div>
              <Switch
                checked={prefs?.emailBookingUpdates ?? true}
                onCheckedChange={() => togglePref("emailBookingUpdates")}
                data-testid="switch-booking-updates"
              />
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                <div>
                  <Label className="text-sm font-medium">Messages</Label>
                  <p className="text-xs text-muted-foreground">When you receive a new message</p>
                </div>
              </div>
              <Switch
                checked={prefs?.emailMessages ?? true}
                onCheckedChange={() => togglePref("emailMessages")}
                data-testid="switch-messages"
              />
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Star className="h-5 w-5 text-amber-500" />
                <div>
                  <Label className="text-sm font-medium">Reviews</Label>
                  <p className="text-xs text-muted-foreground">When you receive a review or response</p>
                </div>
              </div>
              <Switch
                checked={prefs?.emailReviews ?? true}
                onCheckedChange={() => togglePref("emailReviews")}
                data-testid="switch-reviews"
              />
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <Label className="text-sm font-medium">Booking Expiry Warnings</Label>
                  <p className="text-xs text-muted-foreground">Reminders before unpaid bookings expire</p>
                </div>
              </div>
              <Switch
                checked={prefs?.emailExpiry ?? true}
                onCheckedChange={() => togglePref("emailExpiry")}
                data-testid="switch-expiry"
              />
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Promotions & Tips</Label>
                  <p className="text-xs text-muted-foreground">Featured venues, deals, and platform tips</p>
                </div>
              </div>
              <Switch
                checked={prefs?.emailPromotions ?? false}
                onCheckedChange={() => togglePref("emailPromotions")}
                data-testid="switch-promotions"
              />
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
