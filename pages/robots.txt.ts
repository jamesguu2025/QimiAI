import type { GetServerSideProps } from 'next';
import { SITE_URL } from '@/lib/site-config';

function buildRobotsTxt(): string {
  return `User-agent: *
Allow: /
Allow: /api/public/content/adhd
Disallow: /api/

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: GPTBot
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Google-Extended
Disallow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  res.write(buildRobotsTxt());
  res.end();

  return { props: {} };
};

export default function RobotsTxt() {
  return null;
}
