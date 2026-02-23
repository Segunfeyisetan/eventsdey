import { Home, Search, Calendar, LogIn, MessageSquare, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export default function BottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();

  const firstName = user?.name?.split(" ")[0] || "";

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Search, label: "Explore", path: "/search" },
    { icon: Calendar, label: "Bookings", path: "/bookings" },
    { icon: MessageSquare, label: "Inbox", path: "/messages" },
    { icon: user ? User : LogIn, label: user ? firstName : "Login", path: "/profile" },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border pt-safe">
      <div className="flex justify-around items-center h-14">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path} className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200",
                isActive ? "text-primary" : "text-foreground hover:text-primary"
              )}>
                <item.icon className={cn("h-5 w-5", isActive && "fill-current/20")} />
                <span className="text-[10px] font-bold truncate max-w-[60px]" data-testid={`text-nav-${item.path.replace("/", "") || "home"}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
