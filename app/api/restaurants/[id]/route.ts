// import { NextResponse } from 'next/server';

// export async function GET(
//   request: Request,
//   { params }: { params: { id: string } }
// ) {
//   const id = params.id;

//   try {
//     const response = await fetch(
//       `https://maps.googleapis.com/maps/api/place/details/json?` +
//       `place_id=${id}&` +
//       `fields=name,rating,formatted_phone_number,formatted_address,opening_hours,photos,price_level,website,geometry&` +
//       `key=${process.env.GOOGLE_MAPS_API_KEY}`
//     );

//     const data = await response.json();
    
//     if (!data.result) {
//       return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
//     }

//     return NextResponse.json(data.result);
//   } catch (error) {
//     console.error('Error fetching restaurant details:', error);
//     return NextResponse.json({ error: 'Failed to fetch restaurant details' }, { status: 500 });
//   }
// }

import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const fields = [
      'name',
      'rating',
      'formatted_phone_number',
      'formatted_address',
      'opening_hours',
      'photos',
      'price_level',
      'website',
      'geometry',
      'user_ratings_total'
    ].join(',');

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${id}&fields=${fields}&key=${process.env.GOOGLE_MAPS_API_KEY}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch restaurant details');
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(data.error_message || 'Failed to fetch restaurant details');
    }

    // Transform the response to match our frontend expectations
    const transformedData = {
      id,
      name: data.result.name,
      rating: data.result.rating,
      userRatingsTotal: data.result.user_ratings_total,
      formatted_phone_number: data.result.formatted_phone_number,
      formatted_address: data.result.formatted_address,
      opening_hours: data.result.opening_hours,
      photos: data.result.photos?.map((photo: any) => ({
        photoReference: photo.photo_reference,
        height: photo.height,
        width: photo.width
      })) || [],
      priceLevel: data.result.price_level,
      website: data.result.website,
      location: data.result.geometry.location
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error in restaurant details API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch restaurant details' },
      { status: 500 }
    );
  }
}