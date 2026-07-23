import { Star } from "lucide-react";

interface Props {
  rating: number | null;
  count?: number | null;
  size?: "sm" | "md";
}

export function RatingStars({ rating, count, size = "sm" }: Props) {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  if (!rating) {
    return <span className="text-xs text-gray-400">No reviews yet</span>;
  }
  return (
    <div className="flex items-center gap-1">
      <Star className={`${iconSize} fill-amber-400 text-amber-400`} />
      <span className={size === "sm" ? "text-xs font-medium text-gray-700" : "text-sm font-semibold text-gray-800"}>
        {rating.toFixed(1)}
      </span>
      {count != null && <span className="text-xs text-gray-400">({count})</span>}
    </div>
  );
}
