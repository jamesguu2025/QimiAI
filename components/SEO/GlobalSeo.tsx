import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  INDEXABLE_PUBLIC_ROUTES,
  PUBLIC_ROUTE_METADATA,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
} from '@/lib/site-config';

export default function GlobalSeo() {
  const router = useRouter();
  const pathname = router.pathname;
  const isIndexable = INDEXABLE_PUBLIC_ROUTES.has(pathname);
  const metadata = PUBLIC_ROUTE_METADATA[pathname];
  const canonicalUrl = isIndexable && pathname !== '/blog/[slug]' ? absoluteUrl(pathname) : undefined;

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.svg`,
    founder: {
      '@type': 'Person',
      name: 'James Guu',
      url: 'https://jamesguu.com',
    },
  };

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: {
      '@id': `${SITE_URL}/#organization`,
    },
  };

  return (
    <Head>
      {isIndexable ? (
        <>
          <meta name="robots" content="index, follow, max-image-preview:large" />
          {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content={SITE_NAME} />
          {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
          {metadata && <meta property="og:title" content={metadata.title} />}
          {metadata && <meta property="og:description" content={metadata.description} />}
          <meta name="twitter:card" content="summary" />
          {metadata && <meta name="twitter:title" content={metadata.title} />}
          {metadata && <meta name="twitter:description" content={metadata.description} />}
        </>
      ) : (
        <meta name="robots" content="noindex, nofollow, noarchive" />
      )}

      {pathname === '/' && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
          />
        </>
      )}
    </Head>
  );
}
