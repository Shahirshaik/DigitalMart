"use client";

import { useState } from "react";
import { Star } from "lucide-react";

export function RatingInput({ name = "rating" }: { name?: string }) {
  const [value, setValue] = useState(0);
  const [hovered, setHovered] = useState(0);

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setValue(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <Star className={`h-7 w-7 ${n <= (hovered || value) ? "text-amber-400 fill-amber-400" : "text-gray-300"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
