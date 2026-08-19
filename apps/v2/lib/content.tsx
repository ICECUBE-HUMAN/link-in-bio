import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { MDXContent } from "mdx/types";
import AddMultipleLinks from "../../frontend/src/mdx/post/how-to-add-multiple-links-instagram-bio.mdx";
import OptimizeLink from "../../frontend/src/mdx/post/how-to-optimize-link-in-bio-for-more-clicks.mdx";
import InstagramBio from "../../frontend/src/mdx/post/instagram-bio-examples-for-business.mdx";
import CreatorIdeas from "../../frontend/src/mdx/post/link-in-bio-ideas-for-creators.mdx";
import SeoGuide from "../../frontend/src/mdx/post/link-in-bio-seo-guide.mdx";
import LinkInBioVsWebsite from "../../frontend/src/mdx/post/link-in-bio-vs-personal-website.mdx";
import WhatIsLinkInBio from "../../frontend/src/mdx/post/what-is-a-link-in-bio.mdx";
import Privacy from "../../frontend/src/mdx/privacy/privacy.mdx";
import Terms from "../../frontend/src/mdx/terms/terms.mdx";

const SOURCE_ROOTS = [
  path.resolve(process.cwd(), "../frontend/src/mdx"),
  path.resolve(process.cwd(), "apps/frontend/src/mdx"),
];

function getSourceRoot() {
  const root = SOURCE_ROOTS.find((candidate) => fs.existsSync(candidate));
  if (!root)
    throw new Error("Could not find the existing frontend MDX source.");
  return root;
}

function getSource(pathname: string) {
  return fs.readFileSync(path.join(getSourceRoot(), pathname), "utf8");
}

function requiredString(data: Record<string, unknown>, key: string) {
  const value = data[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing MDX frontmatter field: ${key}`);
  }
  return value.trim();
}

function optionalString(data: Record<string, unknown>, key: string) {
  const value = data[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function requiredDate(data: Record<string, unknown>, key: string) {
  const value = data[key];
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid MDX frontmatter date: ${key}`);
  }
  return date;
}

function requiredAuthors(data: Record<string, unknown>) {
  const value = data.authors;
  if (
    !Array.isArray(value) ||
    value.some((author) => typeof author !== "string")
  ) {
    throw new Error("Missing MDX frontmatter field: authors");
  }
  return value;
}

type SourceDocument = {
  body: string;
  data: Record<string, unknown>;
};

function readDocument(pathname: string): SourceDocument {
  const parsed = matter(getSource(pathname));
  return { body: parsed.content, data: parsed.data };
}

export type BlogPost = {
  authors: string[];
  category?: string;
  Component: MDXContent;
  description: string;
  image?: string;
  published: Date;
  slug: string;
  title: string;
};

const postComponents = {
  "how-to-add-multiple-links-instagram-bio": AddMultipleLinks,
  "how-to-optimize-link-in-bio-for-more-clicks": OptimizeLink,
  "instagram-bio-examples-for-business": InstagramBio,
  "link-in-bio-ideas-for-creators": CreatorIdeas,
  "link-in-bio-seo-guide": SeoGuide,
  "link-in-bio-vs-personal-website": LinkInBioVsWebsite,
  "what-is-a-link-in-bio": WhatIsLinkInBio,
} satisfies Record<string, MDXContent>;

function getBlogPostFromFile(fileName: string): BlogPost {
  const slug = fileName.replace(/\.mdx$/, "");
  const { body, data } = readDocument(`post/${fileName}`);
  const image =
    optionalString(data, "image") ?? body.match(/!\[[^\]]*\]\(([^)]+)\)/)?.[1];
  const Component = postComponents[slug as keyof typeof postComponents];

  if (!Component) throw new Error(`Missing MDX component mapping for ${slug}`);

  return {
    authors: requiredAuthors(data),
    category: optionalString(data, "category"),
    Component,
    description: requiredString(data, "description"),
    image,
    published: requiredDate(data, "published"),
    slug,
    title: requiredString(data, "title"),
  };
}

export function getBlogPosts() {
  return fs
    .readdirSync(path.join(getSourceRoot(), "post"))
    .filter((fileName) => fileName.endsWith(".mdx"))
    .map(getBlogPostFromFile)
    .sort((a, b) => b.published.getTime() - a.published.getTime());
}

export function getBlogPost(slug: string) {
  return getBlogPosts().find((post) => post.slug === slug);
}

export type LegalDocument = {
  Component: MDXContent;
  description: string;
  lastUpdated: string;
  title: string;
};

export function getLegalDocument(name: "privacy" | "terms"): LegalDocument {
  const pathname = `${name}/${name}.mdx`;
  const { data } = readDocument(pathname);

  return {
    Component: name === "privacy" ? Privacy : Terms,
    description: requiredString(data, "description"),
    lastUpdated: requiredString(data, "lastUpdated"),
    title: requiredString(data, "title"),
  };
}
