import { NextResponse } from "next/server";

/**
 * Test endpoint to check your existing Instagram tokens
 * Visit: https://www.postmoo.re/api/test-instagram-tokens
 */
export async function GET() {
  const testTokens = {
    postmoore: process.env.INSTAGRAM_ACCESS_POSTMOORE_TOKEN,
    omaano: process.env.INSTAGRAM_ACCESS_OMAANO_TOKEN
  };

  const results = {};

  for (const [accountName, token] of Object.entries(testTokens)) {
    if (!token) {
      results[accountName] = { error: "No token found in .env" };
      continue;
    }

    try {
      // Test 1: Try me/accounts endpoint (Facebook Pages)
      const accountsResponse = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?access_token=${token}`
      );
      const accountsData = await accountsResponse.json();

      // Test 2: Try me/pages endpoint (alternative)
      const pagesResponse = await fetch(
        `https://graph.facebook.com/v19.0/me/pages?access_token=${token}`
      );
      const pagesData = await pagesResponse.json();

      // Test 3: Check permissions
      const permissionsResponse = await fetch(
        `https://graph.facebook.com/v19.0/me/permissions?access_token=${token}`
      );
      const permissionsData = await permissionsResponse.json();

      results[accountName] = {
        tokenLength: token.length,
        accounts: {
          status: accountsResponse.status,
          ok: accountsResponse.ok,
          count: accountsData.data?.length || 0,
          data: accountsData.data || [],
          error: accountsData.error
        },
        pages: {
          status: pagesResponse.status,
          ok: pagesResponse.ok,
          count: pagesData.data?.length || 0,
          data: pagesData.data || [],
          error: pagesData.error
        },
        permissions: {
          status: permissionsResponse.status,
          ok: permissionsResponse.ok,
          granted: permissionsData.data?.filter(p => p.status === 'granted').map(p => p.permission) || [],
          error: permissionsData.error
        }
      };

    } catch (error) {
      results[accountName] = {
        error: error.message
      };
    }
  }

  // Return results as HTML for easy viewing
  const html = `
    <html>
      <head>
        <title>Instagram Token Test Results</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .account { border: 1px solid #ccc; margin: 20px 0; padding: 15px; }
          .success { color: green; }
          .error { color: red; }
          .warning { color: orange; }
          pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <h1>Instagram Token Test Results</h1>
        <p><em>Generated: ${new Date().toISOString()}</em></p>
        
        ${Object.entries(results).map(([account, result]) => `
          <div class="account">
            <h2>${account.toUpperCase()}</h2>
            
            ${result.error ? `
              <p class="error">❌ Error: ${result.error}</p>
            ` : `
              <h3>📋 Token Info</h3>
              <p>Token Length: ${result.tokenLength} characters</p>
              
              <h3>📄 Facebook Pages (me/accounts)</h3>
              <p class="${result.accounts.ok ? 'success' : 'error'}">
                Status: ${result.accounts.status} | 
                Pages Found: ${result.accounts.count}
              </p>
              ${result.accounts.error ? `<p class="error">Error: ${JSON.stringify(result.accounts.error)}</p>` : ''}
              ${result.accounts.data.length > 0 ? `
                <ul>
                  ${result.accounts.data.map(page => `
                    <li><strong>${page.name}</strong> (ID: ${page.id}) - Category: ${page.category || 'N/A'}</li>
                  `).join('')}
                </ul>
              ` : ''}
              
              <h3>🔐 Permissions</h3>
              <p class="${result.permissions.ok ? 'success' : 'error'}">
                Status: ${result.permissions.status} | 
                Granted: ${result.permissions.granted.length}
              </p>
              <p>Granted permissions: ${result.permissions.granted.join(', ') || 'None'}</p>
              
              <h3>🔍 Raw Data</h3>
              <details>
                <summary>Click to view full response</summary>
                <pre>${JSON.stringify(result, null, 2)}</pre>
              </details>
            `}
          </div>
        `).join('')}
        
        <div style="margin-top: 30px; padding: 15px; background: #e7f3ff; border-left: 4px solid #2196F3;">
          <h3>🔧 Next Steps</h3>
          <p>If you see 0 pages but know you have Facebook Pages:</p>
          <ul>
            <li>Check if the tokens have the right permissions (pages_show_list, pages_manage_posts)</li>
            <li>Verify your Facebook Pages are properly linked to Instagram Business accounts</li>
            <li>Try refreshing the tokens in Facebook Developer Console</li>
          </ul>
        </div>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}