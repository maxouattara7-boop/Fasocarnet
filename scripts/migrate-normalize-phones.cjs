/**
 * Script de migration : normalise les colonnes phone et owner_phone dans Supabase
 * pour tous les comptes existants dont le numéro contient des espaces ou préfixes.
 * À exécuter une seule fois.
 */
const { createClient } = require('@supabase/supabase-js');

const url = 'https://ofbqqzmatttztbhtjban.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnFxem1hdHR0enRiaHRqYmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5OTIwNjYsImV4cCI6MjEwNTU2ODA2Nn0.bI6wxI9rw-rhauKhFTb2yHIEu2eXwh8F8mTcr2ZiuYI';

const supabase = createClient(url, key);

const normalize = (p) => p ? p.replace(/\D/g, '').slice(-8) : null;

async function migrate() {
  const { data, error } = await supabase.from('shops').select('id, phone, owner_phone');
  if (error) { console.error('Erreur lecture:', error); return; }

  let updated = 0;
  for (const row of data) {
    const normPhone = normalize(row.phone);
    const normOwner = normalize(row.owner_phone);
    const phoneChanged = normPhone && normPhone !== row.phone;
    const ownerChanged = normOwner !== row.owner_phone;
    if (phoneChanged || ownerChanged) {
      const patch = {};
      if (phoneChanged) patch.phone = normPhone;
      if (ownerChanged) patch.owner_phone = normOwner;
      const { error: upErr } = await supabase.from('shops').update(patch).eq('id', row.id);
      if (upErr) {
        console.warn(`Erreur mise à jour ${row.id}:`, upErr.message);
      } else {
        console.log(`[OK] ${row.id}: phone ${row.phone} → ${normPhone || row.phone}`);
        updated++;
      }
    }
  }
  console.log(`\nMigration terminée. ${updated} boutique(s) mises à jour sur ${data.length}.`);
}

migrate();
