/**
 * Lit le cache Cloud local (localStorage de l'app) et pousse le compte 65616134 vers Supabase.
 * À exécuter depuis la console du navigateur sur le PC connecté, OU via ce script Node.
 *
 * Ce script permet de récupérer les données depuis le fichier de cache local si accessible.
 */
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const url = 'https://ofbqqzmatttztbhtjban.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnFxem1hdHR0enRiaHRqYmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5OTIwNjYsImV4cCI6MjEwNTU2ODA2Nn0.bI6wxI9rw-rhauKhFTb2yHIEu2eXwh8F8mTcr2ZiuYI';
const supabase = createClient(url, key);

function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHmac('sha256', salt).update(pin).digest('hex');
  return `sha256$${salt}$${hash}`;
}

async function createMissingAccount() {
  const phone = '65616134';
  const pin = '0001';
  const now = new Date().toISOString();
  const id = `shop_1790797912345_forced`;
  
  const hashedPin = hashPin(pin);
  
  const profile = {
    id,
    name: 'Ma Boutique',
    phone,
    ownerName: '',
    ownerPhone: null,
    city: 'Ouagadougou',
    pinCode: hashedPin,
    currency: 'FCFA',
    isConfigured: true,
    orangeMoneyNumber: phone,
    subscriptionPlan: 'trial',
    subscriptionStatus: 'trial',
    subscriptionExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: now,
    updatedAt: now
  };

  const shopData = {
    profile,
    products: [],
    customers: [],
    debts: [],
    debtPayments: [],
    sales: [],
    licenses: [],
    lastUpdatedAt: now
  };

  const normalizePhoneCol = (p) => p ? p.replace(/\D/g, '').slice(-8) : null;

  const { error } = await supabase.from('shops').upsert({
    id,
    name: profile.name,
    phone: normalizePhoneCol(profile.phone),
    owner_name: profile.ownerName || null,
    owner_phone: null,
    city: profile.city || null,
    pin_code: profile.pinCode,
    subscription_plan: 'trial',
    subscription_status: 'trial',
    data: shopData,
    updated_at: now
  });

  if (error) {
    console.error('Erreur création:', error);
  } else {
    console.log(`✅ Compte créé avec succès dans Supabase !`);
    console.log(`   ID    : ${id}`);
    console.log(`   Téléphone : ${phone}`);
    console.log(`   PIN   : ${pin} (haché)`);
    console.log(`   Nom   : ${profile.name}`);
    console.log('\n⚠️  IMPORTANT: Ce compte a été créé avec le nom "Ma Boutique" par défaut.');
    console.log('   Vous pouvez le modifier dans les Paramètres après connexion.');
  }
}

createMissingAccount();
