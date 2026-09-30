const { createClient } = require('@supabase/supabase-js');

const url = 'https://ofbqqzmatttztbhtjban.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnFxem1hdHR0enRiaHRqYmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5OTIwNjYsImV4cCI6MjEwNTU2ODA2Nn0.bI6wxI9rw-rhauKhFTb2yHIEu2eXwh8F8mTcr2ZiuYI';

const supabase = createClient(url, key);

async function testPattern() {
  const shopData = {
    profile: {
      id: 'shop_test_spaces_2',
      name: 'Boutique Spaced Phone',
      phone: '+226 65 61 61 34',
      ownerName: 'Test',
      pinCode: '0001',
      subscriptionPlan: 'trial',
      subscriptionStatus: 'trial',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };

  await supabase.from('shops').upsert({
    id: 'shop_test_spaces_2',
    name: 'Boutique Spaced Phone',
    phone: '+226 65 61 61 34',
    data: shopData,
    updated_at: new Date().toISOString()
  });

  const digits = '65616134'.split('').join('%'); // '6%5%6%1%6%1%3%4'
  const pattern = `%${digits}%`;
  console.log('Testing pattern:', pattern);

  const queryRes = await supabase
    .from('shops')
    .select('data')
    .or(`phone.ilike.${pattern},owner_phone.ilike.${pattern}`)
    .limit(1);

  console.log('Query result with pattern:', queryRes.data?.length > 0 ? 'MATCH FOUND!' : 'NO MATCH');

  // Clean up
  await supabase.from('shops').delete().eq('id', 'shop_test_spaces_2');
}

testPattern();
