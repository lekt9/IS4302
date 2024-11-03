import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  
  if (!lat || !lng) {
    return NextResponse.json({ error: 'Location parameters are required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
      `location=${lat},${lng}&` +
      `radius=1500&` +
      `type=restaurant&` +
      `key=${process.env.GOOGLE_MAPS_API_KEY}`
    );

    const data = await response.json();
    
    const formattedResults = data.results.slice(0, 20).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      image: place.photos?.[0]?.photo_reference 
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${process.env.GOOGLE_MAPS_API_KEY}`
        : '/restaurant-placeholder.jpg',
      rating: place.rating || 0,
      vicinity: place.vicinity,
      price_level: place.price_level,
      opening_hours: place.opening_hours
    }));

    return NextResponse.json(formattedResults);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 });
  }
}