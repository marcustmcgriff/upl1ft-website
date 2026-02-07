"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthFormWrapper } from "@/components/auth/AuthFormWrapper";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { useAuth } from "@/components/auth/AuthProvider";

export default function SignUpPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { signUp, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push("/account");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { error: signUpError } = await signUp(email, password, fullName);
    if (signUpError) {
      setError(signUpError);
      setLoading(false);
    } else {
      setEmailSent(true);
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <AuthFormWrapper
        title="Check Your Email"
        subtitle="A confirmation link has been sent to your inbox."
      >
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Click the link in the email we sent to{" "}
            <span className="text-foreground font-semibold">{email}</span> to
            activate your account.
          </p>
          <p className="text-xs text-muted-foreground">
            Didn&apos;t receive it? Check your spam folder.
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
      title="Join the Movement"
      subtitle="Create your UPL1FT member account."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            disabled={loading}
          />
        </div>
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
        <div>
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            minLength={6}
          />
        </div>
        <div>
          <Input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating Account..." : "Create Account"}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-muted px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <GoogleSignInButton label="Sign up with Google" />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
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
