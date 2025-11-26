interface BaserowProperty {
  id: number;
  [key: string]: any;
}

interface BaserowResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: BaserowProperty[];
}

interface Property {
  id: string;
  title: string;
  price: string;
  type: string;
  category: string;
  location: string;
  address: string;
  city: string;
  neighborhood: string;
  bedrooms: string;
  bathrooms: string;
  parkingSpaces: string;
  area: string;
  description: string;
  images: string[];
  isExclusive: boolean;
  isFeatured: boolean;
  active: boolean;
}

import { getApiUrl } from '@/utils/api';

// Backend API URL - All Baserow requests now go through our secure backend
const BACKEND_API_URL = getApiUrl();

/**
 * Fetch all properties from Baserow (via secure backend)
 */
export async function fetchProperties(): Promise<Property[]> {
  try {
    const url = `${BACKEND_API_URL}/api/baserow/properties`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }

    const data: BaserowResponse = await response.json();

    console.log('Raw Baserow data:', data.results);

    // Transform Baserow data to our Property format
    const transformed = data.results.map((item) => transformBaserowToProperty(item));

    console.log('Transformed properties:', transformed);

    // Filter only active properties
    const activeProperties = transformed.filter((item) => item.active === true);

    console.log('Active properties:', activeProperties.length, activeProperties);

    return activeProperties;
  } catch (error) {
    console.error('Error fetching properties from Baserow:', error);
    throw error;
  }
}

/**
 * Transform Baserow row to Property object
 */
function transformBaserowToProperty(item: BaserowProperty): Property {
  // Parse images field (comma-separated or newline-separated)
  let images: string[] = [];
  const imagesField = item.images || item.Images || '';
  if (imagesField) {
    images = imagesField
      .split(/[\n,]+/)
      .map((img: string) => img.trim())
      .filter((img: string) => img.length > 0);
  }

  // Extract value from select field objects (Type and Category can be objects with {id, value, color})
  const getSelectValue = (field: any): string => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    if (typeof field === 'object' && field.value) return field.value;
    return '';
  };

  // Handle both lowercase and capitalized field names from Baserow
  return {
    id: item.id?.toString() || '',
    title: item.title || item.Title || '',
    price: item.price || item.Price || '',
    type: getSelectValue(item.type || item.Type),
    category: getSelectValue(item.category || item.Category),
    location: item.location || item.Location || '',
    address: item.address || item.Address || '',
    city: item.city || item.City || '',
    neighborhood: item.neighborhood || item.Neighborhood || '',
    bedrooms: (item.bedrooms || item.Bedrooms) ? parseInt(item.bedrooms || item.Bedrooms) : undefined,
    bathrooms: (item.bathrooms || item.Bathrooms) ? parseInt(item.bathrooms || item.Bathrooms) : undefined,
    parkingSpaces: item.parkingSpaces || item.ParkingSpaces || '',
    area: (item.area || item.Area) ? parseFloat((item.area || item.Area).toString().replace(',', '.')) : undefined,
    description: item.description || item.Description || '',
    images: images,
    isExclusive: (item.isExclusive || item.IsExclusive) === true,
    isFeatured: (item.isFeatured || item.IsFeatured) === true,
    active: (item.active || item.Active) !== false, // Default to true if not specified
  };
}

/**
 * Fetch a single property by ID (via secure backend)
 */
