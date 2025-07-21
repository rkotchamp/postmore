"use client";

import { useState, useEffect } from "react";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import Link from "next/link";
import Image from "next/image";

export function BlogCards() {
  const [selectedCategory, setSelectedCategory] = useState("All Tags");
  const [blogPosts, setBlogPosts] = useState([]);
  const [categories, setCategories] = useState(["All Tags"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch blog posts and categories on component mount
  useEffect(() => {
    const fetchBlogData = async () => {
      try {
        setLoading(true);
        
        // Fetch all posts
        const postsResponse = await fetch('/api/contentful?action=getAllPosts&limit=20');
        const postsData = await postsResponse.json();
        
        // Fetch categories
        const categoriesResponse = await fetch('/api/contentful?action=getCategories');
        const categoriesData = await categoriesResponse.json();
        
        if (postsData.success) {
          setBlogPosts(postsData.data.items);
        } else {
          throw new Error(postsData.error || 'Failed to fetch blog posts');
        }
        
        if (categoriesData.success) {
          setCategories(["All Tags", ...categoriesData.data]);
        }
        
      } catch (err) {
        console.error('Error fetching blog data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogData();
  }, []);

  // Filter posts based on selected category
  const filteredPosts = selectedCategory === "All Tags" 
    ? blogPosts 
    : blogPosts.filter(post => post.category === selectedCategory);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getImageUrl = (featuredImage) => {
    if (!featuredImage || !featuredImage.url) {
      return '/api/placeholder/600/400'; // Fallback image
    }
    
    // Add https if URL starts with //
    return featuredImage.url.startsWith('//') 
      ? `https:${featuredImage.url}` 
      : featuredImage.url;
  };

  const getAuthorAvatarUrl = (author) => {
    if (!author || !author.avatar || !author.avatar.url) {
      return '/api/placeholder/40/40'; // Fallback avatar
    }
    
    return author.avatar.url.startsWith('//') 
      ? `https:${author.avatar.url}` 
      : author.avatar.url;
  };

  if (loading) {
    return (
      <div>
        {/* Category Filter Skeleton */}
        <div className="flex flex-wrap gap-3 justify-center mb-12">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="px-6 py-2 rounded-full bg-muted animate-pulse w-20 h-10"></div>
          ))}
        </div>

        {/* Blog Posts Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-[16/10] bg-muted animate-pulse"></div>
              <div className="p-6 space-y-3">
                <div className="h-4 bg-muted animate-pulse rounded"></div>
                <div className="h-6 bg-muted animate-pulse rounded"></div>
                <div className="h-4 bg-muted animate-pulse rounded"></div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-muted animate-pulse rounded-full"></div>
                  <div className="h-4 bg-muted animate-pulse rounded flex-1"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-red-800 font-semibold mb-2">Error Loading Blog Posts</h3>
          <p className="text-red-600 text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Category Filter */}
      <div className="flex flex-wrap gap-3 justify-center mb-12">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              selectedCategory === category
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Blog Posts Grid */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-foreground mb-2">No posts found</h3>
          <p className="text-muted-foreground">
            {selectedCategory === "All Tags" 
              ? "No blog posts are available at the moment."
              : `No posts found in the "${selectedCategory}" category.`
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post) => (
            <Link key={post.id} href={`/blogs/${post.slug}`} className="group">
              <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={getImageUrl(post.featuredImage)}
                    alt={post.featuredImage?.alt || post.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {post.category && (
                    <div className="absolute top-4 left-4">
                      <Badge 
                        variant="secondary" 
                        className="bg-primary text-primary-foreground font-medium"
                      >
                        {post.category}
                      </Badge>
                    </div>
                  )}
                </div>
                
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(post.publishedDate || post.date)}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  
                  <p className="text-muted-foreground mb-4 line-clamp-3">
                    {post.excerpt || "Read more to discover the full story..."}
                  </p>
                  
                  {post.author && (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={getAuthorAvatarUrl(post.author)} 
                          alt={post.author.name} 
                        />
                        <AvatarFallback>
                          {post.author.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground">
                        {post.author.name}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}