/**
 * Script to analyze image quality and identify low-quality images
 * Checks: file size, dimensions, and file format
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import sizeOf from 'image-size';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IMOVEIS_DIR = path.join(__dirname, '..', 'public', 'imoveis');

// Quality thresholds
const MIN_FILE_SIZE = 10 * 1024; // 10 KB - very small images are usually low quality
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB - extremely large files
const MIN_WIDTH = 400; // Minimum width in pixels
const MIN_HEIGHT = 400; // Minimum height in pixels
const PREFERRED_MIN_WIDTH = 800; // Preferred minimum width
const PREFERRED_MIN_HEIGHT = 600; // Preferred minimum height

/**
 * Analyze a single image
 */
function analyzeImage(imagePath) {
  const stats = fs.statSync(imagePath);
  const fileSize = stats.size;

  let dimensions = null;
  let issues = [];

  try {
    dimensions = sizeOf(imagePath);
  } catch (error) {
    issues.push('Erro ao ler dimensões');
    return { fileSize, dimensions: null, issues, quality: 'error' };
  }

  // Check file size
  if (fileSize < MIN_FILE_SIZE) {
    issues.push(`Arquivo muito pequeno (${(fileSize / 1024).toFixed(1)} KB)`);
  }
  if (fileSize > MAX_FILE_SIZE) {
    issues.push(`Arquivo muito grande (${(fileSize / 1024 / 1024).toFixed(1)} MB)`);
  }

  // Check dimensions
  if (dimensions) {
    if (dimensions.width < MIN_WIDTH || dimensions.height < MIN_HEIGHT) {
      issues.push(`Resolução muito baixa (${dimensions.width}x${dimensions.height})`);
    } else if (dimensions.width < PREFERRED_MIN_WIDTH || dimensions.height < PREFERRED_MIN_HEIGHT) {
      issues.push(`Resolução abaixo do ideal (${dimensions.width}x${dimensions.height})`);
    }

    // Check aspect ratio (very extreme ratios might be problematic)
    const aspectRatio = dimensions.width / dimensions.height;
    if (aspectRatio < 0.5 || aspectRatio > 2.5) {
      issues.push(`Proporção incomum (${aspectRatio.toFixed(2)}:1)`);
    }
  }

  // Determine quality level
  let quality = 'good';
  if (issues.some(i => i.includes('muito pequeno') || i.includes('muito baixa'))) {
    quality = 'poor';
  } else if (issues.length > 0) {
    quality = 'medium';
  }

  return {
    fileSize,
    dimensions,
    issues,
    quality
  };
}

/**
 * Analyze all images in all property folders
 */
function analyzeAllImages() {
  console.log('🔍 Analisando qualidade das imagens...\n');
  console.log('='.repeat(80));

  if (!fs.existsSync(IMOVEIS_DIR)) {
    console.log('❌ Pasta imoveis não encontrada');
    return;
  }

  const folders = fs.readdirSync(IMOVEIS_DIR).filter(folder => {
    const folderPath = path.join(IMOVEIS_DIR, folder);
    return fs.statSync(folderPath).isDirectory();
  });

  let totalImages = 0;
  let poorQuality = [];
  let mediumQuality = [];
  let goodQuality = [];
  let errors = [];

  for (const folderId of folders) {
    const folderPath = path.join(IMOVEIS_DIR, folderId);
    const files = fs.readdirSync(folderPath);

    const imageFiles = files.filter(file =>
      /\.(jpg|jpeg|png|webp)$/i.test(file)
    );

    for (const imageFile of imageFiles) {
      const imagePath = path.join(folderPath, imageFile);
      const relativePath = `/imoveis/${folderId}/${imageFile}`;

      const analysis = analyzeImage(imagePath);
      totalImages++;

      const imageInfo = {
        path: relativePath,
        file: imageFile,
        folderId,
        ...analysis
      };

      if (analysis.quality === 'error') {
        errors.push(imageInfo);
      } else if (analysis.quality === 'poor') {
        poorQuality.push(imageInfo);
      } else if (analysis.quality === 'medium') {
        mediumQuality.push(imageInfo);
      } else {
        goodQuality.push(imageInfo);
      }
    }
  }

  // Display results
  console.log(`\n📊 RESUMO DA ANÁLISE`);
  console.log('='.repeat(80));
  console.log(`📸 Total de imagens analisadas: ${totalImages}`);
  console.log(`✅ Boa qualidade: ${goodQuality.length} (${((goodQuality.length / totalImages) * 100).toFixed(1)}%)`);
  console.log(`⚠️  Qualidade média: ${mediumQuality.length} (${((mediumQuality.length / totalImages) * 100).toFixed(1)}%)`);
  console.log(`❌ Baixa qualidade: ${poorQuality.length} (${((poorQuality.length / totalImages) * 100).toFixed(1)}%)`);
  console.log(`💥 Erros: ${errors.length}`);

  if (poorQuality.length > 0) {
    console.log(`\n❌ IMAGENS DE BAIXA QUALIDADE (${poorQuality.length}):`);
    console.log('='.repeat(80));

    // Group by folder
    const byFolder = {};
    poorQuality.forEach(img => {
      if (!byFolder[img.folderId]) {
        byFolder[img.folderId] = [];
      }
      byFolder[img.folderId].push(img);
    });

    Object.keys(byFolder).sort().forEach(folderId => {
      console.log(`\n📁 Pasta: ${folderId}`);
      byFolder[folderId].forEach(img => {
        const size = img.dimensions
          ? `${img.dimensions.width}x${img.dimensions.height}`
          : 'N/A';
        const fileSize = `${(img.fileSize / 1024).toFixed(1)} KB`;
        console.log(`   ${img.file}`);
        console.log(`      Tamanho: ${fileSize}, Dimensões: ${size}`);
        console.log(`      Problemas: ${img.issues.join(', ')}`);
      });
    });
  }

  if (mediumQuality.length > 0) {
    console.log(`\n⚠️  IMAGENS DE QUALIDADE MÉDIA (${mediumQuality.length}):`);
    console.log('='.repeat(80));

    // Group by folder
    const byFolder = {};
    mediumQuality.forEach(img => {
      if (!byFolder[img.folderId]) {
        byFolder[img.folderId] = [];
      }
      byFolder[img.folderId].push(img);
    });

    Object.keys(byFolder).sort().forEach(folderId => {
      console.log(`\n📁 Pasta: ${folderId}`);
      byFolder[folderId].forEach(img => {
        const size = img.dimensions
          ? `${img.dimensions.width}x${img.dimensions.height}`
          : 'N/A';
        const fileSize = `${(img.fileSize / 1024).toFixed(1)} KB`;
        console.log(`   ${img.file}`);
        console.log(`      Tamanho: ${fileSize}, Dimensões: ${size}`);
        console.log(`      Problemas: ${img.issues.join(', ')}`);
      });
    });
  }

  if (errors.length > 0) {
    console.log(`\n💥 ERROS AO PROCESSAR (${errors.length}):`);
    console.log('='.repeat(80));
    errors.forEach(img => {
      console.log(`${img.path}: ${img.issues.join(', ')}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('💡 Dica: Revise as imagens de baixa qualidade e considere removê-las ou substituí-las.');
  console.log('='.repeat(80));

  // Return data for potential batch removal
  return {
    poorQuality,
    mediumQuality,
    goodQuality,
    errors,
    totalImages
  };
}

// Run analysis
analyzeAllImages();
