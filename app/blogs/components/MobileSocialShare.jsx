"use client";

import { useState, useEffect } from "react";
import { Share2, Twitter, Facebook, Linkedin, Link as LinkIcon, Copy, MessageCircle } from "lucide-react";

export function MobileSocialShare({ post }) {
  const [currentUrl, setCurrentUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const shareUrl = encodeURIComponent(currentUrl);
  const shareTitle = encodeURIComponent(post.title);
  const shareText = encodeURIComponent(post.excerpt || post.title);

  const socialLinks = [
    {
      name: "Twitter",
      icon: Twitter,
      url: `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`,
      color: "hover:bg-blue-500 hover:text-white",
    },
    {
      name: "Facebook",
      icon: Facebook,
      url: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
      color: "hover:bg-blue-600 hover:text-white",
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
      color: "hover:bg-blue-700 hover:text-white",
    },
  ];

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="lg:hidden mt-12">
      <div className="flex flex-col items-center space-y-4">
        {/* Share Header */}
        <div className="flex flex-col items-center text-center">
          <Share2 className="w-4 h-4 text-muted-foreground mb-1" />
          <span className="text-xs text-muted-foreground font-medium">Share</span>
        </div>

        {/* Social Icons - Horizontal layout for mobile */}
        <div className="flex items-center justify-center space-x-3">
          {socialLinks.map((social) => (
            <a
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center w-8 h-8 rounded-full bg-muted transition-all duration-200 hover:bg-muted/80 ${social.color.replace('hover:bg-blue-', 'hover:text-blue-').replace(' hover:text-white', '')} hover:scale-105`}
              aria-label={`Share on ${social.name}`}
            >
              <social.icon className="w-3.5 h-3.5" />
            </a>
          ))}
          
          {/* Copy Link Button */}
          <button
            onClick={copyToClipboard}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-muted transition-all duration-200 hover:bg-muted/80 hover:text-primary hover:scale-105"
            aria-label="Copy link"
            title={copied ? "Copied!" : "Copy link"}
          >
            {copied ? (
              <Copy className="w-3.5 h-3.5" />
            ) : (
              <LinkIcon className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Comment Count (placeholder) */}
        <div className="flex flex-col items-center pt-2 border-t border-border">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/50">
            <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <span className="text-xs text-muted-foreground mt-1">0</span>
        </div>
      </div>
    </div>
  );
}