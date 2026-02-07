"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthFormWrapper } from "@/components/auth/AuthFormWrapper";
import { supabase } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/account/reset-password`,
      }
    );

    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <AuthFormWrapper
        title="Check Your Email"
        subtitle="Password reset instructions have been sent."
      >
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            We sent a password reset link to{" "}
            <span className="text-foreground font-semibold">{email}</span>.
            Click it to set a new password.
          </p>
          <Link href="/login">
            <Button variant="outline" className="mt-4">
              Back to Sign In
            </Button>
          </Link>
        </div>
      </AuthFormWrapper>
    );
  }

  return (
    <AuthFormWrapper
      title="Reset Password"
      subtitle="Enter your email to receive a reset link."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link
          href="/login"
          className="text-accent hover:underline font-semibold"
        >
          Sign In
        </Link>
      </p>
    </AuthFormWrapper>
  );
}
