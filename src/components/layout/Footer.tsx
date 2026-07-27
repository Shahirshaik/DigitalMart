import Link from "next/link";
import { buildWhatsAppLink } from "@/lib/utils";
import { LogoMark } from "@/components/ui/Logo";
import { getSupportContact } from "@/lib/siteContent";

export async function Footer() {
  const { whatsappNumber, email } = await getSupportContact();
  const supportWhatsAppLink = buildWhatsAppLink(whatsappNumber, "Hi, I have a question about Digital Mart.");

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
          {supportWhatsAppLink && (
            <a href={supportWhatsAppLink} target="_blank" rel="noopener noreferrer" className="hover:text-brand-600">WhatsApp</a>
          )}
          <a href={`mailto:${email}`} className="hover:text-brand-600">Email</a>
        </div>
      </div>
    </footer>
  );
}
