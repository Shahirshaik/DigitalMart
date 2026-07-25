import Link from "next/link";
import { buildWhatsAppLink } from "@/lib/utils";
import { LogoMark } from "@/components/ui/Logo";

const SUPPORT_WHATSAPP_LINK = buildWhatsAppLink("+91 9010731398", "Hi, I have a question about Digital Mart.");

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <LogoMark size={24} />
          <p className="text-sm text-gray-500">© {new Date().getFullYear()} Digital Mart. Sell &amp; buy digital assets — escrow-backed, trust-first.</p>
        </div>
        <div className="flex items-center gap-5 text-sm text-gray-500">
          <Link href="/terms" className="hover:text-brand-600">Terms</Link>
          <Link href="/privacy" className="hover:text-brand-600">Privacy</Link>
          {SUPPORT_WHATSAPP_LINK && (
            <a href={SUPPORT_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-brand-600">WhatsApp</a>
          )}
          <a href="mailto:digitalmartbuysell@gmail.com" className="hover:text-brand-600">Email</a>
        </div>
      </div>
    </footer>
  );
}
