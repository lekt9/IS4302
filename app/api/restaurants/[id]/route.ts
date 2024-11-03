import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?` +
      `place_id=${id}&` +
      `fields=name,rating,formatted_phone_number,formatted_address,opening_hours,photos,price_level,website,geometry&` +
      `key=${process.env.GOOGLE_MAPS_API_KEY}`
    );

    const data = await response.json();
    
    if (!data.result) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    return NextResponse.json(data.result);
  } catch (error) {
    console.error('Error fetching restaurant details:', error);
    return NextResponse.json({ error: 'Failed to fetch restaurant details' }, { status: 500 });
  }
}