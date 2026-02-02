/**
 * Test HuggingFace API Access
 */
require('dotenv').config();

async function testHuggingFaceAPI() {
  console.log('🧪 Testing HuggingFace API Access...\n');
  
  // Check environment variable
  const token = process.env.HUGGINGFACE_API_ACCESS_TOKEN;
  console.log(`🔑 Token present: ${token ? 'YES' : 'NO'}`);
  console.log(`🔑 Token length: ${token ? token.length : 0} characters`);
  console.log(`🔑 Token prefix: ${token ? token.substring(0, 10) + '...' : 'N/A'}\n`);
  
  if (!token) {
    console.log('❌ No HuggingFace token found!');
    console.log('💡 Add HUGGINGFACE_API_ACCESS_TOKEN to your .env file');
    return;
  }
  
  // Test simple models
  const modelsToTest = [
    'Salesforce/blip-image-captioning-base',
    'microsoft/git-base', 
    'nlpconnect/vit-gpt2-image-captioning',
    'microsoft/DialoGPT-medium' // Simple text model for comparison
  ];
  
  for (const model of modelsToTest) {
    console.log(`📊 Testing: ${model}`);
    
    try {
      const url = `https://api-inference.huggingface.co/models/${model}`;
      
      // Test with GET request first (model info)
      const infoResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log(`   GET Status: ${infoResponse.status} ${infoResponse.statusText}`);
      
      if (infoResponse.status === 200) {
        console.log(`   ✅ Model accessible`);
        
        // Try a simple inference if it's a vision model
        if (model.includes('blip') || model.includes('git') || model.includes('vit')) {
          const testImage = "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A==";
          
          const inferenceResponse = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              inputs: testImage
            })
          });
          
          console.log(`   POST Status: ${inferenceResponse.status} ${inferenceResponse.statusText}`);
          
          if (inferenceResponse.status === 200) {
            const result = await inferenceResponse.json();
            console.log(`   ✅ Inference works! Result:`, result);
          } else if (inferenceResponse.status === 503) {
            console.log(`   ⚠️ Model loading, inference not ready yet`);
          } else {
            const errorText = await inferenceResponse.text();
            console.log(`   ❌ Inference failed: ${errorText}`);
          }
        }
        
      } else if (infoResponse.status === 404) {
        console.log(`   ❌ Model not found or not accessible`);
      } else if (infoResponse.status === 401) {
        console.log(`   ❌ Authentication failed - check your token`);
      } else {
        const errorText = await infoResponse.text();
        console.log(`   ❌ Error: ${errorText}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }
  
  console.log('🏁 Test complete!');
  console.log('\n💡 If all models return 404:');
  console.log('   - Check your HuggingFace token permissions');
  console.log('   - Ensure token has "Inference" permissions');
  console.log('   - Try regenerating your token');
}

// Run the test
testHuggingFaceAPI().catch(console.error);