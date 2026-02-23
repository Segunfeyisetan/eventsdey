import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import BottomNav from "@/components/BottomNav";

const faqData = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "What is Eventsdey Nigeria?",
        a: "Eventsdey is Nigeria's premier venue marketplace where event planners can discover, compare, and book verified event venues across Lagos, Abuja, Port Harcourt, and other major cities.",
      },
      {
        q: "How do I create an account?",
        a: "Tap 'Sign Up' on the login page, enter your name, email, and password, then choose your role — either 'Event Planner' (to search and book venues) or 'Venue Owner' (to list your venues). It's free to sign up!",
      },
      {
        q: "Is it free to use Eventsdey?",
        a: "Yes! Creating an account and browsing venues is completely free for Event Planners. Venue Owners can list their venues at no upfront cost.",
      },
    ],
  },
  {
    category: "Booking & Payments",
    questions: [
      {
        q: "How do I book a venue?",
        a: "Browse venues using the search feature, select a venue and hall that fits your needs, choose your event date and number of guests, then submit a booking request. The Venue Owner will review and accept or decline your request.",
      },
      {
        q: "How does the deposit system work?",
        a: "Each hall has its own deposit percentage set by the Venue Owner (ranging from 10% to 100%). When you book, you'll see the deposit amount upfront. The remaining balance is due a set number of days before your event.",
      },
      {
        q: "What currency are prices displayed in?",
        a: "All prices on Eventsdey are displayed in Nigerian Naira (NGN).",
      },
      {
        q: "Can I cancel a booking?",
        a: "Yes. If you haven't paid yet, you can cancel directly. After payment, you'll need to submit a cancellation request with a reason, which the Venue Owner will review and approve or decline.",
      },
      {
        q: "How do refunds work?",
        a: "Refunds are handled on a case-by-case basis. Once a Venue Owner approves your cancellation request, the refund process will be initiated according to the venue's refund policy.",
      },
    ],
  },
  {
    category: "For Venue Owners",
    questions: [
      {
        q: "How do I list my venue?",
        a: "Sign up as a Venue Owner, go to 'My Venues' from your profile, and tap 'Add Venue'. Fill in your venue details, add halls with pricing and amenities, set your payment terms, and publish.",
      },
      {
        q: "Can I have multiple halls in one venue?",
        a: "Yes! Eventsdey supports a multi-hall system. Each hall can have its own name, capacity, price, amenities, and payment terms (deposit percentage and balance due days).",
      },
      {
        q: "How do I manage bookings?",
        a: "Go to 'Incoming Bookings' from your profile. You'll see all booking requests with details. You can accept, decline, or mark bookings as completed.",
      },
      {
        q: "How do I get my venue verified?",
        a: "Our admin team reviews and verifies venues. Verified venues get a badge and appear higher in search results. Ensure your listing is accurate and complete to speed up verification.",
      },
    ],
  },
  {
    category: "Account & Security",
    questions: [
      {
        q: "How do I change my account details?",
        a: "Go to your Profile page where you can view and update your personal information.",
      },
      {
        q: "Is my personal information safe?",
        a: "Yes. We use industry-standard encryption to protect your data. Your password is securely hashed and we never share your personal information with third parties without your consent.",
      },
      {
        q: "What if my account gets suspended?",
        a: "If your account is suspended, you'll receive a notification explaining the reason. Contact our support team at contact@eventsdey.com or call +2349034118323 to resolve the issue.",
      },
    ],
  },
  {
    category: "Reviews & Communication",
    questions: [
      {
        q: "When can I leave a review?",
        a: "You can leave a review after your booking is marked as completed. Reviews help other planners make informed decisions.",
      },
      {
        q: "Can I message a Venue Owner before booking?",
        a: "Yes! Use the in-app messaging feature to communicate directly with Venue Owners about your event needs, availability, or special requirements.",
      },
    ],
  },
];

export default function FAQ() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-faq-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-serif font-bold" data-testid="text-faq-title">FAQ</h1>
      </div>

      <div className="px-6 py-8 space-y-6">
        <div className="text-center mb-8">
          <span className="text-primary font-medium tracking-widest text-sm">EVENTSDEY NIGERIA</span>
          <h2 className="font-serif text-2xl font-bold mt-2 text-foreground">Frequently Asked Questions</h2>
          <p className="text-muted-foreground mt-2 text-sm">Everything you need to know about using our platform</p>
        </div>

        {faqData.map((category) => (
          <div key={category.category}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider px-1">{category.category}</h3>
            <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
              {category.questions.map((item, idx) => {
                const key = `${category.category}-${idx}`;
                const isOpen = openItems.has(key);
                return (
                  <div key={key}>
                    <button
                      onClick={() => toggleItem(key)}
                      className="w-full text-left p-4 flex items-center justify-between hover:bg-secondary transition-colors"
                      data-testid={`faq-question-${category.category.toLowerCase().replace(/\s+/g, '-')}-${idx}`}
                    >
                      <span className="font-medium text-sm pr-4">{item.q}</span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="bg-card border border-border rounded-xl p-5 text-center">
          <p className="text-sm font-medium mb-1">Still have questions?</p>
          <p className="text-xs text-muted-foreground">Contact us at contact@eventsdey.com or call +2349034118323</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
