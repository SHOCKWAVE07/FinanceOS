const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase configuration!");
  process.exit(1);
}

async function main() {
  const url = `${supabaseUrl}/rest/v1/expenses?limit=1`;
  const res = await fetch(url, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  if (!res.ok) {
    throw new Error(`Failed to query expenses: ${await res.text()}`);
  }
  const data = await res.json();
  console.log("=== Expense Record ===");
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
