import { Metadata } from 'next'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'SETT Terms of Service — the rules for using our platform.',
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

function HighlightBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50 px-5 py-4 text-[14px] leading-relaxed text-gray-700 space-y-2">
      {children}
    </div>
  )
}

const TOC = [
  { id: 'about', label: '1. About SETT' },
  { id: 'membership-tiers', label: '2. Membership Tiers & Programs' },
  { id: 'acceptance', label: '3. Acceptance of Terms' },
  { id: 'accounts', label: '4. Account Registration & Security' },
  { id: 'creators', label: '5. Creator Program & Monetization' },
  { id: 'content', label: '6. User Content' },
  { id: 'prohibited', label: '7. Prohibited Conduct' },
  { id: 'ip', label: '8. Intellectual Property' },
  { id: 'thirdparty', label: '9. Third-Party Services & Links' },
  { id: 'payments', label: '10. Purchases, Payments & Refunds' },
  { id: 'disclaimers', label: '11. Disclaimers' },
  { id: 'liability', label: '12. Limitation of Liability' },
  { id: 'indemnification', label: '13. Indemnification' },
  { id: 'termination', label: '14. Termination' },
  { id: 'governing', label: '15. Governing Law & Disputes' },
  { id: 'general', label: '16. General Provisions' },
  { id: 'contact', label: '17. Contact' },
]

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-white">
        {/* Hero */}
        <div className="bg-near-black text-white px-6 py-16 md:py-20">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-mono uppercase tracking-widest text-white/50 mb-3">Legal</p>
            <h1 className="text-4xl md:text-5xl font-black mb-4">Terms of Service</h1>
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
              Please read these Terms carefully before using SETT. By accessing or using our platform,
              you agree to be bound by these terms. If you do not agree, please do not use SETT.
            </div>

            <Section id="about" title="1. About SETT">
              <p>
                SETT, Inc. ("SETT," "we," "us," or "our") operates a social commerce fashion platform
                that enables creators, curators, and shoppers to discover, design, and share fashion
                content, shoppable collections, and creator-driven storefronts. SETT is accessible via
                our website and mobile applications (collectively, the "Platform").
              </p>
            </Section>

            {/* ── FOUNDING MEMBERS & EARLY USERS ── */}
            <Section id="membership-tiers" title="2. Membership Tiers & Launch Programs">
              <p>
                SETT offers differentiated membership tiers recognizing early supporters of the
                Platform. The terms of each tier are set out below and are legally binding upon
                acceptance. Tier status is tied to your account and is non-transferable.
              </p>

              <SubSection title="2.1 Founding Members (Positions 1–100)">
                <p>
                  The first one hundred (100) users to create a verified SETT account and complete
                  onboarding are designated <strong>Founding Members</strong>. Founding Member status
                  is permanent and cannot be revoked except in the case of account termination for
                  violation of these Terms.
                </p>
                <HighlightBox>
                  <p className="font-semibold text-near-black">Founding Member Benefits</p>
                  <BulletList
                    items={[
                      'Permanent "Founding Member" badge displayed on profile, canvas toolbar, and published sets;',
                      'Pro subscription at no cost for the lifetime of the account, so long as the account remains in good standing;',
                      'Access to a private Founding Members channel (Telegram or Discord) with direct access to the SETT founding team;',
                      'Permanent listing on the public /founders page by username;',
                      '+5% permanent revenue share boost — Founding Members earn 75% of affiliate commissions generated through their sets (standard rate: 70%);',
                    ]}
                  />
                </HighlightBox>
                <p>
                  The Founding Member program closes automatically and permanently when the 100th
                  eligible user completes onboarding. No exceptions will be made after closure. The
                  Platform will display a permanent "Founding Member program is closed" notice upon
                  closure.
                </p>
                <p>
                  SETT reserves the right to modify Pro plan features over time. Founding Members
                  will always receive access to the highest-tier plan available on the Platform at no
                  cost, provided their account remains in good standing.
                </p>
              </SubSection>

              <SubSection title="2.2 Early Users (Positions 101–600)">
                <p>
                  Users who create a verified SETT account and complete onboarding in positions 101
                  through 600 are designated <strong>Early Users</strong>.
                </p>
                <HighlightBox>
                  <p className="font-semibold text-near-black">Early User Benefits</p>
                  <BulletList
                    items={[
                      '"Early User" badge displayed on profile (not displayed on sets or canvas toolbar);',
                      'Pro subscription free for six (6) months from the date of account creation, then $4.99/month for the lifetime of the account, so long as the account remains in good standing;',
                      '+2% permanent revenue share boost — Early Users earn 72% of affiliate commissions generated through their sets (standard rate: 70%);',
                      'Exclusive entry to the Early User Challenge run during the first month of Platform launch — winner receives a $100 USD gift card;',
                    ]}
                  />
                </HighlightBox>
                <p>
                  Participation in the Early User Challenge requires sharing at least one published
                  SETT set to Pinterest or TikTok within the first fourteen (14) days of account
                  creation. Challenge winners are selected by SETT at its sole discretion. The $100
                  gift card prize has no cash value and is non-transferable.
                </p>
                <p>
                  The $4.99/month Early User rate is locked for the lifetime of the account and will
                  not increase regardless of future standard pricing changes, provided the subscription
                  remains active and the account remains in good standing. Cancelling and resubscribing
                  after a gap in payment will forfeit the locked rate.
                </p>
              </SubSection>

              <SubSection title="2.3 General Users (Position 601+)">
                <p>
                  All users joining after the first 600 positions are designated <strong>General
                  Users</strong> and are subject to standard Platform terms.
                </p>
                <HighlightBox>
                  <p className="font-semibold text-near-black">General User Tiers</p>
                  <BulletList
                    items={[
                      'Free tier: canvas item limit of 25 items per set; 70% revenue share on affiliate commissions; activity-based badges only (e.g., "Published 10 Sets," "First Commission Earned," "Remix Master");',
                      'Pro subscription ($9.99/month): unlimited items per canvas; full analytics dashboard; custom shop URL; priority image processing; 70% revenue share.',
                    ]}
                  />
                </HighlightBox>
                <p>
                  Activity badges are awarded automatically based on Platform milestones and carry no
                  monetary value. SETT may add, modify, or retire activity badge categories at any
                  time.
                </p>
              </SubSection>

              <SubSection title="2.4 General Provisions Applicable to All Tiers">
                <BulletList
                  items={[
                    'Tier status and associated benefits are tied to the individual account and are non-transferable and non-assignable;',
                    'Revenue share percentages apply to net affiliate commissions received by SETT after deductions by affiliate networks. SETT is not responsible for commission adjustments, reversals, or clawbacks made by affiliate networks;',
                    'Lifetime Pro access (Founding Members) and locked pricing (Early Users) apply only while the account remains active and in good standing. Accounts terminated for Terms violations forfeit all tier benefits permanently;',
                    'SETT reserves the right to modify, suspend, or discontinue the Pro plan feature set with reasonable notice. In such an event, Founding Members will receive equivalent access to the best available paid tier at no cost.',
                  ]}
                />
              </SubSection>
            </Section>

            <Section id="acceptance" title="3. Acceptance of Terms">
              <p>By creating an account, accessing, or using the Platform, you represent that:</p>
              <BulletList
                items={[
                  'You are at least 13 years of age (or 16 in the European Economic Area);',
                  'If you are under 18, you have obtained parental or guardian consent;',
                  'You have the legal capacity to enter into a binding agreement;',
                  'You will comply with these Terms and all applicable laws.',
                ]}
              />
            </Section>

            <Section id="accounts" title="4. Account Registration & Security">
              <SubSection title="4.1 Account Creation">
                <p>
                  To access certain features of SETT, you must register for an account. You agree to
                  provide accurate, current, and complete information and to keep your account
                  information updated.
                </p>
              </SubSection>
              <SubSection title="4.2 Account Security">
                <p>
                  You are responsible for maintaining the confidentiality of your login credentials.
                  You agree to notify us immediately at{' '}
                  <a href={`mailto:${EMAIL}`} className="underline underline-offset-2">{EMAIL}</a>{' '}
                  if you suspect unauthorized access. We are not liable for any loss or damage arising
                  from your failure to protect your credentials.
                </p>
              </SubSection>
              <SubSection title="4.3 One Account Per User">
                <p>
                  Each user may maintain only one personal account. Founding Member and Early User
                  tier benefits are tied to a single account and cannot be duplicated, transferred, or
                  claimed on a second account under any circumstances.
                </p>
              </SubSection>
            </Section>

            <Section id="creators" title="5. Creator Program & Monetization">
              <SubSection title="5.1 Eligibility">
                <p>
                  Creators wishing to monetize their SETT presence must apply to the SETT Creator
                  Program and meet eligibility requirements as updated from time to time.
                </p>
              </SubSection>
              <SubSection title="5.2 Revenue Share">
                <p>
                  SETT and creators share revenue generated through the Platform in accordance with
                  the Creator Agreement and the tier rates defined in Section 2. SETT reserves the
                  right to modify standard revenue share terms with 30 days' written notice. Enhanced
                  rates granted to Founding Members and Early Users are permanent and are not subject
                  to downward revision.
                </p>
              </SubSection>
              <SubSection title="5.3 Payouts">
                <p>
                  Creator earnings are subject to a minimum payout threshold. Payouts are processed
                  via Stripe or other payment providers designated by SETT. You are solely responsible
                  for all taxes on your earnings.
                </p>
              </SubSection>
              <SubSection title="5.4 Brand Partnerships">
                <p>
                  Any sponsored content or paid partnership must be clearly disclosed in accordance
                  with applicable advertising laws, including FTC guidelines in the United States and
                  equivalent regulations elsewhere. Undisclosed paid partnerships may result in account
                  suspension.
                </p>
              </SubSection>
            </Section>

            <Section id="content" title="6. User Content">
              <SubSection title="6.1 Your Content">
                <p>
                  You retain ownership of the content you post, upload, or share on SETT ("User
                  Content"). By submitting User Content, you grant SETT a worldwide, non-exclusive,
                  royalty-free, sublicensable, and transferable license to use, reproduce, distribute,
                  prepare derivative works of, display, and perform your User Content in connection
                  with operating and improving the Platform.
                </p>
              </SubSection>
              <SubSection title="6.2 Content Standards">
                <p>You agree not to post User Content that:</p>
                <BulletList
                  items={[
                    "Infringes any third party's intellectual property, privacy, or publicity rights;",
                    'Is false, misleading, defamatory, or fraudulent;',
                    'Is sexually explicit, violent, hateful, or harassing;',
                    'Promotes or facilitates illegal activity;',
                    'Contains malware, spam, or unauthorized advertising;',
                    'Violates any applicable law or regulation.',
                  ]}
                />
              </SubSection>
              <SubSection title="6.3 Content Removal">
                <p>
                  SETT reserves the right (but has no obligation) to remove, restrict, or refuse to
                  display any User Content at our sole discretion, without prior notice, for any
                  reason including violation of these Terms.
                </p>
              </SubSection>
              <SubSection title="6.4 DMCA & Copyright">
                <p>
                  SETT respects intellectual property rights. If you believe your copyright has been
                  infringed, please send a DMCA takedown notice to{' '}
                  <a href={`mailto:${EMAIL}`} className="underline underline-offset-2">{EMAIL}</a>{' '}
                  with the subject line "DMCA Notice." We will respond in accordance with applicable
                  law.
                </p>
              </SubSection>
            </Section>

            <Section id="prohibited" title="7. Prohibited Conduct">
              <p>You agree not to:</p>
              <BulletList
                items={[
                  'Use the Platform for any unlawful purpose or in violation of these Terms;',
                  'Impersonate any person or entity or misrepresent your affiliation;',
                  'Attempt to gain unauthorized access to SETT systems or other user accounts;',
                  'Scrape, crawl, or harvest data from the Platform without written permission;',
                  'Use automated bots, scripts, or tools to interact with the Platform;',
                  'Circumvent, disable, or interfere with security or access controls;',
                  "Engage in any conduct that restricts or inhibits another user's experience;",
                  'Upload or transmit viruses or other malicious code;',
                  'Artificially inflate engagement metrics, followers, or views;',
                  'Attempt to claim Founding Member or Early User status through fraudulent means, including creating multiple accounts;',
                  'Sell, trade, or transfer your SETT account or any associated tier benefits without prior written consent.',
                ]}
              />
            </Section>

            <Section id="ip" title="8. Intellectual Property">
              <SubSection title="8.1 SETT Platform">
                <p>
                  SETT and its licensors own all rights, title, and interest in and to the Platform,
                  including all software, design, trademarks, logos, and content created by SETT.
                  Nothing in these Terms grants you any right to use SETT's trademarks, trade names,
                  or logos without our prior written consent.
                </p>
              </SubSection>
              <SubSection title="8.2 Feedback">
                <p>
                  If you submit ideas, suggestions, or feedback about SETT, you grant us a perpetual,
                  irrevocable, worldwide, royalty-free license to use, implement, and incorporate that
                  feedback without any obligation to you.
                </p>
              </SubSection>
            </Section>

            <Section id="thirdparty" title="9. Third-Party Services & Links">
              <p>
                The Platform may contain links to third-party websites, services, or products
                (including affiliate merchant sites). SETT is not responsible for the content, privacy
                practices, or terms of any third-party service. Your use of third-party services is at
                your own risk and subject to their respective terms.
              </p>
            </Section>

            <Section id="payments" title="10. Purchases, Payments & Refunds">
              <p>
                Certain features or products on SETT may require payment. All fees are in US Dollars
                unless stated otherwise. Payments are processed by third-party payment processors.
                SETT does not store your full payment card information.
              </p>
              <p>
                All sales are final unless required by applicable consumer protection law. If you
                believe you have been charged in error, contact{' '}
                <a href={`mailto:${EMAIL}`} className="underline underline-offset-2">{EMAIL}</a>{' '}
                within 30 days of the charge.
              </p>
            </Section>

            <Section id="disclaimers" title="11. Disclaimers">
              <CalloutBox>
                The Platform is provided "as is" and "as available" without warranties of any kind,
                express or implied. SETT disclaims all warranties including merchantability, fitness
                for a particular purpose, and non-infringement. We do not warrant that the Platform
                will be uninterrupted, error-free, or free of harmful components.
              </CalloutBox>
            </Section>

            <Section id="liability" title="12. Limitation of Liability">
              <CalloutBox>
                To the maximum extent permitted by law, SETT and its affiliates, officers, employees,
                and licensors shall not be liable for any indirect, incidental, special, consequential,
                or punitive damages, or any loss of profits or revenues, whether incurred directly or
                indirectly. In no event shall SETT's total liability to you exceed the greater of (a)
                $100 USD or (b) the amounts you paid to SETT in the twelve months preceding the claim.
              </CalloutBox>
            </Section>

            <Section id="indemnification" title="13. Indemnification">
              <p>
                You agree to indemnify, defend, and hold harmless SETT and its officers, directors,
                employees, and agents from and against any claims, liabilities, damages, losses, costs,
                or expenses (including reasonable attorneys' fees) arising out of or relating to: (a)
                your use of the Platform; (b) your User Content; (c) your violation of these Terms; or
                (d) your violation of any third party's rights.
              </p>
            </Section>

            <Section id="termination" title="14. Termination">
              <p>
                SETT may suspend or terminate your account and access to the Platform at any time, for
                any reason, including violation of these Terms. Upon termination, your right to use the
                Platform ceases immediately, and all tier benefits — including Founding Member lifetime
                Pro access and Early User locked pricing — are permanently forfeited. Sections 6.1, 8,
                11, 12, 13, and 16 survive termination.
              </p>
              <p>
                You may delete your account at any time through your account settings or by contacting{' '}
                <a href={`mailto:${EMAIL}`} className="underline underline-offset-2">{EMAIL}</a>.
                Voluntary account deletion also permanently forfeits all tier benefits.
              </p>
            </Section>

            <Section id="governing" title="15. Governing Law & Dispute Resolution">
              <SubSection title="15.1 Governing Law">
                <p>
                  These Terms are governed by the laws of the State of Delaware, without regard to
                  conflict of law principles.
                </p>
              </SubSection>
              <SubSection title="15.2 Informal Resolution">
                <p>
                  Before filing a formal claim, you agree to attempt to resolve any dispute by
                  contacting us at{' '}
                  <a href={`mailto:${EMAIL}`} className="underline underline-offset-2">{EMAIL}</a>.
                  We will attempt to resolve the dispute informally within 30 days.
                </p>
              </SubSection>
              <SubSection title="15.3 Arbitration">
                <p>
                  If informal resolution fails, disputes shall be resolved by binding arbitration
                  under the American Arbitration Association's Consumer Arbitration Rules, on an
                  individual basis. You waive your right to a jury trial and to participate in class
                  actions.
                </p>
              </SubSection>
              <SubSection title="15.4 Exception">
                <p>
                  Either party may seek injunctive or other equitable relief in a court of competent
                  jurisdiction to prevent irreparable harm.
                </p>
              </SubSection>
            </Section>

            <Section id="general" title="16. General Provisions">
              <p>
                <strong>Entire Agreement:</strong> These Terms, together with the Privacy Policy and
                any Creator Agreement, constitute the entire agreement between you and SETT regarding
                the Platform.
              </p>
              <p>
                <strong>Severability:</strong> If any provision is found unenforceable, the remaining
                provisions remain in full force.
              </p>
              <p>
                <strong>Waiver:</strong> Failure to enforce any provision does not constitute a waiver
                of that right.
              </p>
              <p>
                <strong>Assignment:</strong> SETT may assign these Terms without restriction. You may
                not assign your rights without SETT's prior written consent.
              </p>
              <p>
                <strong>Updates:</strong> We may update these Terms at any time. We will notify you of
                material changes via email or in-app notification at least 14 days before the change
                takes effect. Continued use after notice constitutes acceptance. Updates will never
                retroactively reduce Founding Member or Early User tier benefits as defined in Section
                2.
              </p>
            </Section>

            <Section id="contact" title="17. Contact">
              <p>Questions about these Terms? Reach us at:</p>
              <div className="mt-3 font-mono text-sm bg-gray-50 rounded-lg px-5 py-4 space-y-1">
                <p className="font-semibold">SETT, Inc.</p>
                <p>
                  Email:{' '}
                  <a href={`mailto:${EMAIL}`} className="underline underline-offset-2">{EMAIL}</a>
                </p>
                <p>Website: sett.app</p>
              </div>
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