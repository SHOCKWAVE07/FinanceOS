const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vvmcapterphonfusauoc.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function main() {
  const url = `${supabaseUrl}/rest/v1/accounts?select=*`;
  const res = await fetch(url, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  
  if (!res.ok) {
    console.error("HTTP Error:", res.status, await res.text());
    return;
  }
  
  const data = await res.json();
  console.log("=== Accounts ===");
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
