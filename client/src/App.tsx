import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import Home from "@/pages/Home";
import Search from "@/pages/Search";
import VenueDetails from "@/pages/VenueDetails";
import Bookings from "@/pages/Bookings";
import Messages from "@/pages/Messages";
import Profile from "@/pages/Profile";
import Favorites from "@/pages/Favorites";
import AuthPage from "@/pages/AuthPage";
import MyVenues from "@/pages/MyVenues";
import VenueForm from "@/pages/VenueForm";
import OwnerBookings from "@/pages/OwnerBookings";
import AdminDashboard from "@/pages/AdminDashboard";
import AboutUs from "@/pages/AboutUs";
import TermsAndConditions from "@/pages/TermsAndConditions";
import FAQ from "@/pages/FAQ";
import Testimonials from "@/pages/Testimonials";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import Dashboard from "@/pages/Dashboard";
import BookHall from "@/pages/BookHall";
import PersonalInfo from "@/pages/PersonalInfo";
import Notifications from "@/pages/Notifications";
import Preferences from "@/pages/Preferences";
import HelpCenter from "@/pages/HelpCenter";
import OwnerReports from "@/pages/OwnerReports";
import MapExplore from "@/pages/MapExplore";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/search" component={Search} />
      <Route path="/map" component={MapExplore} />
      <Route path="/venue/new" component={VenueForm} />
      <Route path="/venue/:id/edit" component={VenueForm} />
      <Route path="/venue/:id" component={VenueDetails} />
      <Route path="/book/:venueId/:hallId" component={BookHall} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/bookings" component={Bookings} />
      <Route path="/messages" component={Messages} />
      <Route path="/profile" component={Profile} />
      <Route path="/favorites" component={Favorites} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/my-venues" component={MyVenues} />
      <Route path="/owner/bookings" component={OwnerBookings} />
      <Route path="/owner/reports" component={OwnerReports} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/about" component={AboutUs} />
      <Route path="/terms" component={TermsAndConditions} />
      <Route path="/faq" component={FAQ} />
      <Route path="/testimonials" component={Testimonials} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/personal-info" component={PersonalInfo} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/preferences" component={Preferences} />
      <Route path="/help" component={HelpCenter} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
