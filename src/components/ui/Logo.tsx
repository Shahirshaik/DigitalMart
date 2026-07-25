// Full circular badge — matches the DigitalMart brand mark (blue backdrop,
// gold ring, curved taglines). Use where there's room to breathe: hero
// sections, footer, auth pages. Too small and the curved text blurs —
// use LogoMark below for compact spots like the navbar.
export function Logo({ size = 96, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 240 240"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Digital Mart — Online Earning Platform, Sell and Buy Digital Assets"
    >
      <rect width="240" height="240" rx="28" fill="#1447E6" />
      <circle cx="120" cy="120" r="99" fill="none" stroke="#FFD100" strokeWidth="3" />
      <circle cx="120" cy="120" r="90" fill="none" stroke="#FFD100" strokeWidth="3" />
      <circle cx="120" cy="120" r="81" fill="#FFD100" />
      <path id="dmTopArc" d="M 42 120 A 78 78 0 0 1 198 120" fill="none" />
      <path id="dmBottomArc" d="M 46 128 A 78 78 0 0 0 194 128" fill="none" />
      <text fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="11.5" fill="#1447E6" letterSpacing="2">
        <textPath href="#dmTopArc" startOffset="50%" textAnchor="middle">ONLINE EARNING PLATFORM</textPath>
      </text>
      <text fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="11" fill="#1447E6" letterSpacing="1.5">
        <textPath href="#dmBottomArc" startOffset="50%" textAnchor="middle">SELL AND BUY DIGITAL ASSETS</textPath>
      </text>
      <text
        x="120" y="132"
        fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="29"
        fill="#1447E6" textAnchor="middle" letterSpacing="-0.5"
        textLength="152" lengthAdjust="spacingAndGlyphs"
      >
        DIGITALMART
      </text>
    </svg>
  );
}

// Compact icon-only mark for tight spots (navbar, favicon fallback, loading
// spinners) — a bold "D" monogram on the same gold-on-blue palette, legible
// down to ~24px where the full badge's curved text would blur into mush.
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} role="img" aria-label="Digital Mart">
      <rect width="40" height="40" rx="10" fill="#1447E6" />
      <circle cx="20" cy="20" r="15.5" fill="#FFD100" />
      <text
        x="20" y="27" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="20"
        fill="#1447E6" textAnchor="middle"
      >
        D
      </text>
    </svg>
  );
}
