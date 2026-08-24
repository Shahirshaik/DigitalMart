import Link from "next/link";
import { Instagram, Facebook, MessageCircleMore } from "lucide-react";
import { buildWhatsAppLink } from "@/lib/utils";
import { LogoMark } from "@/components/ui/Logo";
import { getSupportContact, getSocialLinks } from "@/lib/siteContent";

export async function Footer() {
  const [{ whatsappNumber, email }, { instagramUrl, facebookUrl, whatsappChannelUrl }] = await Promise.all([
    getSupportContact(),
    getSocialLinks(),
  ]);
  const supportWhatsAppLink = buildWhatsAppLink(whatsappNumber, "Hi, I have a question about Digital Mart.");
  const hasSocialLinks = Boolean(instagramUrl || facebookUrl || whatsappChannelUrl);

  return (
    <footer className="border-t border-gray-100 bg-white pb-20 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <LogoMark size={24} />
          <p className="text-sm text-gray-500">© {new Date().getFullYear()} Digital Mart. Sell &amp; buy digital assets — escrow-backed, trust-first.</p>
        </div>
        <div className="flex flex-col items-center sm:items-end gap-3">
          <div className="flex items-center gap-5 text-sm text-gray-500">
            <Link href="/about" className="hover:text-brand-600">About</Link>
            <Link href="/contact" className="hover:text-brand-600">Contact</Link>
            <Link href="/partners" className="hover:text-brand-600">Partner With Us</Link>
            <Link href="/terms" className="hover:text-brand-600">Terms</Link>
            <Link href="/privacy" className="hover:text-brand-600">Privacy</Link>
            {supportWhatsAppLink && (
              <a href={supportWhatsAppLink} target="_blank" rel="noopener noreferrer" className="hover:text-brand-600">WhatsApp</a>
            )}
            <a href={`mailto:${email}`} className="hover:text-brand-600">Email</a>
          </div>
          {hasSocialLinks && (
            <div className="flex items-center gap-3 text-gray-400">
              {instagramUrl && (
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Digital Mart on Instagram"
                  className="hover:text-brand-600 transition-colors">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {facebookUrl && (
                <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Digital Mart on Facebook"
                  className="hover:text-brand-600 transition-colors">
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {whatsappChannelUrl && (
                <a href={whatsappChannelUrl} target="_blank" rel="noopener noreferrer" aria-label="Digital Mart WhatsApp Channel"
                  className="hover:text-brand-600 transition-colors">
                  <MessageCircleMore className="h-4 w-4" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
