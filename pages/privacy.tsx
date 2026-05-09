import Head from 'next/head';
import LandingLayout from '../components/Landing/LandingLayout';

const sections = [
  {
    title: 'Information We Collect',
    body: [
      'Account information such as email address, display name, sign-in provider, and profile image when available.',
      'Child and family profile information provided by an adult user, including child name or nickname, birth year and month, gender, and initial concerns.',
      'Chat messages, conversation titles, topic folders, attachments metadata, and AI-generated conversation context.',
      'AI-extracted family memory items and short profile summaries that help Qimi personalize future support.',
      'Consent records, including the exact consent text, timestamp, method/version, IP address, and user agent where available.',
    ],
  },
  {
    title: 'How We Use Information',
    body: [
      'To provide AI-powered family support, personalize responses, keep conversation history available, and maintain your family profile.',
      'To remember important family preferences, interests, goals, concerns, and support context that you share during conversations.',
      'To operate account settings, account deletion, security checks, compliance records, debugging, fraud prevention, and service reliability.',
      'To improve Qimi using aggregated, de-identified, or internal operational learnings where appropriate. We do not sell child or family information, and we do not use child or family content to train public AI models unless we separately disclose that use and obtain any required consent.',
    ],
  },
  {
    title: 'AI Processing',
    body: [
      'Chat messages and related context may be processed by third-party AI services, including text-generation and vision services, to generate responses and extract profile memories.',
      'We do not sell personal information or share it for cross-context behavioral advertising. We use third-party AI services only to operate, secure, troubleshoot, and improve Qimi features.',
      'When you delete your account, we delete data from our own systems, but we cannot guarantee deletion of data already processed or retained by third-party AI providers. We will handle third-party deletion or retention limits according to provider terms, available controls, and applicable law.',
    ],
  },
  {
    title: 'Children and Parent Rights',
    body: [
      'Qimi is intended for adult users, including parents and legal guardians, and is not for independent use by children.',
      'An adult user must confirm they are authorized to provide child or family information before Qimi stores that information for an account.',
      'Parents may review and update family profile information in the app, and may delete the account and related data from Settings.',
      'We do not knowingly allow children to create accounts independently.',
    ],
  },
  {
    title: 'Data Retention and Deletion',
    body: [
      'We retain account, profile, conversation, memory, and consent records while your account is active so Qimi can provide the service.',
      'You can request self-service deletion from Settings. Deleting your account removes account-owned data from our database through cascading deletion.',
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
      'Operator: Qimi AI. For privacy questions, parent requests, or data requests, contact us at qimi.ai2025@hotmail.com.',
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
            Qimi is designed for parents and legal guardians, not for independent use by children.
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
