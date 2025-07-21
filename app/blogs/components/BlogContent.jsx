"use client";

import { documentToReactComponents } from '@contentful/rich-text-react-renderer';
import { BLOCKS, MARKS, INLINES } from '@contentful/rich-text-types';
import Image from 'next/image';
import Link from 'next/link';
import { InlineBlogCTA } from './BlogCTA';

// Custom rendering options for rich text
const renderOptions = {
  renderMark: {
    [MARKS.BOLD]: (text) => <strong className="font-semibold">{text}</strong>,
    [MARKS.ITALIC]: (text) => <em className="italic">{text}</em>,
    [MARKS.UNDERLINE]: (text) => <u className="underline">{text}</u>,
    [MARKS.CODE]: (text) => (
      <code className="bg-muted px-3 py-1 rounded-md text-sm font-mono border">
        {text}
      </code>
    ),
  },
  renderNode: {
    [BLOCKS.PARAGRAPH]: (node, children) => (
      <p className="mb-6 text-foreground leading-[1.8] text-lg">{children}</p>
    ),
    [BLOCKS.HEADING_1]: (node, children) => (
      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8 mt-12 leading-tight">
        {children}
      </h1>
    ),
    [BLOCKS.HEADING_2]: (node, children) => (
      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 mt-12 leading-tight">
        {children}
      </h2>
    ),
    [BLOCKS.HEADING_3]: (node, children) => (
      <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-5 mt-10 leading-tight">
        {children}
      </h3>
    ),
    [BLOCKS.HEADING_4]: (node, children) => (
      <h4 className="text-lg md:text-xl font-semibold text-foreground mb-4 mt-8 leading-tight">
        {children}
      </h4>
    ),
    [BLOCKS.HEADING_5]: (node, children) => (
      <h5 className="text-base md:text-lg font-semibold text-foreground mb-4 mt-8 leading-tight">
        {children}
      </h5>
    ),
    [BLOCKS.HEADING_6]: (node, children) => (
      <h6 className="text-sm md:text-base font-semibold text-foreground mb-3 mt-6 leading-tight">
        {children}
      </h6>
    ),
    [BLOCKS.UL_LIST]: (node, children) => (
      <ul className="list-disc list-outside mb-8 space-y-3 ml-8 text-lg">
        {children}
      </ul>
    ),
    [BLOCKS.OL_LIST]: (node, children) => (
      <ol className="list-decimal list-outside mb-8 space-y-3 ml-8 text-lg">
        {children}
      </ol>
    ),
    [BLOCKS.LIST_ITEM]: (node, children) => (
      <li className="text-foreground leading-[1.7]">{children}</li>
    ),
    [BLOCKS.QUOTE]: (node, children) => (
      <blockquote className="border-l-4 border-primary pl-8 italic text-foreground/90 my-10 bg-muted/30 py-6 rounded-r-lg text-xl leading-relaxed">
        {children}
      </blockquote>
    ),
    [BLOCKS.HR]: () => (
      <hr className="border-border my-8" />
    ),
    [BLOCKS.EMBEDDED_ASSET]: (node) => {
      const { file, title, description } = node.data.target.fields;
      const { url, details } = file;
      
      if (details?.image) {
        return (
          <div className="my-8">
            <Image
              src={url.startsWith('//') ? `https:${url}` : url}
              alt={description || title || 'Blog image'}
              width={details.image.width}
              height={details.image.height}
              className="rounded-lg w-full object-cover"
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
            />
            {(description || title) && (
              <p className="text-xs text-muted-foreground/60 text-center mt-3 italic opacity-70">
                {description || title}
              </p>
            )}
          </div>
        );
      }
      
      // Handle other asset types (videos, documents, etc.)
      return (
        <div className="my-6 p-4 border border-border rounded-lg">
          <a
            href={url.startsWith('//') ? `https:${url}` : url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            {title || 'Download attachment'}
          </a>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      );
    },
    [INLINES.HYPERLINK]: (node, children) => (
      <Link
        href={node.data.uri}
        className="text-primary hover:underline font-medium"
        target={node.data.uri.startsWith('http') ? '_blank' : '_self'}
        rel={node.data.uri.startsWith('http') ? 'noopener noreferrer' : ''}
      >
        {children}
      </Link>
    ),
    [BLOCKS.EMBEDDED_ENTRY]: (node) => {
      // Handle embedded entries (like related posts, call-to-action blocks, etc.)
      const { fields, sys } = node.data.target;
      
      // You can customize this based on your content types
      if (sys.contentType.sys.id === 'callToAction') {
        return (
          <div className="my-8 p-6 bg-primary/10 border border-primary/20 rounded-lg text-center">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {fields?.title}
            </h3>
            {fields?.description && (
              <p className="text-muted-foreground mb-4">{fields.description}</p>
            )}
            {fields?.buttonText && fields?.buttonUrl && (
              <Link
                href={fields.buttonUrl}
                className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                {fields.buttonText}
              </Link>
            )}
          </div>
        );
      }
      
      // Default handling for unknown embedded entries
      return (
        <div className="my-4 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Embedded content: {sys.contentType.sys.id}
          </p>
        </div>
      );
    },
    [BLOCKS.TABLE]: (node, children) => (
      <div className="overflow-x-auto my-6">
        <table className="min-w-full border border-border rounded-lg">
          {children}
        </table>
      </div>
    ),
    [BLOCKS.TABLE_HEADER_CELL]: (node, children) => (
      <th className="border border-border px-4 py-2 bg-muted font-semibold text-left">
        {children}
      </th>
    ),
    [BLOCKS.TABLE_CELL]: (node, children) => (
      <td className="border border-border px-4 py-2">
        {children}
      </td>
    ),
    [BLOCKS.TABLE_ROW]: (node, children) => (
      <tr>{children}</tr>
    ),
  },
};

// Special component for Note/Info boxes
const NoteBox = ({ children, type = "info" }) => {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-100",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-100",
    success: "bg-green-50 border-green-200 text-green-900 dark:bg-green-950/30 dark:border-green-800 dark:text-green-100",
    error: "bg-red-50 border-red-200 text-red-900 dark:bg-red-950/30 dark:border-red-800 dark:text-red-100"
  };

  return (
    <div className={`my-8 p-6 border-l-4 rounded-r-lg ${styles[type]}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-current mt-3"></div>
        <div className="flex-1">
          <strong className="font-semibold">Note:</strong> {children}
        </div>
      </div>
    </div>
  );
};

// Helper function to insert CTA in the middle of content
const insertCTAInContent = (content) => {
  if (!content || !content.content) return content;

  const contentNodes = content.content;
  const totalNodes = contentNodes.length;
  const middleIndex = Math.floor(totalNodes / 2);

  // Create a CTA node
  const ctaNode = {
    nodeType: 'embedded-entry-block',
    data: {
      target: {
        sys: {
          contentType: {
            sys: {
              id: 'inlineCTA'
            }
          }
        }
      }
    },
    content: []
  };

  // Insert CTA in the middle
  const newContent = [
    ...contentNodes.slice(0, middleIndex),
    ctaNode,
    ...contentNodes.slice(middleIndex)
  ];

  return {
    ...content,
    content: newContent
  };
};

export function BlogContent({ content, className = "", showInlineCTA = true }) {
  if (!content) {
    return (
      <div className={`max-w-none ${className}`}>
        <p className="text-muted-foreground">No content available.</p>
      </div>
    );
  }

  // Insert CTA in middle of content if enabled
  const processedContent = showInlineCTA ? insertCTAInContent(content) : content;

  // Enhanced render options with CTA handling
  const enhancedRenderOptions = {
    ...renderOptions,
    renderNode: {
      ...renderOptions.renderNode,
      [BLOCKS.EMBEDDED_ENTRY]: (node) => {
        const { fields, sys } = node.data.target;
        
        // Handle inline CTA
        if (sys.contentType.sys.id === 'inlineCTA') {
          return <InlineBlogCTA key="inline-cta" />;
        }
        
        // Handle other embedded entries
        if (sys.contentType.sys.id === 'callToAction') {
          return (
            <div className="my-8 p-6 bg-primary/10 border border-primary/20 rounded-lg text-center">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {fields?.title}
              </h3>
              {fields?.description && (
                <p className="text-muted-foreground mb-4">{fields.description}</p>
              )}
              {fields?.buttonText && fields?.buttonUrl && (
                <Link
                  href={fields.buttonUrl}
                  className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  {fields.buttonText}
                </Link>
              )}
            </div>
          );
        }
        
        // Default handling for unknown embedded entries
        return (
          <div className="my-4 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Embedded content: {sys.contentType.sys.id}
            </p>
          </div>
        );
      },
    },
  };

  return (
    <div className={`max-w-none ${className} blog-post-content`}>
      {documentToReactComponents(processedContent, enhancedRenderOptions)}
      
      <style jsx global>{`
        .blog-post-content {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        
        .blog-post-content p code {
          font-size: 0.875rem;
          background: hsl(var(--muted));
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          border: 1px solid hsl(var(--border));
        }
      `}</style>
    </div>
  );
}