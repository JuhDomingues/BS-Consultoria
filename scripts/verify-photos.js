/**
 * Script to verify photo sync between filesystem and Baserow
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const BASEROW_API_URL = process.env.VITE_BASEROW_API_URL;
const BASEROW_TOKEN = process.env.VITE_BASEROW_TOKEN;
const BASEROW_TABLE_ID = process.env.VITE_BASEROW_TABLE_ID;
const IMOVEIS_DIR = path.join(__dirname, '..', 'public', 'imoveis');

/**
 * Get all photos for a property ID from filesystem
 */
function getPhotosFromFilesystem(propertyId) {
  const propertyDir = path.join(IMOVEIS_DIR, propertyId.toString());

  if (!fs.existsSync(propertyDir)) {
    return [];
  }

  const files = fs.readdirSync(propertyDir);
  const imageFiles = files.filter(file =>
    /\.(jpg|jpeg|png|webp)$/i.test(file)
  );

  imageFiles.sort();
  return imageFiles.map(file => `/imoveis/${propertyId}/${file}`);
}

/**
 * Get all properties from Baserow
 */
async function getAllProperties() {
  try {
    const response = await fetch(
      `${BASEROW_API_URL}/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true`,
      {
        headers: {
          'Authorization': `Token ${BASEROW_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Baserow API error: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching properties:', error);
    return [];
  }
}

/**
 * Get all property folders from filesystem
 */
function getAllPropertyFolders() {
  if (!fs.existsSync(IMOVEIS_DIR)) {
    return [];
  }

  const folders = fs.readdirSync(IMOVEIS_DIR);
  return folders.filter(folder => {
    const folderPath = path.join(IMOVEIS_DIR, folder);
    return fs.statSync(folderPath).isDirectory();
  });
}

/**
 * Extract folder ID from image path
 */
function extractFolderIdFromImages(imagesString) {
  if (!imagesString) return null;

  const match = imagesString.match(/\/imoveis\/([^\/]+)\//);
  return match ? match[1] : null;
}

/**
 * Main verification function
 */
async function verifyPhotos() {
  console.log('🔍 Verificando sincronização de fotos...\n');
  console.log('='.repeat(80));

  // Get all property folders
  const propertyFolders = getAllPropertyFolders();
  console.log(`📁 Total de pastas em public/imoveis: ${propertyFolders.length}\n`);

  // Get all properties from Baserow
  const properties = await getAllProperties();
  console.log(`📊 Total de propriedades no Baserow: ${properties.length}\n`);
  console.log('='.repeat(80));

  let totalFilesystemPhotos = 0;
  let totalBaserowPhotos = 0;
  let needsSync = [];
  let synced = [];
  let foldersWithoutProperty = new Set(propertyFolders);

  // Check each property in Baserow
  for (const property of properties) {
    const baserowImages = property['images'] || '';
    const folderId = extractFolderIdFromImages(baserowImages);

    if (!folderId) {
      continue; // Skip properties without folder ID
    }

    // Remove from "not in Baserow" set
    foldersWithoutProperty.delete(folderId);

    const title = property['Title'] || property['Título'] || `Imóvel ${property.id}`;
    const filesystemPhotos = getPhotosFromFilesystem(folderId);
    const baserowPhotos = baserowImages ? baserowImages.split('\n').filter(i => i.trim()) : [];

    totalBaserowPhotos += baserowPhotos.length;

    if (filesystemPhotos.length === 0) {
      continue; // Skip if no photos in filesystem
    }

    totalFilesystemPhotos += filesystemPhotos.length;

    if (filesystemPhotos.length !== baserowPhotos.length) {
      needsSync.push({
        id: folderId,
        baserowId: property.id,
        title,
        filesystemCount: filesystemPhotos.length,
        baserowCount: baserowPhotos.length,
        diff: filesystemPhotos.length - baserowPhotos.length
      });
    } else {
      synced.push({
        id: folderId,
        baserowId: property.id,
        title,
        photoCount: filesystemPhotos.length
      });
    }
  }

  // Count photos in folders without properties
  const notInBaserow = Array.from(foldersWithoutProperty).map(folderId => ({
    id: folderId,
    photoCount: getPhotosFromFilesystem(folderId).length
  }));

  // Display results
  console.log('\n📊 RESUMO GERAL');
  console.log('='.repeat(80));
  console.log(`📸 Total de fotos no filesystem: ${totalFilesystemPhotos}`);
  console.log(`📸 Total de fotos no Baserow: ${totalBaserowPhotos}`);
  console.log(`📁 Pastas sem propriedade no Baserow: ${notInBaserow.length}`);
  console.log(`✅ Propriedades sincronizadas: ${synced.length}`);
  console.log(`⚠️  Propriedades que precisam sincronizar: ${needsSync.length}`);

  if (synced.length > 0) {
    console.log('\n✅ PROPRIEDADES SINCRONIZADAS:');
    console.log('='.repeat(80));
    synced.forEach(item => {
      console.log(`${item.title} (Baserow ID: ${item.baserowId}, Pasta: ${item.id}) - ${item.photoCount} fotos`);
    });
  }

  if (needsSync.length > 0) {
    console.log('\n⚠️  PROPRIEDADES QUE PRECISAM SINCRONIZAR:');
    console.log('='.repeat(80));
    needsSync.forEach(item => {
      console.log(`\nBaserow ID: ${item.baserowId}, Pasta: ${item.id}`);
      console.log(`Título: ${item.title}`);
      console.log(`Filesystem: ${item.filesystemCount} fotos`);
      console.log(`Baserow: ${item.baserowCount} fotos`);
      console.log(`Diferença: ${item.diff > 0 ? '+' : ''}${item.diff} fotos`);
    });
  }

  if (notInBaserow.length > 0) {
    console.log('\n📁 PASTAS SEM PROPRIEDADE NO BASEROW:');
    console.log('='.repeat(80));
    notInBaserow.forEach(item => {
      console.log(`ID: ${item.id} - ${item.photoCount} fotos`);
    });
  }

  console.log('\n' + '='.repeat(80));
  if (needsSync.length === 0 && notInBaserow.length === 0) {
    console.log('✅ Todas as fotos estão sincronizadas!');
  } else {
    console.log('⚠️  Execute "npm run sync-photos" para sincronizar as fotos');
  }
  console.log('='.repeat(80));
}

verifyPhotos().catch(console.error);
