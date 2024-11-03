import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('API Route received request:', body);

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${body.latitude},${body.longitude}&radius=${body.radius}&type=${body.type}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    console.log('Calling Google Places API:', url.replace(process.env.GOOGLE_MAPS_API_KEY!, 'HIDDEN_API_KEY'));

    const response = await fetch(url);
    const data = await response.json();
    console.log('Google Places API response:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in places API:', error);
    return NextResponse.json({ error: 'Failed to fetch places' }, { status: 500 });
  }
}