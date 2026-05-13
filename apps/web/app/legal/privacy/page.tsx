import { Metadata } from 'next'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'SETT Privacy Policy — how we collect, use, and protect your data.',
  robots: { index: true, follow: true },
}

const EFFECTIVE_DATE = 'April 27, 2026'
const EMAIL = 'legal@sett.app'

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-12 scroll-mt-24">
      <h2 className="text-xl font-bold text-near-black mb-4 pb-2 border-b border-gray-100">{title}</h2>
      <div className="space-y-4 text-[15px] leading-relaxed text-gray-700">{children}</div>
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="text-[15px] font-semibold text-near-black mb-2">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-outside ml-5 space-y-1.5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

function CalloutBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-4 border-near-black bg-gray-50 px-5 py-4 text-[13px] leading-relaxed text-gray-600 font-mono uppercase tracking-wide">
      {children}
    </div>
  )
}

const TOC = [
  { id: 'who', label: '1. Who We Are' },
  { id: 'collection', label: '2. Information We Collect' },
  { id: 'use', label: '3. How We Use Your Information' },
  { id: 'legal-bases', label: '4. Legal Bases (EEA/UK)' },
  { id: 'sharing', label: '5. Sharing Your Information' },
  { id: 'cookies', label: '6. Cookies & Tracking' },
  { id: 'retention', label: '7. Data Retention' },
  { id: 'transfers', label: '8. International Transfers' },
  { id: 'rights', label: '9. Your Rights & Choices' },
  { id: 'ccpa', label: '10. California Rights (CCPA/CPRA)' },
  { id: 'children', label: "11. Children's Privacy" },
  { id: 'security', label: '12. Security' },
  { id: 'links', label: '13. Third-Party Links' },
  { id: 'changes', label: '14. Changes to This Policy' },
  { id: 'contact', label: '15. Contact & Complaints' },
]

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-white">
        {/* Hero */}
        <div className="bg-near-black text-white px-6 py-16 md:py-20">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-mono uppercase tracking-widest text-white/50 mb-3">Legal</p>
            <h1 className="text-4xl md:text-5xl font-black mb-4">Privacy Policy</h1>
            <p className="text-white/60 text-sm">Effective Date: {EFFECTIVE_DATE}</p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-14 flex gap-16">
          {/* Sticky TOC */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-24">
              <p className="text-[11px] font-mono uppercase tracking-widest text-gray-400 mb-4">Contents</p>
              <nav className="space-y-1">
                {TOC.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block text-[13px] text-gray-500 hover:text-near-black transition-colors py-0.5"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Body */}
          <div className="flex-1 max-w-2xl">
            <div className="border-l-4 border-near-black bg-gray-50 px-5 py-4 mb-12 text-[14px] text-gray-700 leading-relaxed">
              Your privacy matters to us. This Privacy Policy explains what data we collect, how we
              use it, and your rights. SETT is designed with creator privacy and data minimization in
              mind.
            </div>

            <Section id="who" title="1. Who We Are">
              <p>
                SETT, Inc. is the data controller for personal data processed through the SETT
                Platform. You can reach our privacy team at{' '}
                <a href={`mailto:${EMAIL}`} className="underline underline-offset-2">{EMAIL}</a>.
              </p>
            </Section>

            <Section id="collection" title="2. Information We Collect">
              <SubSection title="2.1 Information You Provide">
                <BulletList
                  items={[
                    'Account information: name, username, email address, password, profile photo, bio;',
                    'Creator/brand information: payment details, tax identification (for payouts), brand name;',
                    'Content you post: images, collections, comments, messages, style boards;',
                    'Communications: emails or support requests you send to us.',
                  ]}
                />
              </SubSection>
              <SubSection title="2.2 Information Collected Automatically">
                <BulletList
                  items={[
                    'Device and usage data: IP address, browser type, OS, device identifiers;',
                    'Log data: pages visited, features used, clicks, session duration, referring URLs;',
                    'Cookies and similar tracking technologies (see Section 6).',
                  ]}
                />
              </SubSection>
              <SubSection title="2.3 Information from Third Parties">
                <BulletList
                  items={[
                    'Social login providers (Google, Apple): basic profile info;',
                    'Payment processors (Stripe): transaction status and fraud signals;',
                    'Analytics partners: aggregated behavioral insights.',
                  ]}
                />
              </SubSection>
            </Section>

            <Section id="use" title="3. How We Use Your Information">
              <p>We use your data to:</p>
              <BulletList
                items={[
                  'Provide, maintain, and improve the Platform;',
                  'Personalize your feed, recommendations, and shopping experience;',
                  'Process transactions and manage creator payouts;',
                  'Send transactional communications (receipts, account alerts, password resets);',
                  'Send marketing communications (with your consent, where required by law);',
                  'Detect and prevent fraud, abuse, and security incidents;',
                  'Comply with legal obligations;',
                  'Analyze usage to improve our products and develop new features.',
                ]}
              />
            </Section>

            <Section id="legal-bases" title="4. Legal Bases for Processing (EEA/UK Users)">
              <p>
                If you are located in the European Economic Area or United Kingdom, we process your
                personal data on the following legal bases:
              </p>
              <BulletList
                items={[
                  'Contract: to perform our agreement with you (e.g., providing the Platform);',
                  'Legitimate interests: to improve our services, prevent fraud, and communicate with you;',
                  'Consent: for marketing communications and non-essential cookies;',
                  'Legal obligation: to comply with applicable laws.',
                ]}
              />
            </Section>

            <Section id="sharing" title="5. Sharing Your Information">
              <p>We do not sell your personal data. We may share your data with:</p>
              <SubSection title="5.1 Service Providers">
                <p>
                  Trusted vendors who help us operate SETT — hosting on Cloudflare, database services
                  via Supabase, payment processing via Stripe, and analytics. These providers are
                  contractually bound to process data only as instructed.
                </p>
              </SubSection>
              <SubSection title="5.2 Other Users">
                <p>
                  Your public profile, collections, and content are visible to other SETT users and
                  the general public unless you adjust your privacy settings.
                </p>
              </SubSection>
              <SubSection title="5.3 Brand & Creator Partnerships">
                <p>
                  If you participate in brand partnership campaigns, limited data (such as engagement
                  metrics) may be shared with the relevant brand under confidentiality obligations.
                </p>
              </SubSection>
              <SubSection title="5.4 Legal Requirements">
                <p>
                  We may disclose your data when required by law, subpoena, or governmental authority,
                  or to protect the rights, property, or safety of SETT, our users, or the public.
                </p>
              </SubSection>
              <SubSection title="5.5 Business Transfers">
                <p>
                  If SETT is acquired, merged, or its assets are transferred, your data may be
                  included as part of that transaction. We will notify you before your data is subject
                  to a different privacy policy.
                </p>
              </SubSection>
            </Section>

            <Section id="cookies" title="6. Cookies & Tracking Technologies">
              <p>We use cookies and similar technologies for:</p>
              <BulletList
                items={[
                  'Essential functionality: authentication, security, session management;',
                  'Performance: analytics to understand Platform usage;',
                  'Personalization: remembering your preferences;',
                  'Marketing: retargeting (only with your consent where required).',
                ]}
              />
              <p>
                You can manage cookie preferences through your browser settings or our cookie consent
                tool. Note that disabling essential cookies may affect Platform functionality.
              </p>
            </Section>

            <Section id="retention" title="7. Data Retention">
              <p>
                We retain your personal data for as long as your account is active or as needed to
                provide services. We may retain certain data longer to comply with legal obligations,
                resolve disputes, or enforce agreements. Anonymized or aggregated data may be retained
                indefinitely.
              </p>
              <p>
                When you delete your account, we will delete or anonymize your personal data within 90
                days, except where retention is required by law.
              </p>
            </Section>

            <Section id="transfers" title="8. International Data Transfers">
              <p>
                SETT is operated from the United States. If you access the Platform from outside the
                US, your data may be transferred to and processed in the US or other countries. For
                EEA/UK users, we use Standard Contractual Clauses or other approved transfer
                mechanisms to ensure adequate data protection.
              </p>
            </Section>

            <Section id="rights" title="9. Your Rights & Choices">
              <p>Depending on your location, you may have the following rights:</p>
              <BulletList
                items={[
                  'Access: request a copy of the personal data we hold about you;',
                  'Correction: request correction of inaccurate or incomplete data;',
                  "Deletion: request deletion of your personal data ('right to be forgotten');",
                  'Portability: receive your data in a structured, machine-readable format;',
                  'Objection: object to processing based on legitimate interests;',
                  'Restriction: request restriction of processing in certain circumstances;',
                  'Withdraw consent: withdraw previously given consent at any time.',
                ]}
              />
              <p>
                To exercise these rights, contact us at{' '}
                <a href={`mailto:${EMAIL}`} className="underline underline-offset-2">{EMAIL}</a>.
                We will respond within 30 days (or 45 days for complex requests). We may need to
                verify your identity before processing your request.
              </p>
            </Section>

            <Section id="ccpa" title="10. California Privacy Rights (CCPA/CPRA)">
              <p>California residents have specific rights under the CCPA and CPRA:</p>
              <BulletList
                items={[
                  'Right to know what personal information we collect, use, and disclose;',
                  'Right to delete personal information (with certain exceptions);',
                  'Right to correct inaccurate personal information;',
                  'Right to opt out of the sale or sharing of personal information;',
                  'Right to limit use of sensitive personal information;',
                  'Right to non-discrimination for exercising your rights.',
                ]}
              />
              <p>
                We do not sell personal information. To submit a CCPA request, contact{' '}
                <a href={`mailto:${EMAIL}`} className="underline underline-offset-2">{EMAIL}</a>{' '}
                or use the "Privacy Request" option in your account settings.
              </p>
            </Section>

            <Section id="children" title="11. Children's Privacy">
              <p>
                The Platform is not directed to children under 13 (or under 16 in the EEA). We do not
                knowingly collect personal data from children under these ages. If we learn we have
                collected such data, we will delete it promptly. If you believe a child has provided
                us data, contact{' '}
                <a href={`mailto:${EMAIL}`} className="underline underline-offset-2">{EMAIL}</a>.
              </p>
            </Section>

            <Section id="security" title="12. Security">
              <p>
                We implement industry-standard technical and organizational measures to protect your
                data, including encryption in transit (TLS) and at rest, access controls, and regular
                security reviews. However, no internet transmission is 100% secure. You are
                responsible for keeping your account credentials confidential.
              </p>
            </Section>

            <Section id="links" title="13. Third-Party Links">
              <p>
                The Platform may contain links to third-party websites or products (including
                affiliate merchant sites). This Privacy Policy does not apply to those third parties.
                We encourage you to review their privacy policies before sharing any personal
                information.
              </p>
            </Section>

            <Section id="changes" title="14. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material
                changes by email or prominent in-app notice at least 14 days before the change takes
                effect. Your continued use of the Platform after the effective date constitutes
                acceptance of the updated policy.
              </p>
            </Section>

            <Section id="contact" title="15. Contact & Complaints">
              <p>Privacy questions or concerns? Contact us at:</p>
              <div className="mt-3 font-mono text-sm bg-gray-50 rounded-lg px-5 py-4 space-y-1">
                <p className="font-semibold">SETT, Inc.</p>
                <p>
                  Privacy Team:{' '}
                  <a href={`mailto:${EMAIL}`} className="underline underline-offset-2">{EMAIL}</a>
                </p>
                <p>Website: sett.app</p>
              </div>
              <p className="mt-4">
                If you are located in the EU/UK and are not satisfied with our response, you have the
                right to lodge a complaint with your local data protection authority.
              </p>
            </Section>

            <div className="mt-16 pt-8 border-t border-gray-100 text-[12px] text-gray-400 font-mono">
              © {new Date().getFullYear()} SETT, Inc. All rights reserved.
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}