export async function fetchPropertyById(id: string): Promise<Property | null> {
  try {
    const url = `${BACKEND_API_URL}/api/baserow/properties/${id}`;

    console.log(`Fetching property by ID: ${id}`);

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Property ${id} not found (404)`);
        return null;
      }
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }

    const data: BaserowProperty = await response.json();
    console.log(`Raw property data for ID ${id}:`, data);

    const transformed = transformBaserowToProperty(data);
    console.log(`Transformed property:`, transformed);

    // Only return if active
    if (transformed.active !== true) {
      console.log(`Property ${id} is inactive, returning null`);
      return null;
    }

    return transformed;
  } catch (error) {
    console.error(`Error fetching property ${id} from Baserow:`, error);
    throw error;
  }
}

/**
 * Create a new property in Baserow (via secure backend)
 */
export async function createProperty(propertyData: Partial<Property>): Promise<Property> {
  try {
    const url = `${BACKEND_API_URL}/api/baserow/properties`;

    // Transform Property to Baserow format
    // Note: Don't include 'id' as Baserow auto-generates it
    // Use city, neighborhood, and address from AI if available, otherwise extract from location
    let city = propertyData.city || '';
    let neighborhood = propertyData.neighborhood || '';
    let address = propertyData.address || '';

    // Fallback: extract from location if city/neighborhood not provided
    if (!city || !neighborhood) {
      const locationParts = propertyData.location?.split(',') || [];
      if (!neighborhood) neighborhood = locationParts[0]?.trim() || '';
      if (!city) city = locationParts[1]?.trim() || '';
    }

    const baserowData: any = {
      Title: propertyData.title || '',
      Price: propertyData.price || '',
      Type: propertyData.type || '',
      Category: propertyData.category || '',
      location: propertyData.location || '',
      address: address,
      city: city,
      neighborhood: neighborhood,
      bedrooms: propertyData.bedrooms?.toString() || '',
      bathrooms: propertyData.bathrooms?.toString() || '',
      parkingSpaces: propertyData.parkingSpaces || '',
      Area: propertyData.area?.toString().replace('.', ',') || '',
      description: propertyData.description || '',
      images: propertyData.images?.join('\n') || '',
      isExclusive: propertyData.isExclusive || false,
      isFeatured: propertyData.isFeatured || false,
      Active: true, // New properties are active by default
    };

    console.log('=== Creating Property in Baserow ===');
    console.log('Input propertyData.city:', propertyData.city);
    console.log('Input propertyData.neighborhood:', propertyData.neighborhood);
    console.log('Input propertyData.address:', propertyData.address);
    console.log('Final city to save:', city);
    console.log('Final neighborhood to save:', neighborhood);
    console.log('Final address to save:', address);
    console.log('Complete Baserow data:', baserowData);
    console.log('====================================');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(baserowData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend API error response:', errorText);
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }

    const data: BaserowProperty = await response.json();
    console.log('Property created successfully:', data);
    return transformBaserowToProperty(data);
  } catch (error) {
    console.error('Error creating property in Baserow:', error);
    throw error;
  }
}

/**
 * Update an existing property in Baserow (via secure backend)
 */
export async function updateProperty(id: string, propertyData: Partial<Property>): Promise<Property> {
  try {
    const url = `${BACKEND_API_URL}/api/baserow/properties/${id}`;

    // Transform Property to Baserow format
    const baserowData: any = {};

    if (propertyData.title !== undefined) baserowData.Title = propertyData.title;
    if (propertyData.price !== undefined) baserowData.Price = propertyData.price;
    if (propertyData.type !== undefined) baserowData.Type = propertyData.type;
    if (propertyData.category !== undefined) baserowData.Category = propertyData.category;
    if (propertyData.location !== undefined) {
      baserowData.location = propertyData.location;
    }
    // Handle city, neighborhood, and address separately if provided
    if (propertyData.city !== undefined) {
      baserowData.city = propertyData.city;
    } else if (propertyData.location !== undefined) {
      // Fallback: extract city from location
      const locationParts = propertyData.location?.split(',') || [];
      baserowData.city = locationParts[1]?.trim() || '';
    }
    if (propertyData.neighborhood !== undefined) {
      baserowData.neighborhood = propertyData.neighborhood;
    } else if (propertyData.location !== undefined) {
      // Fallback: extract neighborhood from location
      const locationParts = propertyData.location?.split(',') || [];
      baserowData.neighborhood = locationParts[0]?.trim() || '';
    }
    if (propertyData.address !== undefined) {
      baserowData.address = propertyData.address;
    }
    if (propertyData.bedrooms !== undefined) baserowData.bedrooms = propertyData.bedrooms.toString();
    if (propertyData.bathrooms !== undefined) baserowData.bathrooms = propertyData.bathrooms.toString();
    if (propertyData.parkingSpaces !== undefined) baserowData.parkingSpaces = propertyData.parkingSpaces;
    if (propertyData.area !== undefined) baserowData.Area = propertyData.area.toString().replace('.', ',');
    if (propertyData.description !== undefined) baserowData.description = propertyData.description;
    if (propertyData.images !== undefined) baserowData.images = propertyData.images.join('\n');
    if (propertyData.isExclusive !== undefined) baserowData.isExclusive = propertyData.isExclusive;
    if (propertyData.isFeatured !== undefined) baserowData.isFeatured = propertyData.isFeatured;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(baserowData),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }

    const data: BaserowProperty = await response.json();
    return transformBaserowToProperty(data);
  } catch (error) {
    console.error(`Error updating property ${id} in Baserow:`, error);
    throw error;
  }
}

/**
 * Delete a property from Baserow (via secure backend)
 */
export async function deleteProperty(id: string): Promise<void> {
  try {
    const url = `${BACKEND_API_URL}/api/baserow/properties/${id}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Error deleting property ${id} from Baserow:`, error);
    throw error;
  }
}

/**
 * Toggle active status of a property (via secure backend)
 */
export async function togglePropertyActive(id: string, active: boolean): Promise<Property> {
  try {
    const url = `${BACKEND_API_URL}/api/baserow/properties/${id}`;

    console.log(`Toggling property ${id} to active=${active}`);

    // Try both field name formats to ensure compatibility
    const updateData: any = {
      active: active,
      Active: active, // Try capitalized version too
    };

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Toggle active error response:', errorText);
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }

    const data: BaserowProperty = await response.json();
    console.log('Property toggled successfully:', data);
    return transformBaserowToProperty(data);
  } catch (error) {
    console.error(`Error toggling property ${id} active status:`, error);
    throw error;
  }
}

/**
 * Fetch all properties including inactive ones (for admin panel - via secure backend)
 */
export async function fetchAllPropertiesAdmin(): Promise<Property[]> {
  try {
    const url = `${BACKEND_API_URL}/api/baserow/properties`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }

    const data: BaserowResponse = await response.json();

    // Return all properties, including inactive ones
    return data.results.map((item) => transformBaserowToProperty(item));
  } catch (error) {
    console.error('Error fetching all properties from Baserow:', error);
    throw error;
  }
}

/**
 * Move images from temporary folder to property folder with real ID
 */
export async function movePropertyImages(tempId: string, realId: string): Promise<string[]> {
  try {
    // Use production API URL if available
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const moveUrl = `${apiUrl}/api/move-images`;

    console.log(`Moving images from ${tempId} to ${realId}...`);

    const response = await fetch(moveUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tempId, realId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Move images error:', errorText);
      throw new Error(`Failed to move images: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Images moved successfully:`, data);

    return data.newUrls || [];
  } catch (error) {
    console.error('Error moving property images:', error);
    throw error;
  }
}
