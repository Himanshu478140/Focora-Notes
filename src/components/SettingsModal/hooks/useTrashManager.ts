import { useState } from "react";
import { ItemToDeletePermanently } from "../types";

export function useTrashManager() {
  const [showConfirmEmpty, setShowConfirmEmpty] = useState(false);
  const [itemToDeletePermanently, setItemToDeletePermanently] = useState<ItemToDeletePermanently | null>(null);

  const formatDeletedAt = (deletedAt?: number) => {
    if (!deletedAt) return "Deleted some time ago";
    const diff = Date.now() - deletedAt;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Deleted just now";
    if (mins < 60) return `Deleted ${mins} minute${mins > 1 ? "s" : ""} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Deleted ${hours} hour${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    return `Deleted ${days} day${days > 1 ? "s" : ""} ago`;
  };

  return {
    showConfirmEmpty,
    setShowConfirmEmpty,
    itemToDeletePermanently,
    setItemToDeletePermanently,
    formatDeletedAt,
  };
}
