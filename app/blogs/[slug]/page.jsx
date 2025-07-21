import { Header } from "@/app/components/HomePage/Header";
import { Footer } from "@/app/components/HomePage/Footer";
import { BlogPost } from "../components/BlogPost";
import { getBlogPostBySlug } from "@/app/lib/api/Others/contentful";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }) {
  const post = await getBlogPostBySlug(params.slug);
  
  if (!post) {
    return {
      title: "Blog Post Not Found - PostMoore",
    };
  }

  return {
    title: `${post.title} - PostMoore Blog`,
    description: post.excerpt || post.seo?.description,
    keywords: post.seo?.keywords || post.tags,
    authors: post.author ? [{ name: post.author.name }] : [],
    openGraph: {
      title: post.seo?.title || post.title,
      description: post.excerpt || post.seo?.description,
      type: "article",
      publishedTime: post.publishedDate,
      modifiedTime: post.updatedDate,
      authors: post.author ? [post.author.name] : [],
      images: post.featuredImage ? [
        {
          url: post.featuredImage.url.startsWith('//') ? `https:${post.featuredImage.url}` : post.featuredImage.url,
          width: post.featuredImage.width,
          height: post.featuredImage.height,
          alt: post.featuredImage.alt,
        }
      ] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: post.seo?.title || post.title,
      description: post.excerpt || post.seo?.description,
      images: post.featuredImage ? [
        post.featuredImage.url.startsWith('//') ? `https:${post.featuredImage.url}` : post.featuredImage.url
      ] : [],
    },
  };
}

export default async function BlogPostPage({ params }) {
  const post = await getBlogPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <BlogPost post={post} />
      <Footer />
    </div>
  );
}