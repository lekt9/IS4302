import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import PaymentContractABI from '../../contracts/PaymentContract.json';

// Initialize provider and contract
const provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
const paymentContract = new ethers.Contract(
  process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS!,
  PaymentContractABI,
  provider
);

async function getRegisteredRestaurantsFromContract() {
  try {
    // Get all RestaurantRegistered events
    const filter = paymentContract.filters.RestaurantRegistered();
    const events = await paymentContract.queryFilter(filter);
    
    // Get unique restaurant IDs and their data
    const uniqueRestaurants = new Map();
    
    for (const event of events) {
      const googleMapId = event.args?.googlemap_id;
      if (googleMapId && !uniqueRestaurants.has(googleMapId)) {
        // Get restaurant data from contract
        const restaurantInfo = await paymentContract.restaurants(googleMapId);
        if (restaurantInfo.googlemap_id !== '') {  // Check if restaurant is still registered
          uniqueRestaurants.set(googleMapId, restaurantInfo);
        }
      }
    }
    
    return Array.from(uniqueRestaurants.entries()).map(([id, info]) => ({
      id,
      contractData: info
    }));
  } catch (error) {
    console.error('Error fetching from contract:', error);
    return [];
  }
}

async function getGooglePlaceDetails(placeId: string) {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?` +
      `place_id=${placeId}&` +
      `fields=name,rating,user_ratings_total,formatted_address,photos,price_level,geometry&` +
      `key=${process.env.GOOGLE_MAPS_API_KEY}`
    );

    const data = await response.json();
    if (data.status !== 'OK') {
      throw new Error(data.error_message || 'Failed to fetch place details');
    }

    return data.result;
  } catch (error) {
    console.error(`Error fetching details for place ${placeId}:`, error);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  
  if (!lat || !lng) {
    return NextResponse.json(
      { error: 'Location parameters are required' }, 
      { status: 400 }
    );
  }

  try {
    // 1. Get all registered restaurants from the smart contract
    const registeredRestaurants = await getRegisteredRestaurantsFromContract();
    
    // 2. Fetch details for each restaurant from Google Places API
    const restaurantsWithDetails = await Promise.all(
      registeredRestaurants.map(async (restaurant) => {
        const placeDetails = await getGooglePlaceDetails(restaurant.id);
        if (!placeDetails) return null;

        // Calculate distance from user's location
        const restaurantLat = placeDetails.geometry.location.lat;
        const restaurantLng = placeDetails.geometry.location.lng;
        const distance = calculateDistance(
          parseFloat(lat),
          parseFloat(lng),
          restaurantLat,
          restaurantLng
        );

        return {
          id: restaurant.id,
          name: placeDetails.name,
          photos: placeDetails.photos?.map((photo: any) => ({
            photoReference: photo.photo_reference,
            height: photo.height,
            width: photo.width
          })) || [],
          rating: placeDetails.rating || 0,
          userRatingsTotal: placeDetails.user_ratings_total,
          vicinity: placeDetails.formatted_address,
          priceLevel: placeDetails.price_level,
          location: placeDetails.geometry.location,
          distance: distance,
          blockchainData: {
            isRegistered: true,
            address: restaurant.contractData.owner,
            // Add other contract data as needed
          }
        };
      })
    );

    // Filter out null results and sort by distance
    const validRestaurants = restaurantsWithDetails
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => a.distance - b.distance);

    return NextResponse.json(validRestaurants);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch restaurants' }, 
      { status: 500 }
    );
  }
}

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}