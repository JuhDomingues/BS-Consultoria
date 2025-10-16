/**
 * Script to sync photos from public/imoveis to Baserow
 * Updates each property with ALL available photos
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const BASEROW_API_URL = process.env.VITE_BASEROW_API_URL;
const BASEROW_TOKEN = process.env.VITE_BASEROW_TOKEN;
const BASEROW_TABLE_ID = process.env.VITE_BASEROW_TABLE_ID;
const IMOVEIS_DIR = path.join(__dirname, '..', 'public', 'imoveis');

/**
 * Get all photos for a property ID
 */
function getPhotosForProperty(propertyId) {
  const propertyDir = path.join(IMOVEIS_DIR, propertyId.toString());

  if (!fs.existsSync(propertyDir)) {
    return [];
  }

  const files = fs.readdirSync(propertyDir);
  const imageFiles = files.filter(file =>
    /\.(jpg|jpeg|png|webp)$/i.test(file)
  );

  // Sort to ensure consistent ordering
  imageFiles.sort();

  // Return paths relative to public folder
  return imageFiles.map(file => `/imoveis/${propertyId}/${file}`);
}

/**
 * Fetch all properties from Baserow
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
 * Update property images in Baserow
 */
async function updatePropertyImages(propertyId, images) {
  try {
    const imagesString = images.join('\n');

    const response = await fetch(
      `${BASEROW_API_URL}/api/database/rows/table/${BASEROW_TABLE_ID}/${propertyId}/?user_field_names=true`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Token ${BASEROW_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: imagesString
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Baserow API error: ${response.status} - ${errorText}`);
    }

    return true;
  } catch (error) {
    console.error(`Error updating property ${propertyId}:`, error);
    return false;
  }
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
 * Main sync function
 */
async function syncPhotos() {
  console.log('🔄 Starting photo sync...\n');

  // Get all properties from Baserow
  const properties = await getAllProperties();
  console.log(`📊 Found ${properties.length} properties in Baserow\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let noFolder = 0;

  for (const property of properties) {
    const baserowId = property.id;
    const title = property['Title'] || property['Título'] || property.title || 'Sem título';

    // Get current images from Baserow
    const currentImages = property['images'] || '';

    // Extract folder ID from existing images
    const folderId = extractFolderIdFromImages(currentImages);

    if (!folderId) {
      console.log(`⚠️  ${title} (ID: ${baserowId}) - Sem ID de pasta nas imagens`);
      noFolder++;
      continue;
    }

    // Get photos from filesystem using the folder ID
    const photos = getPhotosForProperty(folderId);

    if (photos.length === 0) {
      console.log(`⏭️  ${title} (ID: ${baserowId}, Pasta: ${folderId}) - Sem fotos no filesystem`);
      skipped++;
      continue;
    }

    const currentImageCount = currentImages ? currentImages.split('\n').filter(i => i.trim()).length : 0;

    if (photos.length === currentImageCount && currentImages.includes(photos[0])) {
      console.log(`✅ ${title} (ID: ${baserowId}, Pasta: ${folderId}) - Já atualizado (${photos.length} fotos)`);
      skipped++;
      continue;
    }

    // Update Baserow
    const success = await updatePropertyImages(baserowId, photos);

    if (success) {
      console.log(`✅ ${title} (ID: ${baserowId}, Pasta: ${folderId}) - Atualizado: ${currentImageCount} → ${photos.length} fotos`);
      updated++;
    } else {
      console.log(`❌ ${title} (ID: ${baserowId}, Pasta: ${folderId}) - Erro ao atualizar`);
      errors++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 RESUMO DA SINCRONIZAÇÃO`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Atualizados: ${updated}`);
  console.log(`⏭️  Pulados: ${skipped}`);
  console.log(`⚠️  Sem pasta: ${noFolder}`);
  console.log(`❌ Erros: ${errors}`);
  console.log(`📍 Total: ${properties.length}`);
}

// Run sync
syncPhotos().catch(console.error);
