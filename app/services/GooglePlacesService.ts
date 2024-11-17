interface GooglePlaceDetails {
  name: string;
  rating: number;
  user_ratings_total: number;
  formatted_address: string;
  photos: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  price_level?: number;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export class GooglePlacesService {
  static async getPlaceDetails(placeId: string): Promise<GooglePlaceDetails | null> {
    try {
      const response = await fetch(`/api/places/details?placeId=${placeId}`);
      if (!response.ok) throw new Error('Failed to fetch place details');
      return await response.json();
    } catch (error) {
      console.error(`Error fetching place details for ${placeId}:`, error);
      return null;
    }
  }

  static async getPlacesDetails(placeIds: string[]): Promise<Map<string, GooglePlaceDetails>> {
    const placesMap = new Map();
    
    // Fetch in parallel with rate limiting
    const batchSize = 10;
    for (let i = 0; i < placeIds.length; i += batchSize) {
      const batch = placeIds.slice(i, i + batchSize);
      const promises = batch.map(id => this.getPlaceDetails(id));
      const results = await Promise.all(promises);
      
      results.forEach((place, index) => {
        if (place) {
          placesMap.set(batch[index], place);
        }
      });
      
      // Rate limiting delay
      if (i + batchSize < placeIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return placesMap;
  }
} 