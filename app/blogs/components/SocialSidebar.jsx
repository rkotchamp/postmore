"use client";

import { useState, useEffect } from "react";
import { Share2, MessageCircle, Twitter, Facebook, Linkedin, Link as LinkIcon } from "lucide-react";

export function SocialSidebar({ post }) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const heroHeight = window.innerHeight * 0.8; // Approximate hero section height
      setIsVisible(scrollY > heroHeight);
    };

    // Set current URL for sharing
    setCurrentUrl(window.location.href);

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const shareUrl = encodeURIComponent(currentUrl);
  const shareTitle = encodeURIComponent(post.title);
  const shareText = encodeURIComponent(post.excerpt || post.title);

  const socialLinks = [
    {
      name: "Twitter",
      icon: Twitter,
      url: `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`,
      color: "hover:text-blue-500",
    },
    {
      name: "Facebook",
      icon: Facebook,
      url: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
      color: "hover:text-blue-600",
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
      color: "hover:text-blue-700",
    },
  ];

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className={`sticky top-24 transition-all duration-300 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'} hidden lg:block`}>
      <div className="flex flex-col items-center space-y-4">
        {/* Share Header */}
        <div className="flex flex-col items-center text-center mb-2">
          <Share2 className="w-5 h-5 text-muted-foreground mb-2" />
          <span className="text-sm text-muted-foreground font-medium">Share</span>
        </div>

        {/* Social Icons */}
        <div className="flex flex-col space-y-3">
          {socialLinks.map((social) => (
            <a
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center w-10 h-10 rounded-full bg-muted transition-all duration-200 hover:bg-muted/80 ${social.color} hover:scale-105`}
              aria-label={`Share on ${social.name}`}
            >
              <social.icon className="w-4 h-4" />
            </a>
          ))}
          
          {/* Copy Link Button */}
          <button
            onClick={copyToClipboard}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-muted transition-all duration-200 hover:bg-muted/80 hover:text-primary hover:scale-105"
            aria-label="Copy link"
            title="Copy link"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Comment Count (placeholder) */}
        <div className="flex flex-col items-center mt-6 pt-4 border-t border-border">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted/50">
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="text-sm text-muted-foreground mt-2">0</span>
        </div>
      </div>
    </div>
  );
}