import fs from 'fs';
import fetch from 'node-fetch';

const BASEROW_API_URL = 'https://api.baserow.io';
const BASEROW_TOKEN = 'of4oTI9DpOuTYITZvY59Kgtn2CwpCSo7';
const BASEROW_TABLE_ID = '693576';

// Read the processed properties JSON
const properties = JSON.parse(fs.readFileSync('./src/imoveis_processados.json', 'utf8'));

async function importProperty(property) {
  try {
    const url = `${BASEROW_API_URL}/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true`;

    // Extract city and neighborhood from location
    const locationParts = property.location?.split(',') || [];
    const neighborhood = locationParts[0]?.trim() || '';
    const city = locationParts[1]?.trim() || '';

    const data = {
      Title: property.title || '',
      Price: property.price || '',
      Type: property.type || '',
      Category: property.category || '',
      location: property.location || '',
      address: property.address || '',
      city: city,
      neighborhood: neighborhood,
      bedrooms: property.bedrooms || '',
      bathrooms: property.bathrooms || '',
      parkingSpaces: property.parkingSpaces || '',
      Area: property.area || '',
      description: property.description || '',
      images: property.images?.join('\n') || '',
      isExclusive: property.isExclusive || false,
      isFeatured: property.isFeatured || false,
      Active: true, // All imported properties are active by default
    };

    console.log(`Importing property: ${property.id} - ${property.title}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${BASEROW_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error importing property ${property.id}:`, errorText);
      return false;
    }

    const result = await response.json();
    console.log(`✓ Successfully imported: ${property.id} (Baserow ID: ${result.id})`);
    return true;
  } catch (error) {
    console.error(`Error importing property ${property.id}:`, error.message);
    return false;
  }
}

async function main() {
  console.log(`Starting import of ${properties.length} properties...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const property of properties) {
    const success = await importProperty(property);
    if (success) {
      successCount++;
    } else {
      errorCount++;
    }

    // Wait a bit between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n========== IMPORT SUMMARY ==========`);
  console.log(`Total properties: ${properties.length}`);
  console.log(`Successfully imported: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`====================================`);
}

main();
