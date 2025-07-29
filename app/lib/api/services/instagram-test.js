/**
 * Instagram Test Utility
 * Simple test script to validate Instagram API integration with test user tokens
 */

import instagramService from './instagramService.js';

const GRAPH_API_VERSION = process.env.FACEBOOK_GRAPH_API_VERSION || "v19.0";

/**
 * Test Instagram Business Account access with provided test tokens
 */
export async function testInstagramAccess() {
  console.log("🧪 Testing Instagram API integration...");
  
  const testTokens = {
    postmoore: process.env.INSTAGRAM_ACCESS_POSTMOORE_TOKEN,
    omaano: process.env.INSTAGRAM_ACCESS_OMAANO_TOKEN
  };

  const results = [];

  for (const [accountName, token] of Object.entries(testTokens)) {
    if (!token) {
      console.log(`❌ No token found for ${accountName}`);
      continue;
    }

    console.log(`\n🔍 Testing ${accountName} account...`);
    
    try {
      // Test 1: Get user pages to find Instagram Business Account
      const pagesResponse = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts?access_token=${token}`
      );
      
      const pagesData = await pagesResponse.json();
      
      if (!pagesResponse.ok) {
        throw new Error(`Pages API error: ${pagesData.error?.message || 'Unknown error'}`);
      }

      console.log(`✅ Found ${pagesData.data?.length || 0} Facebook pages`);

      // Test 2: Find Instagram Business Account
      let instagramAccount = null;
      
      for (const page of pagesData.data || []) {
        const igResponse = await fetch(
          `https://graph.facebook.com/${GRAPH_API_VERSION}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
        );
        
        const igData = await igResponse.json();
        
        if (igData.instagram_business_account?.id) {
          instagramAccount = {
            id: igData.instagram_business_account.id,
            pageId: page.id,
            pageName: page.name,
            pageAccessToken: page.access_token
          };
          break;
        }
      }

      if (!instagramAccount) {
        throw new Error('No Instagram Business Account found');
      }

      console.log(`✅ Found Instagram Business Account: ${instagramAccount.id}`);

      // Test 3: Get Instagram account details
      const accountResponse = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramAccount.id}?fields=id,username,profile_picture_url,followers_count,media_count&access_token=${instagramAccount.pageAccessToken}`
      );
      
      const accountData = await accountResponse.json();
      
      if (!accountResponse.ok) {
        throw new Error(`Account details error: ${accountData.error?.message || 'Unknown error'}`);
      }

      console.log(`✅ Account details retrieved:`, {
        username: accountData.username,
        followers: accountData.followers_count,
        media: accountData.media_count
      });

      // Test 4: Check publishing permissions
      const permissionsResponse = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/me/permissions?access_token=${token}`
      );
      
      const permissionsData = await permissionsResponse.json();
      const grantedPermissions = permissionsData.data?.filter(p => p.status === 'granted').map(p => p.permission) || [];
      
      const requiredPermissions = [
        'instagram_basic',
        'instagram_content_publish',
        'pages_show_list',
        'pages_read_engagement'
      ];
      
      const missingPermissions = requiredPermissions.filter(p => !grantedPermissions.includes(p));
      
      if (missingPermissions.length > 0) {
        console.log(`⚠️  Missing permissions: ${missingPermissions.join(', ')}`);
      } else {
        console.log(`✅ All required permissions granted`);
      }

      results.push({
        account: accountName,
        success: true,
        instagramId: instagramAccount.id,
        username: accountData.username,
        pageId: instagramAccount.pageId,
        pageName: instagramAccount.pageName,
        missingPermissions
      });

    } catch (error) {
      console.log(`❌ Error testing ${accountName}:`, error.message);
      results.push({
        account: accountName,
        success: false,
        error: error.message
      });
    }
  }

  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.account}: Ready for publishing`);
      console.log(`   - Instagram ID: ${result.instagramId}`);
      console.log(`   - Username: ${result.username}`);
      console.log(`   - Page: ${result.pageName} (${result.pageId})`);
      if (result.missingPermissions?.length > 0) {
        console.log(`   - Missing permissions: ${result.missingPermissions.join(', ')}`);
      }
    } else {
      console.log(`❌ ${result.account}: ${result.error}`);
    }
  });

  return results;
}

/**
 * Test posting to Instagram (requires a test image URL)
 */
export async function testInstagramPost(testImageUrl = null) {
  if (!testImageUrl) {
    console.log('📝 To test posting, provide a test image URL');
    return;
  }

  console.log('🧪 Testing Instagram post creation...');
  
  // This would use the real account data from your database
  // For now, it's a placeholder to show how the posting would work
  console.log('📝 Post testing requires connected account data from database');
}

// Export for use in API routes or admin scripts
export default {
  testInstagramAccess,
  testInstagramPost
};