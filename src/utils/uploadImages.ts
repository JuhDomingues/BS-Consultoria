/**
 * Upload images to the public/imoveis folder
 */
export async function uploadPropertyImages(
  propertyId: string,
  files: File[]
): Promise<string[]> {
  const uploadedUrls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `image_${i + 1}.${fileExtension}`;

    try {
      // Create FormData for the upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('propertyId', propertyId);
      formData.append('fileName', fileName);

      // Upload to our API endpoint
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed for ${file.name}`);
      }

      const data = await response.json();
      uploadedUrls.push(data.url);
    } catch (error) {
      console.error(`Error uploading ${file.name}:`, error);
      throw error;
    }
  }

  return uploadedUrls;
}

/**
 * Delete an image from the server
 */
export async function deletePropertyImage(imageUrl: string): Promise<void> {
  try {
    const response = await fetch('/api/delete-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete image');
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
}
