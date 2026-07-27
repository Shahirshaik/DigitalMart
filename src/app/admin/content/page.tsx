import Link from "next/link";
import { redirect } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ImageCropUploader } from "@/components/ui/ImageCropUploader";
import { PERK_ICON_NAMES } from "@/lib/perkIcons";
import {
  updateSiteContent, upsertAdSlide, deleteAdSlide, upsertPerk, deletePerk,
  updateCategoryDisplay, upsertLegalSection, deleteLegalSection,
} from "./actions";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "Site Content | Admin" };

const ADMIN_TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/sellers", label: "Seller Verification" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/requests", label: "Requests" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/content", label: "Site Content" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/audit", label: "Audit Log" },
];

export default async function AdminContentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin/content");
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const [
    { data: contentRows },
    { data: slides },
    { data: perks },
    { data: categories },
    { data: legalSections },
  ] = await Promise.all([
    supabase.from("site_content").select("*"),
    supabase.from("ad_slides").select("*").order("sort_order"),
    supabase.from("homepage_perks").select("*").order("sort_order"),
    supabase.from("listing_categories").select("*").order("sort_order"),
    supabase.from("legal_sections").select("*").order("page").order("sort_order"),
  ]);

  const content = Object.fromEntries((contentRows ?? []).map((r) => [r.key, r.value]));
  const termsSections = (legalSections ?? []).filter((s) => s.page === "terms");
  const privacySections = (legalSections ?? []).filter((s) => s.page === "privacy");

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={profile?.role as AccountRole} userEmail={user.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin Panel</h1>
          <p className="text-sm text-gray-500 mb-6">Platform-wide analytics and moderation tools.</p>

          <div className="flex items-center gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
            {ADMIN_TABS.map((t) => (
              <Link key={t.href} href={t.href}
                className={`px-4 py-2.5 text-sm font-medium shrink-0 ${t.href === "/admin/content" ? "text-brand-600 border-b-2 border-brand-600" : "text-gray-500 hover:text-gray-700"}`}>
                {t.label}
              </Link>
            ))}
          </div>

          <nav className="flex flex-wrap gap-3 text-xs text-brand-600 mb-8">
            <a href="#hero" className="hover:underline">Hero &amp; Contact</a>
            <a href="#carousel" className="hover:underline">Ad Carousel</a>
            <a href="#perks" className="hover:underline">Seller Perks</a>
            <a href="#categories" className="hover:underline">Category Icons</a>
            <a href="#legal" className="hover:underline">Terms &amp; Privacy</a>
          </nav>

          {/* ── Hero & Contact ───────────────────────────── */}
          <section id="hero" className="card p-6 mb-8 scroll-mt-20">
            <h2 className="section-title text-lg mb-1">Hero &amp; Contact Info</h2>
            <p className="text-sm text-gray-500 mb-4">Homepage headline copy, plus the WhatsApp number and email used across the site (footer, disputes, payouts).</p>
            <form action={updateSiteContent} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Badge text</label>
                <input name="hero_badge_text" defaultValue={content.hero_badge_text} className="input" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Headline (main)</label>
                  <input name="hero_headline_main" defaultValue={content.hero_headline_main} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Headline (accent, gold)</label>
                  <input name="hero_headline_accent" defaultValue={content.hero_headline_accent} className="input" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Subtext</label>
                <textarea name="hero_subtext" defaultValue={content.hero_subtext} rows={2} className="input" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Primary button label</label>
                  <input name="hero_cta_primary_label" defaultValue={content.hero_cta_primary_label} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Secondary button label</label>
                  <input name="hero_cta_secondary_label" defaultValue={content.hero_cta_secondary_label} className="input" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">"Why sell" section title</label>
                  <input name="perks_section_title" defaultValue={content.perks_section_title} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">"Why sell" section subtitle</label>
                  <input name="perks_section_subtitle" defaultValue={content.perks_section_subtitle} className="input" />
                </div>
              </div>
              <hr className="border-gray-100" />
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Support WhatsApp number</label>
                  <input name="support_whatsapp_number" defaultValue={content.support_whatsapp_number} className="input" placeholder="+91 9010731398" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Support email</label>
                  <input name="support_email" defaultValue={content.support_email} className="input" />
                </div>
              </div>
              <button type="submit" className="btn-primary py-2.5 px-5 text-sm">Save</button>
            </form>
          </section>

          {/* ── Ad Carousel ──────────────────────────────── */}
          <section id="carousel" className="card p-6 mb-8 scroll-mt-20">
            <h2 className="section-title text-lg mb-1">Ad Carousel</h2>
            <p className="text-sm text-gray-500 mb-4">Slides shown at the top of the home page. Lower sort order shows first.</p>
            <div className="space-y-4">
              {(slides ?? []).map((s) => (
                <details key={s.id} className="rounded-xl border border-gray-100 p-4" open={!s.is_active}>
                  <summary className="cursor-pointer text-sm font-medium text-gray-800 flex items-center justify-between">
                    <span>{s.title || "(image-only slide)"} {!s.is_active && <span className="badge bg-gray-100 text-gray-500 ml-2">inactive</span>}</span>
                    <span className="text-xs text-gray-400">#{s.sort_order}</span>
                  </summary>
                  <form action={upsertAdSlide} className="mt-4 space-y-3">
                    <input type="hidden" name="id" value={s.id} />
                    <ImageCropUploader name="image_url" defaultValue={s.image_url} aspect={3}
                      label="Desktop/tablet image (optional — falls back to gradient + icon)" />
                    <ImageCropUploader name="image_url_mobile" defaultValue={s.image_url_mobile} aspect={1.5}
                      label="Mobile image (optional — falls back to the image above)" />
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Title (leave blank if your image already has its own headline)</label>
                      <input name="title" defaultValue={s.title} className="input" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Description (leave blank if your image already has its own copy)</label>
                      <textarea name="description" defaultValue={s.description} rows={2} className="input" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Button label</label>
                        <input name="cta_label" defaultValue={s.cta_label} required className="input" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Link URL</label>
                        <input name="link_url" defaultValue={s.link_url} required className="input" placeholder="/listings or https://..." />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Sort order</label>
                        <input type="number" name="sort_order" defaultValue={s.sort_order} className="input" />
                      </div>
                      <div className="flex items-end gap-4 pb-2.5">
                        <label className="flex items-center gap-1.5 text-sm text-gray-700">
                          <input type="checkbox" name="is_gold" defaultChecked={s.is_gold} /> Gold button style
                        </label>
                        <label className="flex items-center gap-1.5 text-sm text-gray-700">
                          <input type="checkbox" name="is_active" defaultChecked={s.is_active} /> Active
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="submit" className="btn-primary py-2 px-4 text-sm">Save Slide</button>
                    </div>
                  </form>
                  <form action={deleteAdSlide.bind(null, s.id)} className="mt-2">
                    <button type="submit" className="text-xs text-red-600 hover:underline flex items-center gap-1">
                      <Trash2 className="h-3 w-3" /> Delete slide
                    </button>
                  </form>
                </details>
              ))}
            </div>

            <details className="mt-4 rounded-xl border border-dashed border-gray-200 p-4">
              <summary className="cursor-pointer text-sm font-medium text-brand-600 flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add new slide
              </summary>
              <form action={upsertAdSlide} className="mt-4 space-y-3">
                <ImageCropUploader name="image_url" aspect={3} label="Desktop/tablet image (optional)" />
                <ImageCropUploader name="image_url_mobile" aspect={1.5} label="Mobile image (optional — falls back to the image above)" />
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Title (leave blank if your image already has its own headline)</label>
                  <input name="title" className="input" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description (leave blank if your image already has its own copy)</label>
                  <textarea name="description" rows={2} className="input" />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Button label</label>
                    <input name="cta_label" required className="input" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Link URL</label>
                    <input name="link_url" required className="input" placeholder="/listings or https://..." />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Sort order</label>
                    <input type="number" name="sort_order" defaultValue={slides?.length ?? 0} className="input" />
                  </div>
                  <div className="flex items-end gap-4 pb-2.5">
                    <label className="flex items-center gap-1.5 text-sm text-gray-700">
                      <input type="checkbox" name="is_gold" /> Gold button style
                    </label>
                    <label className="flex items-center gap-1.5 text-sm text-gray-700">
                      <input type="checkbox" name="is_active" defaultChecked /> Active
                    </label>
                  </div>
                </div>
                <button type="submit" className="btn-primary py-2 px-4 text-sm">Add Slide</button>
              </form>
            </details>
          </section>

          {/* ── Seller Perks ─────────────────────────────── */}
          <section id="perks" className="card p-6 mb-8 scroll-mt-20">
            <h2 className="section-title text-lg mb-1">"Why Sell" Perk Cards</h2>
            <p className="text-sm text-gray-500 mb-4">The four cards on the home page below the hero.</p>
            <div className="space-y-4">
              {(perks ?? []).map((p) => (
                <details key={p.id} className="rounded-xl border border-gray-100 p-4" open={!p.is_active}>
                  <summary className="cursor-pointer text-sm font-medium text-gray-800 flex items-center justify-between">
                    <span>{p.title} {!p.is_active && <span className="badge bg-gray-100 text-gray-500 ml-2">inactive</span>}</span>
                    <span className="text-xs text-gray-400">#{p.sort_order}</span>
                  </summary>
                  <form action={upsertPerk} className="mt-4 space-y-3">
                    <input type="hidden" name="id" value={p.id} />
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                        <input name="title" defaultValue={p.title} required className="input" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Icon</label>
                        <select name="icon_name" defaultValue={p.icon_name} className="input">
                          {PERK_ICON_NAMES.map((n) => <option key={n} value={n}>{n.replace(/_/g, " ")}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                      <textarea name="description" defaultValue={p.description} rows={2} required className="input" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Sort order</label>
                        <input type="number" name="sort_order" defaultValue={p.sort_order} className="input" />
                      </div>
                      <div className="flex items-end pb-2.5">
                        <label className="flex items-center gap-1.5 text-sm text-gray-700">
                          <input type="checkbox" name="is_active" defaultChecked={p.is_active} /> Active
                        </label>
                      </div>
                    </div>
                    <button type="submit" className="btn-primary py-2 px-4 text-sm">Save Perk</button>
                  </form>
                  <form action={deletePerk.bind(null, p.id)} className="mt-2">
                    <button type="submit" className="text-xs text-red-600 hover:underline flex items-center gap-1">
                      <Trash2 className="h-3 w-3" /> Delete perk
                    </button>
                  </form>
                </details>
              ))}
            </div>

            <details className="mt-4 rounded-xl border border-dashed border-gray-200 p-4">
              <summary className="cursor-pointer text-sm font-medium text-brand-600 flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add new perk
              </summary>
              <form action={upsertPerk} className="mt-4 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                    <input name="title" required className="input" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Icon</label>
                    <select name="icon_name" defaultValue="wallet" className="input">
                      {PERK_ICON_NAMES.map((n) => <option key={n} value={n}>{n.replace(/_/g, " ")}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <textarea name="description" rows={2} required className="input" />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Sort order</label>
                    <input type="number" name="sort_order" defaultValue={perks?.length ?? 0} className="input" />
                  </div>
                  <div className="flex items-end pb-2.5">
                    <label className="flex items-center gap-1.5 text-sm text-gray-700">
                      <input type="checkbox" name="is_active" defaultChecked /> Active
                    </label>
                  </div>
                </div>
                <button type="submit" className="btn-primary py-2 px-4 text-sm">Add Perk</button>
              </form>
            </details>
          </section>

          {/* ── Category Icons ───────────────────────────── */}
          <section id="categories" className="card p-6 mb-8 scroll-mt-20">
            <h2 className="section-title text-lg mb-1">Category Icons</h2>
            <p className="text-sm text-gray-500 mb-4">Emoji + display name shown on the home page and browse filters.</p>
            <div className="space-y-2">
              {(categories ?? []).map((c) => (
                <form key={c.id} action={updateCategoryDisplay.bind(null, c.id)} className="flex items-center gap-2">
                  <input name="icon" defaultValue={c.icon ?? ""} className="input w-16 text-center text-lg py-1.5" />
                  <input name="name" defaultValue={c.name} required className="input flex-1 py-1.5" />
                  <button type="submit" className="btn-secondary py-1.5 px-3 text-xs shrink-0">Save</button>
                </form>
              ))}
            </div>
          </section>

          {/* ── Legal Pages ──────────────────────────────── */}
          <section id="legal" className="card p-6 mb-8 scroll-mt-20">
            <h2 className="section-title text-lg mb-1">Terms &amp; Privacy</h2>
            <p className="text-sm text-gray-500 mb-4">Each page is a list of numbered sections — edit the heading and body text of each.</p>

            <h3 className="font-semibold text-gray-800 mb-3">Terms of Service</h3>
            <div className="space-y-3 mb-6">
              {termsSections.map((s) => (
                <details key={s.id} className="rounded-xl border border-gray-100 p-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-800">{s.heading}</summary>
                  <form action={upsertLegalSection} className="mt-4 space-y-3">
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="page" value="terms" />
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Heading</label>
                      <input name="heading" defaultValue={s.heading} required className="input" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Body</label>
                      <textarea name="body" defaultValue={s.body} rows={4} required className="input" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Sort order</label>
                      <input type="number" name="sort_order" defaultValue={s.sort_order} className="input w-24" />
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="submit" className="btn-primary py-2 px-4 text-sm">Save Section</button>
                    </div>
                  </form>
                  <form action={deleteLegalSection.bind(null, s.id)} className="mt-2">
                    <button type="submit" className="text-xs text-red-600 hover:underline flex items-center gap-1">
                      <Trash2 className="h-3 w-3" /> Delete section
                    </button>
                  </form>
                </details>
              ))}
            </div>
            <details className="rounded-xl border border-dashed border-gray-200 p-4 mb-8">
              <summary className="cursor-pointer text-sm font-medium text-brand-600 flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add Terms section
              </summary>
              <form action={upsertLegalSection} className="mt-4 space-y-3">
                <input type="hidden" name="page" value="terms" />
                <input name="heading" placeholder="Heading" required className="input" />
                <textarea name="body" placeholder="Body text" rows={4} required className="input" />
                <input type="number" name="sort_order" defaultValue={termsSections.length} className="input w-24" />
                <button type="submit" className="btn-primary py-2 px-4 text-sm">Add Section</button>
              </form>
            </details>

            <h3 className="font-semibold text-gray-800 mb-3">Privacy Policy</h3>
            <div className="space-y-3 mb-6">
              {privacySections.map((s) => (
                <details key={s.id} className="rounded-xl border border-gray-100 p-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-800">{s.heading}</summary>
                  <form action={upsertLegalSection} className="mt-4 space-y-3">
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="page" value="privacy" />
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Heading</label>
                      <input name="heading" defaultValue={s.heading} required className="input" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Body</label>
                      <textarea name="body" defaultValue={s.body} rows={4} required className="input" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Sort order</label>
                      <input type="number" name="sort_order" defaultValue={s.sort_order} className="input w-24" />
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="submit" className="btn-primary py-2 px-4 text-sm">Save Section</button>
                    </div>
                  </form>
                  <form action={deleteLegalSection.bind(null, s.id)} className="mt-2">
                    <button type="submit" className="text-xs text-red-600 hover:underline flex items-center gap-1">
                      <Trash2 className="h-3 w-3" /> Delete section
                    </button>
                  </form>
                </details>
              ))}
            </div>
            <details className="rounded-xl border border-dashed border-gray-200 p-4">
              <summary className="cursor-pointer text-sm font-medium text-brand-600 flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add Privacy section
              </summary>
              <form action={upsertLegalSection} className="mt-4 space-y-3">
                <input type="hidden" name="page" value="privacy" />
                <input name="heading" placeholder="Heading" required className="input" />
                <textarea name="body" placeholder="Body text" rows={4} required className="input" />
                <input type="number" name="sort_order" defaultValue={privacySections.length} className="input w-24" />
                <button type="submit" className="btn-primary py-2 px-4 text-sm">Add Section</button>
              </form>
            </details>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
