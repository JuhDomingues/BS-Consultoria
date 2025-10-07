import fetch from 'node-fetch';

const BASEROW_API_URL = 'https://api.baserow.io';
const BASEROW_TOKEN = 'of4oTI9DpOuTYITZvY59Kgtn2CwpCSo7';
const BASEROW_TABLE_ID = '693576';

async function deleteProperty(id) {
  try {
    const url = `${BASEROW_API_URL}/api/database/rows/table/${BASEROW_TABLE_ID}/${id}/`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Token ${BASEROW_TOKEN}`,
      },
    });

    if (!response.ok) {
      console.error(`Error deleting property ${id}: ${response.status}`);
      return false;
    }

    console.log(`✓ Deleted property ID: ${id}`);
    return true;
  } catch (error) {
    console.error(`Error deleting property ${id}:`, error.message);
    return false;
  }
}

async function main() {
  // Delete current imports (IDs 64-88)
  console.log('Deleting current properties (ID 64-88) to re-import with images...\n');

  let deletedCount = 0;

  for (let id = 64; id <= 88; id++) {
    const success = await deleteProperty(id);
    if (success) {
      deletedCount++;
    }
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n========== CLEANUP SUMMARY ==========`);
  console.log(`Properties deleted: ${deletedCount}`);
  console.log(`=====================================`);
}

main();
