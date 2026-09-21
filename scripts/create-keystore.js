import forge from 'node-forge';
import fs from 'fs';
import path from 'path';

console.log('Generating 2048-bit RSA keypair for permanent FasoCarnet keystore...');
const keys = forge.pki.rsa.generateKeyPair(2048);

const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01' + Date.now().toString(16);
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 25);

const attrs = [
  { name: 'commonName', value: 'FasoCarnet' },
  { name: 'organizationName', value: 'FasoCarnet' },
  { name: 'organizationalUnitName', value: 'Mobile' },
  { name: 'countryName', value: 'BF' },
  { name: 'localityName', value: 'Ouagadougou' },
  { name: 'stateOrProvinceName', value: 'Kadiogo' }
];

cert.setSubject(attrs);
cert.setIssuer(attrs);
cert.sign(keys.privateKey, forge.md.sha256.create());

const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
  keys.privateKey,
  [cert],
  'fasocarnet2026',
  {
    algorithm: '3des',
    friendlyName: 'fasocarnet',
    generateLocalKeyId: true
  }
);

const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
const targetPath = path.resolve('android/app/fasocarnet-release.keystore');
fs.writeFileSync(targetPath, Buffer.from(p12Der, 'binary'));

console.log('✓ Keystore created successfully at:', targetPath, 'size:', fs.statSync(targetPath).size, 'bytes');
