"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { Book, Mail, MessageSquare, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AppShell } from "@/components/app/AppShell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ME_QUERY } from "@/lib/graphql/queries/auth.queries";
import { SEND_SUPPORT_EMAIL_MUTATION } from "@/lib/graphql/queries/support.queries";
import { toast } from "sonner";

const faqs = [
  {
    question: "How do I create a new property?",
    answer: "Go to Properties, create a house or apartment, then add rooms and devices before opening the simulator.",
  },
  {
    question: "How does the electricity bill calculation work?",
    answer: "Power Fusion uses device wattage, usage duration, and your configured assumptions to estimate consumption and cost.",
  },
  {
    question: "Can I add custom devices?",
    answer: "Yes. Open the simulator and use Add Custom Device to create your own appliance entry.",
  },
  {
    question: "How do I analyze my energy consumption?",
    answer: "Open Analysis to compare usage across properties, rooms, sessions, and device categories.",
  },
];

export default function Help() {
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const { data: meData } = useQuery(ME_QUERY, {
    errorPolicy: "all",
    fetchPolicy: "network-only",
  });
  const [sendSupportEmail, { loading: sendingSupportEmail }] = useMutation(
    SEND_SUPPORT_EMAIL_MUTATION
  );

  const handleSendSupportEmail = async () => {
    if (!subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter your message");
      return;
    }

    try {
      await sendSupportEmail({
        variables: {
          subject: subject.trim(),
          message: message.trim(),
        },
      });
      toast.success("Support email sent");
      setSupportDialogOpen(false);
      setSubject("");
      setMessage("");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send support email";
      toast.error(errorMessage);
    }
  };

  return (
    <AppShell title="Help & Support" current="help" user={meData?.me}>
      <div className="space-y-6">
        <section className="grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Book,
              title: "User Guide",
              description: "Learn the core property, room, and simulator workflow.",
              accent: "text-cyan-300 bg-cyan-400/10",
            },
            {
              icon: Video,
              title: "Video Tutorials",
              description: "Watch walkthroughs for setup, device placement, and reports.",
              accent: "text-lime-300 bg-lime-400/10",
            },
            {
              icon: MessageSquare,
              title: "Contact Support",
              description: "Reach out when you need help debugging your energy model.",
              accent: "text-cyan-300 bg-cyan-400/10",
            },
          ].map(({ icon: Icon, title, description, accent }) => (
            <div key={title} className="app-content-panel app-card-hover">
              <div className={`flex h-14 w-14 items-center justify-center rounded-[1.2rem] ${accent}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="mt-5 text-lg font-semibold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-400">{description}</p>
            </div>
          ))}
        </section>

        <section className="app-content-panel">
          <h2 className="text-xl font-semibold text-white">Frequently Asked Questions</h2>
          <p className="mt-2 text-sm text-slate-400">
            Quick answers for the most common setup and simulation questions.
          </p>

          <div className="mt-6 rounded-[1.5rem] border border-white/6 bg-white/[0.03] px-6">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={faq.question} value={`item-${index}`} className="border-white/6">
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-slate-400">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="app-content-panel">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-cyan-400/10 text-cyan-300">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Still Need Help?</h2>
                <p className="text-sm text-slate-400">support@powerfusion.com</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setSupportDialogOpen(true)}>
              Send Email
            </Button>
          </div>
        </section>

        <Dialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
          <DialogContent className="max-w-xl bg-card border-border">
            <DialogHeader>
              <DialogTitle>Contact Support</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Send a support request from your account email. We will reply to{" "}
                {meData?.me?.email || "your registered email"}.
              </p>
              <div className="space-y-2">
                <label className="text-sm text-foreground">Subject</label>
                <Input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Briefly describe the issue"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-foreground">Message</label>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Tell us what went wrong and what you expected."
                  className="min-h-[160px] w-full rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] backdrop-blur-xl placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => void handleSendSupportEmail()}
                  disabled={sendingSupportEmail}
                >
                  {sendingSupportEmail ? "Sending..." : "Send Email"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
