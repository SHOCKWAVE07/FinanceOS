const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vvmcapterphonfusauoc.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function query(table) {
  const url = `${supabaseUrl}/rest/v1/${table}?select=*`;
  const res = await fetch(url, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  if (!res.ok) {
    console.error(`Error querying ${table}:`, res.status, await res.text());
    return null;
  }
  return await res.json();
}

async function main() {
  // Let's get the auth user first
  console.log("Supabase URL:", supabaseUrl);
}

main().catch(console.error);
