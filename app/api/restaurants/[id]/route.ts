// import { NextResponse } from 'next/server';

// async function getGooglePlaceDetails(placeId: string) {
//   try {
//     const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
//     url.searchParams.append('place_id', placeId);
//     url.searchParams.append('fields', 'name,rating,user_ratings_total,formatted_address,photos,price_level,geometry');
//     url.searchParams.append('key', process.env.GOOGLE_MAPS_API_KEY!);

//     const response = await fetch(url.toString(), {
//       method: 'GET',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       next: { revalidate: 3600 }, // Cache for 1 hour
//       cache: 'force-cache'
//     });

//     if (!response.ok) {
//       throw new Error('Failed to fetch from Google Places API');
//     }

//     const data = await response.json();
//     if (data.status !== 'OK') {
//       throw new Error(data.error_message || 'Failed to fetch place details');
//     }

//     return data.result;
//   } catch (error) {
//     console.error(`Error fetching details for place ${placeId}:`, error);
//     return null;
//   }
// }

// export async function GET(request: Request) {
//   const { searchParams } = new URL(request.url);
//   const lat = searchParams.get('lat');
//   const lng = searchParams.get('lng');
//   const placeIds = searchParams.get('placeIds'); // New parameter to receive place IDs
  
//   if (!lat || !lng || !placeIds) {
//     return NextResponse.json(
//       { error: 'Location parameters and place IDs are required' }, 
//       { status: 400 }
//     );
//   }

//   try {
//     const placeIdArray = placeIds.split(',');
    
//     const restaurantsWithDetails = await Promise.all(
//       placeIdArray.map(async (placeId) => {
//         const placeDetails = await getGooglePlaceDetails(placeId);
//         if (!placeDetails) return null;

//         const restaurantLat = placeDetails.geometry.location.lat;
//         const restaurantLng = placeDetails.geometry.location.lng;
//         const distance = calculateDistance(
//           parseFloat(lat),
//           parseFloat(lng),
//           restaurantLat,
//           restaurantLng
//         );

//         return {
//           id: placeId,
//           name: placeDetails.name,
//           photos: placeDetails.photos?.map((photo: any) => ({
//             photoReference: photo.photo_reference,
//             height: photo.height,
//             width: photo.width
//           })) || [],
//           rating: placeDetails.rating || 0,
//           userRatingsTotal: placeDetails.user_ratings_total,
//           vicinity: placeDetails.formatted_address,
//           priceLevel: placeDetails.price_level,
//           location: placeDetails.geometry.location,
//           distance: distance
//         };
//       })
//     );

//     const validRestaurants = restaurantsWithDetails
//       .filter((r): r is NonNullable<typeof r> => r !== null)
//       .sort((a, b) => a.distance - b.distance);

//     return NextResponse.json(validRestaurants);
//   } catch (error) {
//     console.error('Error fetching restaurants:', error);
//     return NextResponse.json(
//       { error: 'Failed to fetch restaurants' }, 
//       { status: 500 }
//     );
//   }
// }

// function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
//   const R = 6371;
//   const dLat = deg2rad(lat2 - lat1);
//   const dLon = deg2rad(lon2 - lon1);
//   const a = 
//     Math.sin(dLat/2) * Math.sin(dLat/2) +
//     Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
//     Math.sin(dLon/2) * Math.sin(dLon/2);
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
//   const d = R * c;
//   return d;
// }

// function deg2rad(deg: number) {
//   return deg * (Math.PI/180);
// }

import { NextResponse } from 'next/server';

async function getGooglePlaceDetails(placeId: string) {
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.append('place_id', placeId);
    url.searchParams.append('fields', 'name,rating,user_ratings_total,formatted_address,formatted_phone_number,photos,price_level,geometry,website,opening_hours');
    url.searchParams.append('key', process.env.GOOGLE_MAPS_API_KEY!);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
      cache: 'force-cache'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch from Google Places API');
    }

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

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const placeId = params.id;
    
    if (!placeId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    console.log('Fetching details for restaurant:', placeId);
    const placeDetails = await getGooglePlaceDetails(placeId);
    
    if (!placeDetails) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    const restaurant = {
      id: placeId,
      name: placeDetails.name,
      photos: placeDetails.photos?.map((photo: any) => ({
        photoReference: photo.photo_reference,
        height: photo.height,
        width: photo.width
      })) || [],
      rating: placeDetails.rating || 0,
      userRatingsTotal: placeDetails.user_ratings_total,
      formatted_address: placeDetails.formatted_address,
      formatted_phone_number: placeDetails.formatted_phone_number,
      website: placeDetails.website,
      opening_hours: placeDetails.opening_hours,
      location: placeDetails.geometry.location,
      priceLevel: placeDetails.price_level
    };

    console.log('Successfully fetched restaurant details:', restaurant);
    return NextResponse.json(restaurant);
  } catch (error) {
    console.error('Error fetching restaurant details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch restaurant details' },
      { status: 500 }
    );
  }
}