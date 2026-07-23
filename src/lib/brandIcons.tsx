import {
  Tv, Music, Bot, ShoppingBag, AppWindow, FileText, Code2, Github,
  Gamepad2, Instagram, Linkedin, Lock, Palette, Video, Cloud, Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface BrandVisual {
  Icon: LucideIcon;
  gradient: string;
}

// Ordered by specificity — first match wins, so multi-word brands are checked before generic ones.
const BRAND_RULES: { pattern: RegExp; visual: BrandVisual }[] = [
  { pattern: /netflix/i, visual: { Icon: Tv, gradient: "from-red-600 to-red-900" } },
  { pattern: /amazon prime|prime video/i, visual: { Icon: Video, gradient: "from-orange-400 to-slate-800" } },
  { pattern: /spotify/i, visual: { Icon: Music, gradient: "from-green-500 to-green-800" } },
  { pattern: /chatgpt|openai/i, visual: { Icon: Bot, gradient: "from-teal-500 to-slate-800" } },
  { pattern: /canva/i, visual: { Icon: Palette, gradient: "from-sky-400 via-purple-500 to-indigo-600" } },
  { pattern: /windows/i, visual: { Icon: AppWindow, gradient: "from-sky-500 to-blue-700" } },
  { pattern: /office 365|microsoft office|\boffice\b/i, visual: { Icon: FileText, gradient: "from-red-500 to-orange-500" } },
  { pattern: /jetbrains/i, visual: { Icon: Code2, gradient: "from-violet-600 to-slate-800" } },
  { pattern: /github|copilot/i, visual: { Icon: Github, gradient: "from-slate-700 to-slate-900" } },
  { pattern: /postman/i, visual: { Icon: Code2, gradient: "from-orange-500 to-orange-700" } },
  { pattern: /playstation|\bps4\b|\bps5\b/i, visual: { Icon: Gamepad2, gradient: "from-blue-600 to-indigo-800" } },
  { pattern: /instagram/i, visual: { Icon: Instagram, gradient: "from-purple-500 via-pink-500 to-orange-400" } },
  { pattern: /linkedin/i, visual: { Icon: Linkedin, gradient: "from-blue-600 to-blue-800" } },
  { pattern: /nordvpn|\bvpn\b/i, visual: { Icon: Lock, gradient: "from-blue-700 to-slate-900" } },
  { pattern: /adobe/i, visual: { Icon: Sparkles, gradient: "from-red-600 to-rose-800" } },
  { pattern: /zoom/i, visual: { Icon: Video, gradient: "from-blue-500 to-blue-700" } },
  { pattern: /parallels|vmware/i, visual: { Icon: Cloud, gradient: "from-cyan-500 to-blue-700" } },
  { pattern: /sketch/i, visual: { Icon: Palette, gradient: "from-amber-400 to-orange-600" } },
  { pattern: /shopping|amazon/i, visual: { Icon: ShoppingBag, gradient: "from-orange-400 to-amber-600" } },
];

export function getBrandVisual(title: string): BrandVisual | null {
  const rule = BRAND_RULES.find((r) => r.pattern.test(title));
  return rule?.visual ?? null;
}
