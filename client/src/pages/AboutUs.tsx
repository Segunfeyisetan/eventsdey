import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Shield, Star, Users, Target, Heart } from "lucide-react";
import { Link } from "wouter";
import BottomNav from "@/components/BottomNav";

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-about-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-serif font-bold" data-testid="text-about-title">About Us</h1>
      </div>

      <div className="px-6 py-8 space-y-8">
        <section className="text-center">
          <span className="text-primary font-medium tracking-widest text-sm" data-testid="text-about-brand">EVENTSDEY NIGERIA</span>
          <h2 className="font-serif text-3xl font-bold mt-3 text-foreground" data-testid="text-about-headline">Nigeria's Premier Venue Marketplace</h2>
          <p className="text-muted-foreground mt-4 leading-relaxed max-w-lg mx-auto">
            Eventsdey connects event planners with the finest verified venues across Nigeria. 
            From intimate gatherings to grand celebrations, we make finding and booking the perfect space effortless.
          </p>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Our Mission</h3>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Target className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed">
                To revolutionize event planning in Nigeria by providing a seamless, trustworthy platform 
                where venue owners and event planners connect. We believe every event deserves the perfect venue, 
                and every venue deserves the right audience.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Why Choose Eventsdey</h3>
          <div className="space-y-3">
            <FeatureCard
              icon={Shield}
              title="Verified Venues"
              description="Every venue is personally verified by our team to ensure quality, accuracy, and safety standards."
            />
            <FeatureCard
              icon={MapPin}
              title="Nationwide Coverage"
              description="Discover venues across Lagos, Abuja, Port Harcourt, and other major cities in Nigeria."
            />
            <FeatureCard
              icon={Star}
              title="Honest Reviews"
              description="Real reviews from real event planners help you make informed booking decisions."
            />
            <FeatureCard
              icon={Users}
              title="Direct Communication"
              description="Message venue owners directly to discuss your event needs and negotiate terms."
            />
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Our Values</h3>
          <div className="grid grid-cols-2 gap-3">
            <ValueCard title="Transparency" description="Clear pricing, honest reviews, no hidden fees" />
            <ValueCard title="Quality" description="Only the best venues make it onto our platform" />
            <ValueCard title="Trust" description="Secure bookings with payment protection" />
            <ValueCard title="Community" description="Building Nigeria's event planning ecosystem" />
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Contact Us</h3>
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Get in Touch</p>
                <p className="text-xs text-muted-foreground">We'd love to hear from you</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Email: contact@eventsdey.com</p>
              <p>Phone: +2349034118323</p>
              <p>24 Africa Lane, Off Admiralty Way, Lekki Phase 1, Lagos</p>
            </div>
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3" data-testid={`feature-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}

function ValueCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4" data-testid={`value-${title.toLowerCase()}`}>
      <p className="font-semibold text-sm text-primary">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}
