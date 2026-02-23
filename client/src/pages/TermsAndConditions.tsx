import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import BottomNav from "@/components/BottomNav";

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-terms-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-serif font-bold" data-testid="text-terms-title">Terms & Conditions</h1>
      </div>

      <div className="px-6 py-8 space-y-6">
        <div className="text-center mb-8">
          <span className="text-primary font-medium tracking-widest text-sm">EVENTSDEY NIGERIA</span>
          <h2 className="font-serif text-2xl font-bold mt-2 text-foreground">Terms & Conditions</h2>
          <p className="text-xs text-muted-foreground mt-2">Last updated: February 2026</p>
        </div>

        <Section title="1. Acceptance of Terms">
          By accessing and using the Eventsdey Nigeria platform, you agree to be bound by these Terms and Conditions. 
          If you do not agree with any part of these terms, you must not use our platform.
        </Section>

        <Section title="2. User Accounts">
          You must register an account to access certain features of the platform. You are responsible for maintaining 
          the confidentiality of your account credentials. You must provide accurate and complete information during 
          registration and keep your account information up to date. Eventsdey reserves the right to suspend or 
          terminate accounts that violate these terms.
        </Section>

        <Section title="3. User Roles">
          The platform supports three user roles: Event Planners (who search and book venues), Venue Owners 
          (who list and manage venues), and Administrators (who manage the platform). Each role has specific 
          permissions and responsibilities as defined by the platform.
        </Section>

        <Section title="4. Venue Listings">
          Venue Owners are responsible for the accuracy of their venue listings, including descriptions, pricing, 
          capacity, amenities, and availability. Eventsdey does not guarantee the accuracy of venue listings 
          but works to verify venues on the platform. Misleading or fraudulent listings will result in account suspension.
        </Section>

        <Section title="5. Bookings and Payments">
          Booking requests are subject to acceptance by the Venue Owner. Payment terms, including deposit percentages 
          and balance due dates, are set by individual Venue Owners for each hall/space. All prices are displayed in 
          Nigerian Naira (NGN). By making a booking, you agree to the payment terms specified for that particular venue and hall.
        </Section>

        <Section title="6. Cancellation Policy">
          Cancellation policies vary by booking status. Before payment, Event Planners may cancel bookings directly. 
          After payment has been made, cancellations must be requested and are subject to approval by the Venue Owner. 
          Refund policies are determined on a case-by-case basis by the Venue Owner and Eventsdey.
        </Section>

        <Section title="7. Reviews">
          Users may leave reviews only after a completed booking. Reviews must be honest, fair, and based on actual 
          experience. Eventsdey reserves the right to remove reviews that are fraudulent, abusive, or violate community 
          guidelines. Venue Owners may not offer incentives in exchange for positive reviews.
        </Section>

        <Section title="8. Prohibited Conduct">
          Users must not: use the platform for illegal activities; harass or threaten other users; post false or 
          misleading information; attempt to circumvent platform fees; create multiple accounts for fraudulent purposes; 
          or use automated systems to access the platform without authorization.
        </Section>

        <Section title="9. Intellectual Property">
          All content on the Eventsdey platform, including logos, designs, and text, is the property of Eventsdey Nigeria 
          and is protected by intellectual property laws. Users retain ownership of content they upload but grant 
          Eventsdey a license to use such content for platform operations.
        </Section>

        <Section title="10. Limitation of Liability">
          Eventsdey acts as an intermediary between Event Planners and Venue Owners. We are not liable for disputes 
          between users, the quality of venues, or the outcome of events. Our liability is limited to the extent 
          permitted by Nigerian law.
        </Section>

        <Section title="11. Modifications">
          Eventsdey reserves the right to modify these Terms and Conditions at any time. Users will be notified 
          of significant changes. Continued use of the platform after changes constitutes acceptance of the updated terms.
        </Section>

        <Section title="12. Governing Law">
          These Terms and Conditions are governed by the laws of the Federal Republic of Nigeria. Any disputes 
          arising from the use of this platform shall be resolved in the courts of Lagos State, Nigeria.
        </Section>

        <Section title="13. Contact">
          For questions about these Terms and Conditions, please contact us at contact@eventsdey.com or 
          call +2349034118323. Address: 24 Africa Lane, Off Admiralty Way, Lekki Phase 1, Lagos.
        </Section>
      </div>

      <BottomNav />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5" data-testid={`section-${title.split('.')[0].trim().toLowerCase()}`}>
      <h3 className="font-semibold text-sm text-primary mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}
