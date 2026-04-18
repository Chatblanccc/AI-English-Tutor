import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts } from "@/lib/seo-content";
import { SITE_NAME, SITE_URL, DEFAULT_OG_IMAGE } from "@/lib/site";

type BlogPageProps = {
  params: Promise<{ slug: string }>;
};

function getPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: BlogPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) {
    return {};
  }

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      type: "article",
      url: `${SITE_URL}/blog/${post.slug}`,
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      siteName: SITE_NAME,
      images: [{ url: `${SITE_URL}${DEFAULT_OG_IMAGE}`, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [`${SITE_URL}${DEFAULT_OG_IMAGE}`],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPageProps) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) {
    notFound();
  }

  const blogPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    url: `${SITE_URL}/blog/${post.slug}`,
    image: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${post.slug}` },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: `${SITE_URL}/blog/${post.slug}` },
    ],
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <nav className="mb-8 text-sm text-muted-foreground">
        <Link href="/blog" className="hover:underline">
          Blog
        </Link>
      </nav>

      <h1 className="text-4xl font-semibold tracking-tight">{post.h1}</h1>
      <p className="mt-4 text-sm text-muted-foreground">{post.date}</p>
      <p className="mt-4 text-base leading-7 text-muted-foreground">
        {post.description}
      </p>

      <div className="mt-10 space-y-8">
        {post.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-2xl font-medium">{section.heading}</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              {section.body}
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
