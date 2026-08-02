const DEFAULT_SITE_URL = 'https://www.qimiai.to';

export const SITE_NAME = 'Qimi AI';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');

export const INDEXABLE_PUBLIC_ROUTES = new Set([
  '/',
  '/about',
  '/blog',
  '/blog/[slug]',
  '/privacy',
  '/terms',
]);

export const SITEMAP_STATIC_ROUTES = Array.from(INDEXABLE_PUBLIC_ROUTES).filter(
  (pathname) => !pathname.includes('['),
);

export const PUBLIC_ROUTE_METADATA: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Qimi AI - Empowering Every ADHD Family',
    description: 'Your 24/7 AI copilot for IEPs, routines, and emotional regulation.',
  },
  '/about': {
    title: 'Our Story | Qimi AI',
    description: 'Learn why Qimi AI was created to help parents turn complex ADHD questions and scattered advice into clear, practical next steps.',
  },
  '/blog': {
    title: 'ADHD Blog | Qimi AI',
    description: 'Evidence-informed ADHD articles and practical strategies for families.',
  },
  '/privacy': {
    title: 'Privacy Policy | Qimi AI',
    description: 'Read how Qimi AI handles family support, child profile, chat, memory, and AI processing data.',
  },
  '/terms': {
    title: 'Terms of Service | Qimi AI',
    description: 'Read the terms that govern use of Qimi AI and its ADHD family support tools.',
  },
};

export function absoluteUrl(pathname: string): string {
  return `${SITE_URL}${pathname === '/' ? '' : pathname}`;
}
