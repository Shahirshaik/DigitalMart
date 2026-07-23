import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-500">© {new Date().getFullYear()} Digital Mart. Escrow-backed, trust-first.</p>
        <div className="flex items-center gap-5 text-sm text-gray-500">
          <Link href="/terms" className="hover:text-brand-600">Terms</Link>
          <Link href="/privacy" className="hover:text-brand-600">Privacy</Link>
          <a href="mailto:digitalmartbuysell@gmail.com" className="hover:text-brand-600">Contact</a>
        </div>
      </div>
    </footer>
  );
}
