import type { Metadata } from "next";

export const DEFAULT_SEO_DESCRIPTION =
  "Create a beautiful link in bio page with your links, media, and favorite places.";
export const HOME_TITLE =
  "A Link in Bio, the most beautiful and clean you've ever seen";
export const DEFAULT_SOCIAL_IMAGE = "/logo512.png";

type PageMetadataInput = {
  title: string;
  description: string;
  canonicalPath: string;
  image?: string;
  keywords?: string[];
};

export function createMetadata(input: PageMetadataInput): Metadata {
  const image = input.image ? [{ url: input.image }] : undefined;

  return {
    title: `${input.title} | Grabbin`,
    description: input.description,
    keywords: input.keywords,
    alternates: { canonical: input.canonicalPath },
    openGraph: {
      title: `${input.title} | Grabbin`,
      description: input.description,
      type: "website",
      url: input.canonicalPath,
      images: image,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: `${input.title} | Grabbin`,
      description: input.description,
      images: input.image ? [input.image] : undefined,
    },
  };
}

export function createHomeMetadata() {
  return createMetadata({
    title: HOME_TITLE,
    description: DEFAULT_SEO_DESCRIPTION,
    canonicalPath: "/",
    image: DEFAULT_SOCIAL_IMAGE,
    keywords: [
      "link in bio",
      "personal page",
      "creator page",
      "social links",
      "online profile",
    ],
  });
}
