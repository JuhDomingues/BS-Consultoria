/**
 * Script to analyze image file sizes and identify potential low-quality images
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IMOVEIS_DIR = path.join(__dirname, '..', 'public', 'imoveis');

// Quality thresholds based on file size
const VERY_SMALL = 10 * 1024; // < 10 KB - likely low quality
const SMALL = 50 * 1024; // < 50 KB - possibly low quality
const GOOD_MIN = 100 * 1024; // > 100 KB - likely good quality
const VERY_LARGE = 5 * 1024 * 1024; // > 5 MB - possibly too large

/**
 * Analyze all images in all property folders
 */
function analyzeImageSizes() {
  console.log('🔍 Analisando tamanhos de arquivo das imagens...\n');
  console.log('='.repeat(80));

  if (!fs.existsSync(IMOVEIS_DIR)) {
    console.log('❌ Pasta imoveis não encontrada');
    return;
  }

  const folders = fs.readdirSync(IMOVEIS_DIR).filter(folder => {
    const folderPath = path.join(IMOVEIS_DIR, folder);
    return fs.statSync(folderPath).isDirectory();
  });

  const stats = {
    verySmall: [],
    small: [],
    good: [],
    veryLarge: [],
    totalSize: 0,
    totalCount: 0
  };

  for (const folderId of folders) {
    const folderPath = path.join(IMOVEIS_DIR, folderId);
    const files = fs.readdirSync(folderPath);

    const imageFiles = files.filter(file =>
      /\.(jpg|jpeg|png|webp)$/i.test(file)
    );

    for (const imageFile of imageFiles) {
      const imagePath = path.join(folderPath, imageFile);
      const fileStats = fs.statSync(imagePath);
      const fileSize = fileStats.size;
      const relativePath = `/imoveis/${folderId}/${imageFile}`;

      stats.totalSize += fileSize;
      stats.totalCount++;

      const imageInfo = {
        path: relativePath,
        file: imageFile,
        folderId,
        size: fileSize,
        sizeKB: (fileSize / 1024).toFixed(1),
        sizeMB: (fileSize / 1024 / 1024).toFixed(2)
      };

      if (fileSize < VERY_SMALL) {
        stats.verySmall.push(imageInfo);
      } else if (fileSize < SMALL) {
        stats.small.push(imageInfo);
      } else if (fileSize > VERY_LARGE) {
        stats.veryLarge.push(imageInfo);
      } else {
        stats.good.push(imageInfo);
      }
    }
  }

  // Display results
  console.log(`\n📊 RESUMO DA ANÁLISE`);
  console.log('='.repeat(80));
  console.log(`📸 Total de imagens: ${stats.totalCount}`);
  console.log(`💾 Tamanho total: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📏 Tamanho médio: ${(stats.totalSize / stats.totalCount / 1024).toFixed(1)} KB`);
  console.log('');
  console.log(`✅ Boa qualidade (> 50 KB): ${stats.good.length} (${((stats.good.length / stats.totalCount) * 100).toFixed(1)}%)`);
  console.log(`⚠️  Pequenas (10-50 KB): ${stats.small.length} (${((stats.small.length / stats.totalCount) * 100).toFixed(1)}%)`);
  console.log(`❌ Muito pequenas (< 10 KB): ${stats.verySmall.length} (${((stats.verySmall.length / stats.totalCount) * 100).toFixed(1)}%)`);
  console.log(`📦 Muito grandes (> 5 MB): ${stats.veryLarge.length} (${((stats.veryLarge.length / stats.totalCount) * 100).toFixed(1)}%)`);

  if (stats.verySmall.length > 0) {
    console.log(`\n❌ IMAGENS MUITO PEQUENAS - PROVAVELMENTE BAIXA QUALIDADE (${stats.verySmall.length}):`);
    console.log('='.repeat(80));

    // Group by folder
    const byFolder = {};
    stats.verySmall.forEach(img => {
      if (!byFolder[img.folderId]) {
        byFolder[img.folderId] = [];
      }
      byFolder[img.folderId].push(img);
    });

    Object.keys(byFolder).sort().forEach(folderId => {
      console.log(`\n📁 Pasta: ${folderId} (${byFolder[folderId].length} imagens)`);
      byFolder[folderId].forEach(img => {
        console.log(`   ${img.file} - ${img.sizeKB} KB`);
      });
    });

    console.log('\n💡 Recomendação: Essas imagens são muito pequenas e provavelmente têm baixa qualidade.');
    console.log('   Considere removê-las ou substituí-las por versões de melhor qualidade.');
  }

  if (stats.small.length > 0) {
    console.log(`\n⚠️  IMAGENS PEQUENAS - POSSIVELMENTE BAIXA QUALIDADE (${stats.small.length}):`);
    console.log('='.repeat(80));

    // Group by folder
    const byFolder = {};
    stats.small.forEach(img => {
      if (!byFolder[img.folderId]) {
        byFolder[img.folderId] = [];
      }
      byFolder[img.folderId].push(img);
    });

    Object.keys(byFolder).sort().forEach(folderId => {
      console.log(`\n📁 Pasta: ${folderId} (${byFolder[folderId].length} imagens)`);
      byFolder[folderId]
        .sort((a, b) => a.size - b.size)
        .forEach(img => {
          console.log(`   ${img.file} - ${img.sizeKB} KB`);
        });
    });

    console.log('\n💡 Recomendação: Revise estas imagens manualmente para verificar a qualidade.');
  }

  if (stats.veryLarge.length > 0) {
    console.log(`\n📦 IMAGENS MUITO GRANDES (${stats.veryLarge.length}):`);
    console.log('='.repeat(80));
    stats.veryLarge
      .sort((a, b) => b.size - a.size)
      .forEach(img => {
        console.log(`${img.path} - ${img.sizeMB} MB`);
      });

    console.log('\n💡 Recomendação: Considere comprimir estas imagens para melhorar o desempenho do site.');
  }

  console.log('\n' + '='.repeat(80));

  return stats;
}

// Run analysis
const results = analyzeImageSizes();
