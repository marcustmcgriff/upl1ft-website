"use client";

import { MapPin, Pencil, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SavedAddress } from "@/lib/supabase/types";

interface AddressCardProps {
  address: SavedAddress;
  onEdit: (address: SavedAddress) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

export function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
}: AddressCardProps) {
  return (
    <div
      className={`bg-muted border p-4 ${
        address.is_default ? "border-accent" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">
            {address.label}
          </span>
          {address.is_default && (
            <span className="text-xs text-accent bg-accent/10 px-2 py-0.5">
              Default
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!address.is_default && (
            <button
              onClick={() => onSetDefault(address.id)}
              className="p-1.5 text-muted-foreground hover:text-accent transition-colors cursor-pointer"
              title="Set as default"
            >
              <Star className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => onEdit(address)}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(address.id)}
            className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground space-y-0.5">
        <p className="text-foreground">{address.full_name}</p>
        <p>{address.address_line1}</p>
        {address.address_line2 && <p>{address.address_line2}</p>}
        <p>
          {address.city}, {address.state} {address.zip}
        </p>
      </div>
    </div>
  );
}
