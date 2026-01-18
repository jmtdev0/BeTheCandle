// Test script to publish a test tweet
require('dotenv').config();
const crypto = require('crypto');
const https = require('https');

// Use v1.1 API (free with Elevated access)
const TWITTER_API_URL = "https://api.twitter.com/1.1/statuses/update.json";

async function postTestTweet() {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    console.error('❌ Error: Missing Twitter credentials in .env file');
    console.log('Required variables:');
    console.log('  - TWITTER_API_KEY');
    console.log('  - TWITTER_API_SECRET');
    console.log('  - TWITTER_ACCESS_TOKEN');
    console.log('  - TWITTER_ACCESS_TOKEN_SECRET');
    process.exit(1);
  }

  console.log('✓ Twitter credentials loaded from .env');
  console.log('📤 Preparing test tweet...\n');

  const tweetText = `🧪 Test: Automated tweet from BeTheCandle\n\n` +
    `This is a test of the automated distribution announcement system.\n\n` +
    `#BeTheCandle #TestTweet`;

  try {
    // Generate OAuth 1.0a signature
    const oauth = {
      oauth_consumer_key: apiKey,
      oauth_token: accessToken,
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_version: "1.0",
    };

    // For v1.1, we need to include the status parameter in the signature
    const params = {
      ...oauth,
      status: tweetText,
    };

    // Build parameter string (sorted alphabetically)
    const paramString = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join("&");

    // Build signature base string
    const baseString = `POST&${encodeURIComponent(TWITTER_API_URL)}&${encodeURIComponent(paramString)}`;
    const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessTokenSecret)}`;

    // Generate HMAC-SHA1 signature
    const signature = crypto
      .createHmac('sha1', signingKey)
      .update(baseString)
      .digest('base64');

    // Build Authorization header
    const authHeader = `OAuth ${Object.entries({ ...oauth, oauth_signature: signature })
      .map(([key, value]) => `${encodeURIComponent(key)}="${encodeURIComponent(value)}"`)
      .join(", ")}`;

    // Prepare request body (URL-encoded for v1.1)
    const payload = `status=${encodeURIComponent(tweetText)}`;

    // Make the request
    const url = new URL(TWITTER_API_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            const result = JSON.parse(data);
            console.log('✅ Tweet posted successfully!');
            console.log(`\n📝 Tweet ID: ${result.id_str}`);
            console.log(`🔗 View at: https://twitter.com/${result.user.screen_name}/status/${result.id_str}`);
            console.log(`\n💬 Tweet content:\n"${tweetText}"\n`);
            resolve(result);
          } else {
            console.error(`❌ Failed to post tweet: ${res.statusCode}`);
            console.error(`Response: ${data}`);
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ Request error:', error.message);
        reject(error);
      });

      req.write(payload);
      req.end();
    });

  } catch (error) {
    console.error('❌ Error posting tweet:', error.message);
    process.exit(1);
  }
}

console.log('🐦 BeTheCandle - Twitter Test Script\n');
console.log('=' .repeat(50));
postTestTweet()
  .then(() => {
    console.log('\n' + '='.repeat(50));
    console.log('✨ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n' + '='.repeat(50));
    console.error('💥 Test failed:', error.message);
    process.exit(1);
  });
