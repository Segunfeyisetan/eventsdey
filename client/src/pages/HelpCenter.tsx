import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, HelpCircle, MessageCircle, FileText, Shield, BookOpen, Send, Loader2, ChevronRight, ExternalLink } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import BottomNav from "@/components/BottomNav";

const QUICK_HELP = [
  {
    icon: BookOpen,
    title: "Getting Started",
    description: "Learn the basics of using Eventsdey",
    link: "/faq",
  },
  {
    icon: FileText,
    title: "Terms & Conditions",
    description: "Our terms of service and policies",
    link: "/terms",
  },
  {
    icon: Shield,
    title: "Privacy Policy",
    description: "How we protect your data",
    link: "/privacy",
  },
  {
    icon: HelpCircle,
    title: "Frequently Asked Questions",
    description: "Answers to common questions",
    link: "/faq",
  },
];

const SUPPORT_TOPICS = [
  "Booking Issue",
  "Payment Problem",
  "Account Issue",
  "Venue Listing Help",
  "Technical Problem",
  "Feature Request",
  "Other",
];

export default function HelpCenter() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");

  const contactMutation = useMutation({
    mutationFn: async (data: { subject: string; message: string }) => {
      const res = await apiRequest("POST", "/api/support/contact", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Message Sent", description: data.message || "We'll get back to you soon." });
      setSubject("");
      setTopic("");
      setMessage("");
    },
    onError: (err: any) => {
      let msg = "Failed to send message";
      try { msg = JSON.parse(err?.message)?.message || msg; } catch { msg = err?.message || msg; }
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) {
      toast({ title: "Error", description: "Please select a topic.", variant: "destructive" });
      return;
    }
    if (!message.trim()) {
      toast({ title: "Error", description: "Please describe your issue.", variant: "destructive" });
      return;
    }
    const fullSubject = topic + (subject ? ` - ${subject}` : "");
    contactMutation.mutate({ subject: fullSubject, message: message.trim() });
  };

  useEffect(() => {
    if (!authLoading && !user) setLocation("/auth");
  }, [authLoading, user, setLocation]);

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground pt-16 pb-24">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/profile")} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-serif font-bold">Help Center</h1>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider p-4 pb-2">Quick Help</h3>
          <div className="divide-y divide-border">
            {QUICK_HELP.map((item, idx) => (
              <Link key={idx} href={item.link}>
                <div className="flex items-center gap-3 p-4 hover:bg-secondary/50 cursor-pointer transition-colors" data-testid={`link-help-${idx}`}>
                  <item.icon className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact Support</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Need help? Send us a message and we'll respond through your inbox.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Topic</Label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger className="h-12 bg-background border-border" data-testid="select-support-topic">
                  <SelectValue placeholder="What's this about?" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORT_TOPICS.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Subject (optional)</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description"
                className="h-12 bg-background border-border focus:border-primary/50"
                data-testid="input-support-subject"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Message</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue in detail..."
                className="min-h-[120px] bg-background border-border focus:border-primary/50 resize-none"
                data-testid="input-support-message"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
              disabled={contactMutation.isPending}
              data-testid="button-send-support"
            >
              {contactMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Send Message</>
              )}
            </Button>
          </form>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact Info</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">support@eventsdey.com</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-muted-foreground">Response Time</span>
              <span className="text-sm font-medium">Within 24 hours</span>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
