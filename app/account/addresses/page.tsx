"use client";

import { useState, useEffect } from "react";
import { Plus, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { AddressCard } from "@/components/account/AddressCard";
import { AddressForm } from "@/components/account/AddressForm";
import type { SavedAddress } from "@/lib/supabase/types";

export default function AddressesPage() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(
    null
  );

  const loadAddresses = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("saved_addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (data) setAddresses(data as SavedAddress[]);
    setLoading(false);
  };

  useEffect(() => {
    loadAddresses();
  }, [user?.id]);

  const handleSave = async (data: Partial<SavedAddress>) => {
    if (editingAddress) {
      await supabase
        .from("saved_addresses")
        .update(data)
        .eq("id", editingAddress.id)
        .eq("user_id", user!.id);
    } else {
      await supabase
        .from("saved_addresses")
        .insert({ ...data, user_id: user!.id } as any);
    }

    setShowForm(false);
    setEditingAddress(null);
    await loadAddresses();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    await supabase.from("saved_addresses").delete().eq("id", id).eq("user_id", user!.id);
    await loadAddresses();
  };

  const handleSetDefault = async (id: string) => {
    // Unset all defaults first
    await supabase
      .from("saved_addresses")
      .update({ is_default: false })
      .eq("user_id", user!.id);

    // Set the new default
    await supabase
      .from("saved_addresses")
      .update({ is_default: true })
      .eq("id", id)
      .eq("user_id", user!.id);

    await loadAddresses();
  };

  const handleEdit = (address: SavedAddress) => {
    setEditingAddress(address);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted w-48" />
        <div className="h-32 bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display uppercase tracking-wider text-accent">
          Saved Addresses
        </h2>
        {!showForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingAddress(null);
              setShowForm(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Address
          </Button>
        )}
      </div>

      {showForm && (
        <AddressForm
          address={editingAddress}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingAddress(null);
          }}
        />
      )}

      {addresses.length === 0 && !showForm ? (
        <div className="bg-muted border border-border p-12 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            No saved addresses yet.
          </p>
          <Button
            variant="outline"
            onClick={() => setShowForm(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Your First Address
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      )}
    </div>
  );
}
