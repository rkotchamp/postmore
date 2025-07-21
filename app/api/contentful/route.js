import { NextResponse } from 'next/server';
import { 
  getAllBlogPosts, 
  getBlogPostBySlug, 
  getBlogPostsByCategory,
  getBlogCategories 
} from '@/app/lib/api/Others/contentful';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const slug = searchParams.get('slug');
    const category = searchParams.get('category');
    const limit = searchParams.get('limit') || 10;
    const skip = searchParams.get('skip') || 0;

    switch (action) {
      case 'getAllPosts':
        const allPosts = await getAllBlogPosts(limit, skip);
        return NextResponse.json({ success: true, data: allPosts });

      case 'getPostBySlug':
        if (!slug) {
          return NextResponse.json(
            { success: false, error: 'Slug is required' },
            { status: 400 }
          );
        }
        const post = await getBlogPostBySlug(slug);
        if (!post) {
          return NextResponse.json(
            { success: false, error: 'Blog post not found' },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, data: post });

      case 'getPostsByCategory':
        if (!category) {
          return NextResponse.json(
            { success: false, error: 'Category is required' },
            { status: 400 }
          );
        }
        const categoryPosts = await getBlogPostsByCategory(category, limit, skip);
        return NextResponse.json({ success: true, data: categoryPosts });

      case 'getCategories':
        const categories = await getBlogCategories();
        return NextResponse.json({ success: true, data: categories });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Contentful API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}