"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { SavedAddress } from "@/lib/supabase/types";

interface AddressFormProps {
  address?: SavedAddress | null;
  onSave: (data: Partial<SavedAddress>) => Promise<void>;
  onCancel: () => void;
}

export function AddressForm({ address, onSave, onCancel }: AddressFormProps) {
  const [label, setLabel] = useState(address?.label || "Home");
  const [fullName, setFullName] = useState(address?.full_name || "");
  const [line1, setLine1] = useState(address?.address_line1 || "");
  const [line2, setLine2] = useState(address?.address_line2 || "");
  const [city, setCity] = useState(address?.city || "");
  const [state, setState] = useState(address?.state || "");
  const [zip, setZip] = useState(address?.zip || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave({
      label,
      full_name: fullName,
      address_line1: line1,
      address_line2: line2 || null,
      city,
      state,
      zip,
      country: "US",
    });
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-muted border border-border p-6">
      <h3 className="text-lg font-display uppercase tracking-wider text-accent">
        {address ? "Edit Address" : "Add New Address"}
      </h3>

      <div className="grid grid-cols-3 gap-2">
        {["Home", "Work", "Other"].map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setLabel(opt)}
            className={`text-sm py-2 border transition-colors cursor-pointer ${
              label === opt
                ? "border-accent text-accent bg-accent/10"
                : "border-border text-muted-foreground hover:border-foreground"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      <Input
        placeholder="Full Name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />
      <Input
        placeholder="Address Line 1"
        value={line1}
        onChange={(e) => setLine1(e.target.value)}
        required
      />
      <Input
        placeholder="Address Line 2 (optional)"
        value={line2}
        onChange={(e) => setLine2(e.target.value)}
      />
      <div className="grid grid-cols-3 gap-3">
        <Input
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          required
        />
        <Input
          placeholder="State"
          value={state}
          onChange={(e) => setState(e.target.value)}
          required
          maxLength={2}
        />
        <Input
          placeholder="ZIP"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          required
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : address ? "Update Address" : "Save Address"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
