"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Mail } from "lucide-react";

type NewsletterStatus = "idle" | "done" | "error";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Inline confirmation under the form (no popup).
  const [status, setStatus] = useState<NewsletterStatus>("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setStatus("idle");
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="bg-muted py-16">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-gold/10">
            <Mail className="h-6 w-6 text-brand-gold" />
          </div>
          <span className="inline-block text-[11px] uppercase tracking-[0.3em] font-semibold text-brand-gold mb-2">
            Newsletter
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-brand-gold">Stay in the Loop</h2>
          <p className="text-muted-foreground mt-2 mb-6">
            Subscribe to our newsletter for exclusive offers, new arrivals, and style
            inspiration.
          </p>
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
              required
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Subscribing..." : "Subscribe"}
            </Button>
          </form>
          {status === "done" && (
            <p
              role="status"
              className="mx-auto mt-4 flex max-w-md items-center justify-center gap-2 text-sm font-medium text-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Subscribed — you are on the list for new arrivals and offers.
            </p>
          )}
          {status === "error" && (
            <p role="alert" className="mx-auto mt-4 max-w-md text-sm font-medium text-destructive">
              Something went wrong. Please try again.
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            By subscribing, you agree to our Privacy Policy. Unsubscribe at any time.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
