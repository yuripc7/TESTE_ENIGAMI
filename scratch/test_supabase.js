import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qlvvpgfotcdtdypvkrvu.supabase.co',
  'sb_publishable_s894em2YE-BXyabblSnemQ_4Jwx7AoB'
);

async function test() {
  try {
    const { error } = await supabase.from('profiles').upsert({
      id: '00000000-0000-0000-0000-000000000000',
      name: 'Test Name',
      avatar_url: 'http://test.com',
      role: 'Arquiteto(a)'
    });
    if (error) {
      console.log('Upsert with role returned error:', error.code, error.message);
    } else {
      console.log('Upsert with role succeeded!');
    }
  } catch (err) {
    console.error('Catch error:', err);
  }
}

test();
