"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import { getImageUrl } from "@/lib/utils";

interface CartItemProps {
  item: any;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

export default function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  return (
    <div className="flex gap-4 p-4 border rounded-xl">
      <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted shrink-0">
        <Image
          src={item.product?.images?.[0] ? getImageUrl(item.product.images[0]) : "/placeholder.png"}
          alt={item.product?.name || "Product"}
          fill
          className="object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{item.product?.name}</h3>
        <p className="text-sm text-muted-foreground">
          Size: {item.size} | Color: {item.color}
        </p>
        <p className="font-bold mt-1">Rs {item.price?.toLocaleString()}</p>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onUpdateQuantity(Math.max(1, item.quantity - 1))}
              disabled={item.quantity <= 1}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-8 text-center text-sm">{item.quantity}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onUpdateQuantity(item.quantity + 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <Button variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold">Rs {(item.price * item.quantity).toLocaleString()}</p>
      </div>
    </div>
  );
}
