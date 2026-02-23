import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Eye, EyeOff, ArrowLeft, Mail } from "lucide-react";
import { Link } from "wouter";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );
}

export default function AuthPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlTab = urlParams.get("tab");
  const urlRole = urlParams.get("role");
  const isVenueOwnerFlow = urlRole === "venue_holder";

  const [isLogin, setIsLogin] = useState(urlTab === "register" ? false : true);
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(isVenueOwnerFlow ? true : false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"planner" | "venue_holder">(isVenueOwnerFlow ? "venue_holder" : "planner");
  const { loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const pwHasLength = password.length >= 8;
  const pwHasLower = /[a-z]/.test(password);
  const pwHasUpper = /[A-Z]/.test(password);
  const pwHasSymbol = /[^a-zA-Z0-9]/.test(password);
  const pwIsValid = pwHasLength && pwHasLower && pwHasUpper && pwHasSymbol;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && !pwIsValid) {
      toast({ title: "Weak password", description: "Password must be at least 8 characters with uppercase, lowercase, and a symbol.", variant: "destructive" });
      return;
    }
    try {
      let userData;
      if (isLogin) {
        userData = await loginMutation.mutateAsync({ email, password });
      } else {
        userData = await registerMutation.mutateAsync({ name, email, phone, password, role });
      }
      toast({ title: isLogin ? "Welcome back!" : "Welcome to Eventsdey!", description: isLogin ? "Good to see you again." : "Your account is ready. Let's find your perfect venue!" });
      if (userData?.role === "venue_holder") {
        setLocation("/my-venues");
      } else if (userData?.role === "admin") {
        setLocation("/admin");
      } else {
        setLocation("/");
      }
    } catch (err: any) {
      const msg = err?.message || "Something went wrong";
      const cleanMsg = msg.includes(":") ? msg.split(":").slice(1).join(":").trim() : msg;
      let parsed = cleanMsg;
      try { parsed = JSON.parse(cleanMsg)?.message || cleanMsg; } catch {}
      toast({ title: "Error", description: parsed, variant: "destructive" });
    }
  };

  const handleSocialLogin = () => {
    window.location.href = "/api/login";
  };

  const authError = urlParams.get("error");
  if (authError === "social_login_unavailable" || authError === "social_login_failed") {
    const errorMsg = authError === "social_login_unavailable"
      ? "Social login is temporarily unavailable. Please use email and password to sign in."
      : "Social login failed. Please try again or use email and password.";
    if (!showEmailForm) {
      setTimeout(() => {
        toast({ title: "Sign-in Issue", description: errorMsg, variant: "destructive" });
        setShowEmailForm(true);
        window.history.replaceState({}, "", "/auth");
      }, 100);
    }
  }

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pt-16">
      <div className="p-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 pb-12">
        <div className="mb-8">
          <span className="text-primary font-medium tracking-widest text-sm" data-testid="text-brand">EVENTSDEY</span>
          <h1 className="font-serif text-4xl font-bold mt-2 text-foreground" data-testid="text-auth-title">
            {isLogin ? "Welcome\nBack." : "Create\nAccount."}
          </h1>
          <p className="text-muted-foreground mt-2" data-testid="text-auth-subtitle">
            {isLogin ? "Sign in to manage your bookings" : "Join the premium venue marketplace"}
          </p>
        </div>

        {!showEmailForm ? (
          <div className="space-y-3">
            <button
              onClick={handleSocialLogin}
              className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border border-border bg-card hover:bg-secondary transition-colors font-medium text-sm"
              data-testid="button-google-login"
            >
              <GoogleIcon className="h-5 w-5" />
              {isLogin ? "Continue with Google" : "Sign up with Google"}
            </button>

            <button
              onClick={handleSocialLogin}
              className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border border-border bg-card hover:bg-secondary transition-colors font-medium text-sm"
              data-testid="button-x-login"
            >
              <XIcon className="h-5 w-5" />
              {isLogin ? "Continue with X" : "Sign up with X"}
            </button>

            <button
              onClick={handleSocialLogin}
              className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border border-border bg-card hover:bg-secondary transition-colors font-medium text-sm"
              data-testid="button-apple-login"
            >
              <AppleIcon className="h-5 w-5" />
              {isLogin ? "Continue with Apple" : "Sign up with Apple"}
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-secondary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-secondary" />
            </div>

            <button
              onClick={() => setShowEmailForm(true)}
              className="w-full h-12 flex items-center justify-center gap-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-bold text-sm shadow-lg shadow-primary/20"
              data-testid="button-email-login"
            >
              <Mail className="h-5 w-5" />
              {isLogin ? "Continue with Email" : "Sign up with Email"}
            </button>
          </div>
        ) : (
          <>
            {!isVenueOwnerFlow && (
              <button
                type="button"
                onClick={() => setShowEmailForm(false)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
                data-testid="button-back-to-options"
              >
                <ArrowLeft className="h-4 w-4" />
                All sign in options
              </button>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <>
                  {isVenueOwnerFlow ? (
                    <div className="p-4 rounded-xl border border-primary bg-primary/10 text-left">
                      <p className="font-semibold text-sm">Venue Owner</p>
                      <p className="text-xs text-muted-foreground mt-1">List my venues</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>I am a...</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setRole("planner")}
                          className={`p-4 rounded-xl border text-left transition-all ${role === "planner" ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                          data-testid="button-role-planner"
                        >
                          <p className="font-semibold text-sm">Event Planner</p>
                          <p className="text-xs text-muted-foreground mt-1">Looking for venues</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRole("venue_holder")}
                          className={`p-4 rounded-xl border text-left transition-all ${role === "venue_holder" ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                          data-testid="button-role-holder"
                        >
                          <p className="font-semibold text-sm">Venue Owner</p>
                          <p className="text-xs text-muted-foreground mt-1">List my venues</p>
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>{role === "venue_holder" ? "Company Name" : "Full Name"}</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={role === "venue_holder" ? "Company Name" : "Name Surname"}
                      className="h-12 bg-card border-border focus:border-primary/50 placeholder:text-white/25"
                      required
                      data-testid="input-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="08012345678"
                      className="h-12 bg-card border-border focus:border-primary/50 placeholder:text-white/25"
                      data-testid="input-phone"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-12 bg-card border-border focus:border-primary/50"
                  required
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="h-12 bg-card border-border focus:border-primary/50 pr-12"
                    required
                    minLength={8}
                    data-testid="input-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </Button>
                </div>
                {!isLogin && password.length > 0 && (
                  <div className="space-y-1 mt-2" data-testid="password-requirements">
                    <p className={`text-xs flex items-center gap-1.5 ${pwHasLength ? "text-green-400" : "text-muted-foreground"}`}>
                      {pwHasLength ? "✓" : "○"} At least 8 characters
                    </p>
                    <p className={`text-xs flex items-center gap-1.5 ${pwHasUpper ? "text-green-400" : "text-muted-foreground"}`}>
                      {pwHasUpper ? "✓" : "○"} At least one uppercase letter
                    </p>
                    <p className={`text-xs flex items-center gap-1.5 ${pwHasLower ? "text-green-400" : "text-muted-foreground"}`}>
                      {pwHasLower ? "✓" : "○"} At least one lowercase letter
                    </p>
                    <p className={`text-xs flex items-center gap-1.5 ${pwHasSymbol ? "text-green-400" : "text-muted-foreground"}`}>
                      {pwHasSymbol ? "✓" : "○"} At least one symbol (!@#$...)
                    </p>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base shadow-lg shadow-primary/20"
                disabled={isPending}
                data-testid="button-submit"
              >
                {isPending ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>
          </>
        )}

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setShowEmailForm(false); setName(""); setEmail(""); setPhone(""); setPassword(""); }}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
            data-testid="button-toggle-auth"
          >
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span className="text-primary font-semibold">{isLogin ? "Sign Up" : "Sign In"}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
