const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ofbqqzmatttztbhtjban.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnFxem1hdHR0enRiaHRqYmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5OTIwNjYsImV4cCI6MjEwNTU2ODA2Nn0.bI6wxI9rw-rhauKhFTb2yHIEu2eXwh8F8mTcr2ZiuYI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyze() {
  console.log('--- INTERROGATION DE LA BASE SUPABASE ---');

  // Récupérer les boutiques
  const { data: shops, error: shopsError } = await supabase
    .from('shops')
    .select('*')
    .order('created_at', { ascending: true });

  if (shopsError) {
    console.error('Erreur récupération shops:', shopsError);
    return;
  }

  console.log(`Nombre total de boutiques/utilisateurs enregistrés : ${shops.length}`);
  console.log(JSON.stringify(shops, null, 2));
}

analyze();
