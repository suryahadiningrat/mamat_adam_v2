const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: ws, error } = await supabase.from('workspaces').select('id, name, slug, api_usage_usd, api_limit_usd');
  console.log('Workspaces:', ws);
  if (error) console.error('Error:', error);
}
main();
