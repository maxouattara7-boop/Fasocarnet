const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ofbqqzmatttztbhtjban.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnFxem1hdHR0enRiaHRqYmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5OTIwNjYsImV4cCI6MjEwNTU2ODA2Nn0.bI6wxI9rw-rhauKhFTb2yHIEu2eXwh8F8mTcr2ZiuYI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupTestShops() {
  console.log("===> Récupération de tous les comptes shops de Supabase...");
  const { data: shops, error } = await supabase
    .from('shops')
    .select('*');

  if (error) {
    console.error("Erreur lors de la lecture des boutiques:", error);
    process.exit(1);
  }

  console.log(`Nombre total de boutiques trouvées: ${shops.length}`);

  const realShopId = 'shop_1790004513560_yoeck'; // Boutique las
  const realShopPhone = '72990310';

  const toKeep = [];
  const toDelete = [];

  shops.forEach(s => {
    // Safety check: preserve Boutique las specifically
    if (s.id === realShopId || s.phone === realShopPhone || (s.name && s.name.toLowerCase().includes('las'))) {
      toKeep.push(s);
    } else {
      toDelete.push(s);
    }
  });

  console.log(`\n--- BOUTIQUE(S) RÉELLE(S) À CONSERVER (${toKeep.length}) ---`);
  toKeep.forEach(s => {
    console.log(`[CONSERVÉ] ID: ${s.id} | Nom: ${s.name} | Tél: ${s.phone} | Créé le: ${s.created_at}`);
  });

  console.log(`\n--- BOUTIQUES DE TEST À SUPPRIMER (${toDelete.length}) ---`);
  toDelete.forEach(s => {
    console.log(`[À SUPPRIMER] ID: ${s.id} | Nom: ${s.name} | Tél: ${s.phone}`);
  });

  if (toDelete.length === 0) {
    console.log("\nAucun compte de test à supprimer.");
    return;
  }

  const idsToDelete = toDelete.map(s => s.id);
  console.log(`\n===> Suppression de ${idsToDelete.length} comptes de test dans Supabase...`);

  const { data: deleted, error: deleteError } = await supabase
    .from('shops')
    .delete()
    .in('id', idsToDelete);

  if (deleteError) {
    console.error("Erreur lors de la suppression:", deleteError);
    process.exit(1);
  }

  console.log("Suppression effectuée avec succès !");

  // Verification
  console.log("\n===> Vérification post-nettoyage...");
  const { data: remainingShops, error: verifyError } = await supabase
    .from('shops')
    .select('id, name, phone, created_at');

  if (verifyError) {
    console.error("Erreur vérification:", verifyError);
  } else {
    console.log(`\nNombre de boutiques restantes dans Supabase: ${remainingShops.length}`);
    remainingShops.forEach((s, idx) => {
      console.log(`${idx + 1}. ID: ${s.id} | Nom: ${s.name} | Téléphone: ${s.phone} | Date: ${s.created_at}`);
    });
  }
}

cleanupTestShops();
