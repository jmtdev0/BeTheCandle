require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');

// Twitter API credentials
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

async function test() {
  console.log('🚀 Testing Twitter API v1.1 (FREE TIER)...\n');
  
  const testMessage = `🧪 Test tweet from BeTheCandle - ${new Date().toISOString()}`;
  
  try {
    // Use v1.1 API (free with Elevated access)
    const tweet = await client.v1.tweet(testMessage);
    console.log('✅ Tweet posted successfully!');
    console.log('🔗 Tweet ID:', tweet.id_str);
    console.log('📄 Full response:', JSON.stringify(tweet, null, 2));
  } catch (error) {
    console.error('❌ Error:', error);
    if (error.data) {
      console.error('📄 Error details:', JSON.stringify(error.data, null, 2));
    }
  }
}

test();
