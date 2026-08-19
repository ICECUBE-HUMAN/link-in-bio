const SITE_URL = "https://grabbin.me";

export type JsonLdNode = Record<string, unknown>;

function withSiteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export function createWebSiteJsonLd(input: {
  name: string;
  description?: string;
  path: string;
}): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: input.name,
    url: withSiteUrl(input.path),
    ...(input.description ? { description: input.description } : {}),
  };
}

export function createWebPageJsonLd(input: {
  title: string;
  description?: string;
  path: string;
}): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.title,
    url: withSiteUrl(input.path),
    ...(input.description ? { description: input.description } : {}),
  };
}
