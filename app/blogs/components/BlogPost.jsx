"use client";

import { useState, useEffect } from "react";
import { BlogContent } from "./BlogContent";
import { SocialSidebar } from "./SocialSidebar";
import { MobileSocialShare } from "./MobileSocialShare";
import { BottomBlogCTA } from "./BlogCTA";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { CalendarDays, Clock, Share2, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function BlogPost({ post }) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateReadTime = (content) => {
    if (!content) return "5 min read";
    
    const text = JSON.stringify(content);
    const wordsPerMinute = 200;
    const wordCount = text.split(/\s+/).length;
    const readTime = Math.ceil(wordCount / wordsPerMinute);
    return `${readTime} min read`;
  };

  const getAuthorAvatarUrl = (author) => {
    if (!author || !author.avatar || !author.avatar.url) {
      return '/api/placeholder/40/40'; // Fallback avatar
    }
    
    return author.avatar.url.startsWith('//') 
      ? `https:${author.avatar.url}` 
      : author.avatar.url;
  };

  const heroImageScale = 1 + (scrollY * 0.0005);
  const heroImageOpacity = Math.max(0.3, 1 - (scrollY * 0.002));

  return (
    <article className="relative">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-background">
        <div className="max-w-7xl mx-auto px-4 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              {/* Back Arrow */}
              <div className="flex items-center">
                <Link href="/blogs">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors -ml-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm">Back to Blog</span>
                  </Button>
                </Link>
              </div>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  <span>{formatDate(post.publishedDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{calculateReadTime(post.content)}</span>
                </div>
                {post.category && (
                  <Badge variant="secondary" className="bg-primary text-primary-foreground">
                    {post.category}
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                {post.title}
              </h1>

              {/* Excerpt */}
              {post.excerpt && (
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                  {post.excerpt}
                </p>
              )}

              {/* Author */}
              {post.author && (
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage 
                      src={getAuthorAvatarUrl(post.author)} 
                      alt={post.author.name} 
                    />
                    <AvatarFallback>
                      {post.author.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-foreground text-lg">
                      {post.author.name}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Image */}
            {post.featuredImage && (
              <div className="relative lg:order-last">
                <div 
                  className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-2xl"
                  style={{
                    transform: `scale(${heroImageScale})`,
                    opacity: heroImageOpacity,
                    transition: 'transform 0.1s ease-out'
                  }}
                >
                  <Image
                    src={post.featuredImage.url.startsWith('//') ? `https:${post.featuredImage.url}` : post.featuredImage.url}
                    alt={post.featuredImage.alt}
                    fill
                    className="object-cover"
                    priority
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="relative max-w-7xl mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Social Sidebar */}
          <div className="lg:col-span-1">
            <SocialSidebar post={post} />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-8">
            <BlogContent content={post.content} className="blog-content" />
            
            {/* Mobile Social Share */}
            <MobileSocialShare post={post} />
            
            {/* Bottom CTA Section */}
            <BottomBlogCTA />
          </div>

          {/* Right Sidebar - Could be used for related posts, ads, etc. */}
          <div className="lg:col-span-3">
            {/* Table of Contents or Related Posts can go here */}
          </div>
        </div>
      </div>
    </article>
  );
}