"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const { session } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/newsletter-subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus("success");
        setMessage(data.message || "Welcome to the movement!");
        setEmail("");
        setTimeout(() => setStatus("idle"), 4000);
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong.");
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch {
      setStatus("error");
      setMessage("Failed to subscribe. Please try again.");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <section className="relative py-20 overflow-hidden">
      {/* Creation of Adam Background */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/creation-of-adam.png')",
            backgroundSize: "cover",
            backgroundPosition: "center 35%",
          }}
        />
        {/* Dark overlay for text readability with smooth blend */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/55 to-black/85" />
      </div>

      <div className="relative z-10 container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          {/* Heading */}
          <h2 className="text-4xl md:text-5xl font-display uppercase tracking-wider text-accent gold-glow mb-4">
            Join The Movement
          </h2>
          <p className="text-foreground/90 mb-8">
            Get exclusive drops, scripture inspiration, and updates on new releases.
            Stand with the faithful.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={status === "loading"}
              className="flex-1"
            />
            <Button
              type="submit"
              size="lg"
              disabled={status === "loading"}
              className="sm:w-auto"
            >
              {status === "loading"
                ? "Joining..."
                : status === "success"
                ? "Joined!"
                : "Subscribe"}
            </Button>
          </form>

          {status === "success" && (
            <p className="text-accent text-sm mt-4">
              {message || "Welcome to the movement. Check your email."}
            </p>
          )}
          {status === "error" && (
            <p className="text-red-400 text-sm mt-4">
              {message || "Something went wrong. Please try again."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
