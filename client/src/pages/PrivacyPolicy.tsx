import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import BottomNav from "@/components/BottomNav";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-privacy-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-serif font-bold" data-testid="text-privacy-title">Privacy Policy</h1>
      </div>

      <div className="px-6 py-8 space-y-6">
        <div className="text-center mb-8">
          <span className="text-primary font-medium tracking-widest text-sm">EVENTSDEY NIGERIA</span>
          <h2 className="font-serif text-2xl font-bold mt-2 text-foreground">Privacy Policy</h2>
          <p className="text-xs text-muted-foreground mt-2">Last updated: February 2026</p>
        </div>

        <Section title="1. Information We Collect">
          We collect information you provide directly, including your name, email address, phone number, 
          and account credentials when you register. For Venue Owners, we also collect venue details, 
          pricing, and business information. We automatically collect usage data such as pages visited, 
          booking activity, and device information.
        </Section>

        <Section title="2. How We Use Your Information">
          We use your information to: provide and improve our platform services; process bookings and 
          facilitate communication between Event Planners and Venue Owners; send important notifications 
          about your bookings and account; personalize your experience and recommend relevant venues; 
          ensure platform security and prevent fraud; and comply with legal obligations.
        </Section>

        <Section title="3. Information Sharing">
          We share your information only in these circumstances: with Venue Owners when you make a booking 
          request (your name, email, and booking details); with Event Planners when they book your venue 
          (venue details and contact info); with service providers who help us operate the platform; 
          and when required by Nigerian law or legal process.
        </Section>

        <Section title="4. Data Security">
          We implement industry-standard security measures to protect your personal information. Passwords 
          are securely hashed using bcrypt encryption. All data is transmitted over encrypted connections. 
          However, no method of transmission over the Internet is 100% secure, and we cannot guarantee 
          absolute security.
        </Section>

        <Section title="5. Your Rights">
          You have the right to: access your personal data; correct inaccurate information; request deletion 
          of your account and data; withdraw consent for data processing; receive a copy of your data in a 
          portable format. To exercise these rights, contact us at contact@eventsdey.com.
        </Section>

        <Section title="6. Cookies and Tracking">
          We use session cookies to keep you logged in and maintain your preferences. We do not use 
          third-party tracking cookies for advertising purposes. You can configure your browser to block 
          cookies, but some platform features may not function properly.
        </Section>

        <Section title="7. Data Retention">
          We retain your account data for as long as your account is active. Booking records are kept 
          for a minimum of 5 years for legal and financial compliance. If you delete your account, we 
          will remove your personal information within 30 days, except where retention is required by law.
        </Section>

        <Section title="8. Children's Privacy">
          Eventsdey is not intended for users under the age of 18. We do not knowingly collect personal 
          information from children. If we discover that a child's data has been collected, we will 
          delete it promptly.
        </Section>

        <Section title="9. Third-Party Links">
          Our platform may contain links to third-party websites or services. We are not responsible 
          for the privacy practices of these external sites. We encourage you to review the privacy 
          policies of any third-party services you use.
        </Section>

        <Section title="10. Changes to This Policy">
          We may update this Privacy Policy from time to time. We will notify you of significant changes 
          via email or an in-app notification. Continued use of the platform after changes constitutes 
          acceptance of the updated policy.
        </Section>

        <Section title="11. Nigeria Data Protection">
          This Privacy Policy complies with the Nigeria Data Protection Regulation (NDPR) and the 
          Nigeria Data Protection Act 2023. We are committed to protecting your data rights as outlined 
          in these regulations.
        </Section>

        <Section title="12. Contact Us">
          For privacy-related inquiries, please contact our Data Protection Officer at 
          contact@eventsdey.com or write to: 24 Africa Lane, Off Admiralty Way, Lekki Phase 1, Lagos. Phone: +2349034118323.
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
