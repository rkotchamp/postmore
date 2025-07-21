import { createClient } from 'contentful';

const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CONTENTFUL_CONTENT_DELIVERY_API_ACCESS_TOKEN,
});

const previewClient = createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CONTENTFUL_CONTENT_PREVIEW_API_ACCESS_TOKEN,
  host: 'preview.contentful.com',
});

// Helper function to transform Contentful entries to a cleaner format
const transformBlogPost = (entry) => {
  if (!entry || !entry.fields) return null;

  const { fields, sys } = entry;
  
  // Create slug from title if not provided
  const slug = fields.blogTitle ? fields.blogTitle.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim() : sys.id;
  
  return {
    id: sys.id,
    slug: slug,
    title: fields.blogTitle,
    excerpt: fields.summary || '',
    content: fields.content,
    featuredImage: fields.imageCover ? {
      url: fields.imageCover.fields?.file?.url,
      alt: fields.imageCover.fields?.title || fields.blogTitle,
      width: fields.imageCover.fields?.file?.details?.image?.width,
      height: fields.imageCover.fields?.file?.details?.image?.height,
    } : null,
    author: {
      name: fields.authorsName || 'Anonymous',
      bio: null,
      avatar: fields.authorImage ? {
        url: fields.authorImage.fields?.file?.url,
        alt: fields.authorsName || 'Author'
      } : null
    },
    category: 'Blog', // Default category since it's not in your schema
    tags: [],
    publishedDate: fields.date,
    updatedDate: sys.updatedAt,
    createdDate: sys.createdAt,
    published: fields.publish,
    seo: {
      title: fields.blogTitle,
      description: fields.summary,
      keywords: []
    }
  };
};

// Get all blog posts
export const getAllBlogPosts = async (limit = 10, skip = 0, preview = false) => {
  try {
    const currentClient = preview ? previewClient : client;
    
    const response = await currentClient.getEntries({
      content_type: 'postmoore_blog',
      limit: parseInt(limit),
      skip: parseInt(skip),
      order: '-fields.date',
      'fields.publish': true, // Only get published posts
      include: 2, // Include referenced entries up to 2 levels deep
    });

    return {
      items: response.items.map(transformBlogPost),
      total: response.total,
      limit: response.limit,
      skip: response.skip,
    };
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    throw error;
  }
};

// Get a single blog post by slug
export const getBlogPostBySlug = async (slug, preview = false) => {
  try {
    const currentClient = preview ? previewClient : client;
    
    // Since we don't have a slug field, we'll search by title match
    const response = await currentClient.getEntries({
      content_type: 'postmoore_blog',
      'fields.publish': true,
      include: 2,
    });

    // Find the post that matches the slug
    const matchedPost = response.items.find(item => {
      const generatedSlug = item.fields.blogTitle ? item.fields.blogTitle.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim() : item.sys.id;
      return generatedSlug === slug;
    });

    if (!matchedPost) {
      return null;
    }

    return transformBlogPost(matchedPost);
  } catch (error) {
    console.error('Error fetching blog post by slug:', error);
    throw error;
  }
};

// Get blog posts by category (simplified since no category field exists)
export const getBlogPostsByCategory = async (category, limit = 10, skip = 0, preview = false) => {
  // Since there are no categories in your schema, just return all posts
  return await getAllBlogPosts(limit, skip, preview);
};

// Get all unique categories (simplified since no category field exists)
export const getBlogCategories = async (preview = false) => {
  // Return a default set of categories for the UI
  return ['Blog', 'Social Media', 'Marketing', 'Tips'];
};

// Search blog posts
export const searchBlogPosts = async (query, limit = 10, skip = 0, preview = false) => {
  try {
    const currentClient = preview ? previewClient : client;
    
    const response = await currentClient.getEntries({
      content_type: 'postmoore_blog',
      'fields.publish': true,
      query: query,
      limit: parseInt(limit),
      skip: parseInt(skip),
      order: '-fields.date',
      include: 2,
    });

    return {
      items: response.items.map(transformBlogPost),
      total: response.total,
      limit: response.limit,
      skip: response.skip,
      query: query,
    };
  } catch (error) {
    console.error('Error searching blog posts:', error);
    throw error;
  }
};

// Get related blog posts (simplified)
export const getRelatedBlogPosts = async (postId, category, tags = [], limit = 3, preview = false) => {
  try {
    const currentClient = preview ? previewClient : client;
    
    const response = await currentClient.getEntries({
      content_type: 'postmoore_blog',
      'fields.publish': true,
      'sys.id[ne]': postId, // Exclude the current post
      limit: parseInt(limit),
      order: '-fields.date',
      include: 2,
    });

    return response.items.map(transformBlogPost);
  } catch (error) {
    console.error('Error fetching related blog posts:', error);
    throw error;
  }
};

export { client, previewClient };