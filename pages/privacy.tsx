import Head from 'next/head';
import LandingLayout from '../components/Landing/LandingLayout';

const sections = [
  {
    title: 'Information We Collect',
    body: [
      'Account information such as email address, display name, sign-in provider, and profile image when available.',
      'Child and family profile information provided by an adult user, including child name or nickname, birth year and month, gender, and initial concerns.',
      'Chat messages, conversation titles, topic folders, attachments metadata, and AI-generated conversation context.',
      'Before sign-in, temporary guest chat and child-profile context may be kept in the current browser tab so the trial works across page refreshes. Sensitive guest content is removed from persistent local browser storage and is cleared after successful account migration.',
      'AI-extracted family memory items and short profile summaries that help Qimi personalize future support.',
      'Limited product analytics events, such as landing CTA clicks, onboarding step completion/dropoff, chat send milestones, memory extraction counts, growth-plan save actions, contact-form submission status, and chat error metadata.',
      'Consent records, including the exact consent text, timestamp, method/version, IP address, and user agent where available.',
    ],
  },
  {
    title: 'How We Use Information',
    body: [
      'To provide AI-powered family support, personalize responses, keep conversation history available, and maintain your family profile.',
      'To remember important family preferences, interests, goals, concerns, and support context that you share during conversations.',
      'To operate account settings, account deletion, security checks, compliance records, debugging, fraud prevention, and service reliability.',
      'To understand onboarding, activation, retention, feature reliability, and product usage through limited internal analytics.',
      'To improve Qimi using aggregated, de-identified, or internal operational learnings where appropriate. We do not sell child or family information, and we do not use child or family content to train public AI models unless we separately disclose that use and obtain any required consent.',
    ],
  },
  {
    title: 'Product Analytics',
    body: [
      'For the MVP, product analytics is stored in Qimi-controlled Supabase tables. We do not use third-party product analytics SDKs, ad pixels, heatmaps, session replay, or cross-site tracking for this analytics program.',
      'Analytics events are limited to product and reliability metadata. They must not include chat message text, child names, contact message contents, plan text, memory fact values, emails, raw IP addresses, or raw user agents.',
      'Raw analytics rows are intended to be retained for up to 180 days unless we shorten that period or need a different period for security, fraud prevention, legal compliance, or dispute handling.',
      'When an account is deleted, analytics rows may be kept only as de-identified operational history if they do not contain personal or sensitive content.',
    ],
  },
  {
    title: 'AI Processing',
    body: [
      'Chat messages and related context may be processed by third-party large language model and AI services, including text-generation and vision services, to generate responses and extract profile memories.',
      'We do not sell personal information or share it for cross-context behavioral advertising. We use third-party AI services only to operate, secure, troubleshoot, and improve Qimi features.',
      'When you delete your account, we delete account-owned content and child or family profile data from our own systems, but de-identified product analytics may remain. We cannot guarantee deletion of data already processed or retained by third-party AI service providers. We will handle third-party deletion or retention limits according to provider terms, available controls, and applicable law.',
    ],
  },
  {
    title: 'Children and Parent Rights',
    body: [
      'Qimi is designed for parents, legal guardians, and other adults supporting a family. Children should use Qimi only with parent or guardian involvement.',
      'An adult user must confirm they are authorized to provide child or family information before Qimi stores that information for an account.',
      'Parents may review and update family profile information in the app, and may delete the account and related data from Settings.',
      'Qimi is not designed as a child-directed service or as a tool for children to manage their own care independently.',
    ],
  },
  {
    title: 'Data Retention and Deletion',
    body: [
      'We retain account, profile, conversation, memory, and consent records while your account is active so Qimi can provide the service.',
      'You can request self-service deletion from Settings. Deleting your account removes account information, conversations, child and family profile data, memory items, growth plan items, and consent records from our database. De-identified product analytics may be retained for product measurement and service reliability.',
      'Some operational logs, backups, security records, legal-compliance records, or third-party provider records may persist for a limited period where reasonably necessary for security, fraud prevention, legal compliance, dispute handling, or provider operations.',
    ],
  },
  {
    title: 'Security',
    body: [
      'We use access controls, server-side API routes, and database row-level security as part of our data-protection approach.',
      'No system can be guaranteed completely secure. If we discover a security incident affecting health-related or family information, we will assess notification obligations and notify affected users, regulators, or other required parties where applicable law requires it.',
    ],
  },
  {
    title: 'Contact',
    body: [
      'Operator: Qimi AI. For privacy questions, parent requests, data requests, or user messages, contact us at gu778@hotmail.com.',
      'Additional business mailing address and telephone contact will be added before public launch if required for the final launch jurisdiction and COPPA operator disclosure.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LandingLayout>
      <Head>
        <title>Privacy Policy - Qimi AI</title>
        <meta name="description" content="Qimi AI privacy policy for family support, child profile, chat, memory, and AI processing data." />
      </Head>

      <div className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <main className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
          <p className="text-sm font-semibold text-primary-teal">Effective date: May 8, 2026</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Privacy Policy</h1>
          <p className="mt-4 text-slate-600">
            This policy explains how Qimi AI collects, uses, and protects information for our ADHD family support service.
            Qimi is designed for parents, legal guardians, and other adults supporting a family.
          </p>

          <div className="mt-10 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-600">
                  {section.body.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Qimi AI provides educational and family-support information only. It is not a substitute for professional medical advice, diagnosis, or treatment.
          </div>
        </main>
      </div>
    </LandingLayout>
  );
}
