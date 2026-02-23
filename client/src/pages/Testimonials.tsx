import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Quote } from "lucide-react";
import { Link } from "wouter";
import BottomNav from "@/components/BottomNav";

const testimonials = [
  {
    name: "Adaeze Okonkwo",
    role: "Event Planner",
    location: "Lagos",
    rating: 5,
    text: "Eventsdey made planning my client's wedding so much easier. I found the perfect venue in Lekki within minutes and the booking process was seamless. The deposit system gave us flexibility with payments.",
  },
  {
    name: "Emeka Nwosu",
    role: "Venue Owner",
    location: "Abuja",
    rating: 5,
    text: "Since listing my conference center on Eventsdey, I've seen a 40% increase in bookings. The platform handles everything from booking requests to payment tracking. It's a game-changer for venue owners.",
  },
  {
    name: "Funke Adeyemi",
    role: "Event Planner",
    location: "Port Harcourt",
    rating: 5,
    text: "I love how I can compare multiple venues side by side, check hall capacities, and read honest reviews from other planners. Eventsdey saved me weeks of venue hunting for my corporate retreat.",
  },
  {
    name: "Chukwudi Eze",
    role: "Venue Owner",
    location: "Lagos",
    rating: 4,
    text: "The multi-hall feature is brilliant. I can list all four of my event spaces with different pricing and amenities. The cancellation request system also protects us as venue owners.",
  },
  {
    name: "Aisha Mohammed",
    role: "Event Planner",
    location: "Abuja",
    rating: 5,
    text: "What I appreciate most about Eventsdey is the transparency. You see the exact deposit amount, balance due date, and total cost before booking. No surprises! I've used it for three events already.",
  },
  {
    name: "Olumide Bakare",
    role: "Event Planner",
    location: "Ibadan",
    rating: 5,
    text: "The direct messaging feature let me discuss my specific requirements with the venue owner before booking. They were incredibly responsive and accommodating. Highly recommend!",
  },
  {
    name: "Ngozi Obi",
    role: "Venue Owner",
    location: "Enugu",
    rating: 5,
    text: "Being verified on Eventsdey gave my venue credibility and boosted bookings significantly. The admin team was thorough but professional during the verification process.",
  },
  {
    name: "Ibrahim Suleiman",
    role: "Event Planner",
    location: "Lagos",
    rating: 4,
    text: "I organized a 500-guest corporate gala using Eventsdey. Found the venue, booked a grand ballroom, and communicated all details through the platform. Everything went perfectly.",
  },
];

export default function Testimonials() {
  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-testimonials-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-serif font-bold" data-testid="text-testimonials-title">Testimonials</h1>
      </div>

      <div className="px-6 py-8 space-y-6">
        <div className="text-center mb-8">
          <span className="text-primary font-medium tracking-widest text-sm">EVENTSDEY NIGERIA</span>
          <h2 className="font-serif text-2xl font-bold mt-2 text-foreground">What Our Users Say</h2>
          <p className="text-muted-foreground mt-2 text-sm">Real stories from real event planners and venue owners</p>
        </div>

        <div className="space-y-4">
          {testimonials.map((t, idx) => (
            <div key={idx} className="bg-card border border-border rounded-xl p-5" data-testid={`testimonial-card-${idx}`}>
              <div className="flex items-start gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold text-sm">{t.name[0]}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role} · {t.location}</p>
                    </div>
                    <Quote className="h-5 w-5 text-primary/30" />
                  </div>
                  <div className="flex gap-0.5 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${i < t.rating ? "text-primary fill-primary" : "text-white/20"}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t.text}</p>
            </div>
          ))}
        </div>

        <div className="bg-card border border-primary/20 rounded-xl p-5 text-center">
          <p className="text-sm font-medium text-primary mb-1">Share Your Experience</p>
          <p className="text-xs text-muted-foreground">Book a venue through Eventsdey and leave a review after your event</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
