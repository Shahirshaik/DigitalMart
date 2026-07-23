import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number | null, currency = "INR"): string {
  if (price === null) return "—";
  if (price === 0) return "Free";
  const symbol = currency === "INR" ? "₹" : currency + " ";
  if (price >= 100000) return `${symbol}${(price / 100000).toFixed(1)}L`;
  if (price >= 1000) return `${symbol}${(price / 1000).toFixed(1)}K`;
  return `${symbol}${price.toLocaleString("en-IN")}`;
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export const CATEGORY_LABELS: Record<string, string> = {
  student: "Student",
  experienced_professional: "Experienced Professional",
  career_gap: "Career Gap / Returning",
};

export const SKILL_LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const FORMAT_LABELS: Record<string, string> = {
  self_paced: "Self-paced course",
  live_mentorship: "Live mentorship",
  guided_path: "Guided path",
};

export const LISTING_STATUS_COLORS: Record<string, string> = {
  draft:    "bg-gray-100 text-gray-600",
  pending:  "bg-yellow-100 text-yellow-800",
  active:   "bg-green-100 text-green-800",
  sold_out: "bg-gray-100 text-gray-600",
  rejected: "bg-red-100 text-red-800",
  expired:  "bg-gray-100 text-gray-500",
};

export const CATEGORY_ICONS: Record<string, string> = {
  os_licenses: "🖥️",
  productivity_software: "🧩",
  design_dev_tools: "🛠️",
  subscriptions: "🔁",
  guides_ebooks: "📘",
  gaming: "🎮",
  social_growth: "📈",
};

export const DELIVERY_LABELS: Record<string, string> = {
  auto_key: "Instant Delivery",
  manual_delivery: "Manual Delivery",
  download_link: "Download Link",
};

export const ESCROW_STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-gray-100 text-gray-600",
  held:            "bg-yellow-100 text-yellow-800",
  confirmed:       "bg-blue-100 text-blue-800",
  disputed:        "bg-red-100 text-red-800",
  released:        "bg-green-100 text-green-800",
  refunded:        "bg-gray-100 text-gray-600",
  cancelled:       "bg-gray-100 text-gray-500",
};

// Assumes Indian 10-digit numbers when no country code is present.
export function buildWhatsAppLink(phone: string, message: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const withCountryCode = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`;
}
