const { createClient } = require('@supabase/supabase-js');

const url = 'https://ofbqqzmatttztbhtjban.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnFxem1hdHR0enRiaHRqYmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5OTIwNjYsImV4cCI6MjEwNTU2ODA2Nn0.bI6wxI9rw-rhauKhFTb2yHIEu2eXwh8F8mTcr2ZiuYI';

const supabase = createClient(url, key);

async function main() {
  console.log('Querying Supabase shops...');
  const { data, error } = await supabase.from('shops').select('id, name, phone, owner_phone, pin_code, updated_at');
  if (error) {
    console.error('Supabase error:', error);
    return;
  }
  console.log('Found shops:', data);
}

main();
