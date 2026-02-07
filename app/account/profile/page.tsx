"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";

export default function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    await supabase
      .from("profiles")
      .update({ full_name: fullName, phone: phone || null })
      .eq("id", user!.id);

    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (newPassword !== confirmNewPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    setPasswordLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordMessage("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    }
    setPasswordLoading(false);
  };

  return (
    <div className="space-y-8">
      {/* Profile Info */}
      <div>
        <h2 className="text-xl font-display uppercase tracking-wider text-accent mb-4">
          Profile
        </h2>

        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">
              Email
            </label>
            <Input
              type="email"
              value={user?.email || ""}
              disabled
              className="mt-1 opacity-60"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">
              Full Name
            </label>
            <Input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">
              Phone
            </label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(optional)"
              className="mt-1"
            />
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </Button>
        </form>
      </div>

      {/* Change Password */}
      <div className="border-t border-border pt-8">
        <h2 className="text-xl font-display uppercase tracking-wider text-accent mb-4">
          Change Password
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">
              New Password
            </label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">
              Confirm New Password
            </label>
            <Input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          {passwordError && (
            <p className="text-red-500 text-sm">{passwordError}</p>
          )}
          {passwordMessage && (
            <p className="text-green-500 text-sm">{passwordMessage}</p>
          )}

          <Button type="submit" variant="outline" disabled={passwordLoading}>
            {passwordLoading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
