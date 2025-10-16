/**
 * Script to remove low-quality images and resync with Baserow
 * Removes images smaller than 10KB (very low quality)
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

const MIN_FILE_SIZE = 10 * 1024; // 10 KB minimum

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

  imageFiles.sort();
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
 * Remove low-quality images from filesystem
 */
function removeLowQualityImages() {
  console.log('🗑️  Removendo imagens de baixa qualidade...\n');
  console.log('='.repeat(80));

  if (!fs.existsSync(IMOVEIS_DIR)) {
    console.log('❌ Pasta imoveis não encontrada');
    return { removed: 0, folders: [] };
  }

  const folders = fs.readdirSync(IMOVEIS_DIR).filter(folder => {
    const folderPath = path.join(IMOVEIS_DIR, folder);
    return fs.statSync(folderPath).isDirectory();
  });

  let totalRemoved = 0;
  const affectedFolders = [];

  for (const folderId of folders) {
    const folderPath = path.join(IMOVEIS_DIR, folderId);
    const files = fs.readdirSync(folderPath);

    const imageFiles = files.filter(file =>
      /\.(jpg|jpeg|png|webp)$/i.test(file)
    );

    let removedInFolder = 0;
    const removedFiles = [];

    for (const imageFile of imageFiles) {
      const imagePath = path.join(folderPath, imageFile);
      const fileStats = fs.statSync(imagePath);

      if (fileStats.size < MIN_FILE_SIZE) {
        fs.unlinkSync(imagePath);
        removedFiles.push({
          file: imageFile,
          size: (fileStats.size / 1024).toFixed(1)
        });
        removedInFolder++;
        totalRemoved++;
      }
    }

    if (removedInFolder > 0) {
      affectedFolders.push({
        id: folderId,
        removed: removedInFolder,
        files: removedFiles
      });

      console.log(`📁 Pasta: ${folderId}`);
      console.log(`   Removidas: ${removedInFolder} imagens`);
      removedFiles.forEach(f => {
        console.log(`      - ${f.file} (${f.size} KB)`);
      });
      console.log('');
    }
  }

  console.log('='.repeat(80));
  console.log(`✅ Total removido: ${totalRemoved} imagens de baixa qualidade\n`);

  return { removed: totalRemoved, folders: affectedFolders };
}

/**
 * Main function
 */
async function main() {
  console.log('🧹 Iniciando limpeza de imagens de baixa qualidade...\n');

  // Step 1: Remove low-quality images
  const cleanupResult = removeLowQualityImages();

  if (cleanupResult.removed === 0) {
    console.log('✅ Nenhuma imagem de baixa qualidade encontrada!');
    return;
  }

  // Step 2: Resync with Baserow
  console.log('\n🔄 Ressincronizando com Baserow...\n');

  const properties = await getAllProperties();
  let updated = 0;
  let errors = 0;

  for (const property of properties) {
    const baserowId = property.id;
    const title = property['Title'] || property['Título'] || property.title || 'Sem título';
    const currentImages = property['images'] || '';
    const folderId = extractFolderIdFromImages(currentImages);

    if (!folderId) continue;

    // Check if this folder was affected
    const wasAffected = cleanupResult.folders.some(f => f.id === folderId);
    if (!wasAffected) continue;

    // Get updated photos from filesystem
    const photos = getPhotosForProperty(folderId);

    if (photos.length === 0) {
      console.log(`⚠️  ${title} (ID: ${baserowId}) - Todas as fotos foram removidas`);
      continue;
    }

    // Update Baserow
    const success = await updatePropertyImages(baserowId, photos);

    if (success) {
      const beforeCount = currentImages.split('\n').filter(i => i.trim()).length;
      console.log(`✅ ${title} (ID: ${baserowId}) - Atualizado: ${beforeCount} → ${photos.length} fotos`);
      updated++;
    } else {
      console.log(`❌ ${title} (ID: ${baserowId}) - Erro ao atualizar`);
      errors++;
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 RESUMO FINAL`);
  console.log(`${'='.repeat(60)}`);
  console.log(`🗑️  Imagens removidas: ${cleanupResult.removed}`);
  console.log(`✅ Propriedades atualizadas: ${updated}`);
  console.log(`❌ Erros: ${errors}`);
  console.log(`${'='.repeat(60)}`);
}

main().catch(console.error);
