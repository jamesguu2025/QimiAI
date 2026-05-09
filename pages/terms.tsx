import Head from 'next/head';
import LandingLayout from '../components/Landing/LandingLayout';

const sections = [
  {
    title: 'Service Description',
    body: 'Qimi AI provides AI-powered family support for parents and legal guardians navigating ADHD-related routines, learning, behavior, emotions, sleep, nutrition, exercise, and school support.',
  },
  {
    title: 'AI Limitations and Medical Disclaimer',
    body: 'Qimi AI provides general educational and family-support information only. It does not provide medical advice, diagnosis, treatment, crisis intervention, or emergency services. AI responses may be incomplete, inaccurate, or not appropriate for your family. Always consult a qualified healthcare provider for medical decisions.',
  },
  {
    title: 'Parent or Guardian Responsibility',
    body: 'You must be 18 or older to use Qimi. Qimi is designed for parents, legal guardians, and other adults supporting a family. You are responsible for sharing only child or family information that you are authorized to provide and for reviewing AI-generated suggestions before acting on them.',
  },
  {
    title: 'Accounts and Consent',
    body: 'Some features require an account. Before storing child or family information for an account, Qimi requires confirmation from the adult account holder and stores a consent record for compliance, audit, safety, and dispute-handling purposes.',
  },
  {
    title: 'Acceptable Use',
    body: 'Do not use Qimi to seek emergency help, harass others, upload unlawful content, infringe rights, reverse engineer the service, or submit information you do not have authority to provide.',
  },
  {
    title: 'Your Content',
    body: 'You keep ownership of information you provide. You grant Qimi permission to process that information to operate, personalize, secure, troubleshoot, enforce these terms, and improve Qimi. We do not sell child or family information, and we do not use child or family content to train public AI models unless separately disclosed and any required consent is obtained.',
  },
  {
    title: 'Account Deletion',
    body: 'You may delete your account from Settings. Account deletion removes account-owned data from our database, subject to operational logs, backups, legal-compliance records, dispute records, security records, and third-party processing limits described in the Privacy Policy.',
  },
  {
    title: 'Intellectual Property',
    body: 'Qimi AI, its design, software, branding, and service content are protected by intellectual property laws. You may not copy or resell the service without permission.',
  },
  {
    title: 'Limitation of Liability',
    body: 'To the fullest extent permitted by law, Qimi is provided as-is and as-available. We do not guarantee uninterrupted service, error-free output, or specific outcomes. We are not liable for indirect, incidental, consequential, special, punitive, or similar damages arising from use of the service.',
  },
  {
    title: 'Changes to These Terms',
    body: 'We may update these terms as the service evolves. Material changes will be reflected by updating the effective date and, where appropriate, notifying users in the product. Continued use after changes become effective means you accept the updated terms.',
  },
  {
    title: 'Service Changes and Availability',
    body: 'We may modify, suspend, limit, or discontinue parts of Qimi where reasonably necessary for maintenance, security, legal compliance, product changes, or business reasons.',
  },
  {
    title: 'Governing Law',
    body: 'These terms are governed by the laws applicable to the Qimi operator, without regard to conflict-of-law rules, except where the mandatory consumer-protection laws of your place of residence require otherwise. Any dispute will be handled in a court or forum with proper jurisdiction, unless applicable law gives you a non-waivable right to use another forum.',
  },
  {
    title: 'Contact',
    body: 'For questions about these terms, contact us at qimi.ai2025@hotmail.com.',
  },
];

export default function TermsPage() {
  return (
    <LandingLayout>
      <Head>
        <title>Terms of Service - Qimi AI</title>
        <meta name="description" content="Qimi AI terms of service for AI-powered ADHD family support." />
      </Head>

      <div className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <main className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
          <p className="text-sm font-semibold text-primary-teal">Effective date: May 8, 2026</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Terms of Service</h1>
          <p className="mt-4 text-slate-600">
            These terms govern your use of Qimi AI. By using Qimi, you agree to these terms and our Privacy Policy.
          </p>

          <div className="mt-10 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
                <p className="mt-3 leading-relaxed text-slate-600">{section.body}</p>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Qimi AI is not a substitute for professional medical advice, diagnosis, or treatment. In an emergency, contact local emergency services.
          </div>
        </main>
      </div>
    </LandingLayout>
  );
}
