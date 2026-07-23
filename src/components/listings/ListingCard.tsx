import Link from "next/link";
import { Zap, ShieldAlert } from "lucide-react";
import { formatPrice, CATEGORY_ICONS, DELIVERY_LABELS } from "@/lib/utils";
import { RatingStars } from "@/components/ui/RatingStars";
import type { ListingFull } from "@/types/database";

const GRADIENTS = [
  "from-brand-400 to-trust-500",
  "from-blue-400 to-indigo-600",
  "from-trust-400 to-emerald-600",
  "from-indigo-400 to-violet-600",
  "from-sky-400 to-blue-600",
];

interface Props {
  listing: ListingFull;
  index?: number;
  rating?: number | null;
  reviewCount?: number | null;
}

export function ListingCard({ listing, index = 0, rating, reviewCount }: Props) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const icon = CATEGORY_ICONS[listing.category?.slug ?? "other"] ?? "📦";

  return (
    <Link href={`/listings/${listing.id}`}
      className="card flex flex-col overflow-hidden group hover:shadow-lg hover:-translate-y-0.5 transition-all">
      <div className={`relative h-36 bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
        {listing.images?.[0] ? (
          <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover" />
        ) : (
          <span className="text-5xl opacity-90 group-hover:scale-110 transition-transform">{icon}</span>
        )}
        {listing.delivery_method === "auto_key" && (
          <span className="absolute top-3 left-3 badge bg-white/90 text-brand-700 flex items-center gap-1">
            <Zap className="h-3 w-3" /> Instant
          </span>
        )}
        {listing.resale_restricted && (
          <span className="absolute top-3 right-3 badge bg-amber-100 text-amber-800 flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" /> Restricted
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4 gap-2">
        <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-brand-600 transition-colors leading-snug">
          {listing.title}
        </h3>

        <p className="text-lg font-bold text-brand-600">{formatPrice(listing.price, listing.currency)}</p>

        <RatingStars rating={rating ?? null} count={reviewCount} />

        <div className="mt-auto pt-2 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
          <span className="truncate">{listing.seller?.full_name ?? "Seller"}</span>
          <span className="shrink-0">{DELIVERY_LABELS[listing.delivery_method]}</span>
        </div>
      </div>
    </Link>
  );
}
