const { createClient } = require('@supabase/supabase-js');

const url = 'https://ofbqqzmatttztbhtjban.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnFxem1hdHR0enRiaHRqYmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5OTIwNjYsImV4cCI6MjEwNTU2ODA2Nn0.bI6wxI9rw-rhauKhFTb2yHIEu2eXwh8F8mTcr2ZiuYI';

const supabase = createClient(url, key);

async function testPush() {
  const shopData = {
    profile: {
      id: 'shop_test_65616134',
      name: 'Test Shop',
      phone: '65616134',
      ownerName: 'Test Owner',
      ownerPhone: null,
      city: 'Ouagadougou',
      pinCode: '0001',
      subscriptionPlan: 'trial',
      subscriptionStatus: 'trial',
      subscriptionExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      currency: 'FCFA',
      isConfigured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    products: [],
    customers: [],
    debts: [],
    debtPayments: [],
    sales: [],
    licenses: [],
    lastUpdatedAt: new Date().toISOString()
  };

  const profile = shopData.profile;
  const res = await supabase
    .from('shops')
    .upsert({
      id: profile.id,
      name: profile.name,
      phone: profile.phone,
      owner_name: profile.ownerName || null,
      owner_phone: profile.ownerPhone || null,
      city: profile.city || null,
      pin_code: profile.pinCode || null,
      subscription_plan: profile.subscriptionPlan || 'trial',
      subscription_status: profile.subscriptionStatus || 'trial',
      subscription_expires_at: profile.subscriptionExpiresAt || null,
      data: shopData,
      telemetry: null,
      updated_at: new Date().toISOString()
    });

  console.log('Upsert result:', res);

  // Test findShopByPhone
  const clean = '65616134';
  const queryRes = await supabase
    .from('shops')
    .select('data')
    .or(`phone.ilike.%${clean}%,owner_phone.ilike.%${clean}%`)
    .limit(1);

  console.log('Query result:', queryRes);

  // Clean up
  await supabase.from('shops').delete().eq('id', 'shop_test_65616134');
}

testPush();
