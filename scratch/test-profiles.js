import { createClient } from '@supabase/supabase-js';

const url = 'https://kztsphgwobudettagemb.supabase.co';
const key = 'sb_publishable_qyzo1R4zewhnNlZ2MrVb1w_F-KLiwR5';
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('profiles').select('*');
  console.log('Profiles error:', error);
  console.log('Profiles count:', data ? data.length : 0);
  console.log('Profiles sample:', data ? data.map(p => ({ id: p.id, name: p.full_name, active: p.active, role: p.role })) : []);
}

run();
