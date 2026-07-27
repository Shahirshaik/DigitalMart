import {
  Wallet, Zap, Megaphone, Store, ShieldCheck, Users, Package, TrendingUp,
  GraduationCap, Gift, Star, Clock, type LucideIcon,
} from "lucide-react";

// Fixed set of icons admin can pick for homepage perk cards — kept small and
// named so the DB only ever stores a stable key, never a component reference.
export const PERK_ICON_MAP: Record<string, LucideIcon> = {
  wallet: Wallet,
  zap: Zap,
  megaphone: Megaphone,
  store: Store,
  shield: ShieldCheck,
  users: Users,
  package: Package,
  trending_up: TrendingUp,
  graduation_cap: GraduationCap,
  gift: Gift,
  star: Star,
  clock: Clock,
};

export const PERK_ICON_NAMES = Object.keys(PERK_ICON_MAP);
