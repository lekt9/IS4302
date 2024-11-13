// import { NextResponse } from 'next/server';

// export async function POST(request: Request) {
//   try {
//     const body = await request.json();
//     console.log('API Route received request:', body);

//     const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${body.latitude},${body.longitude}&radius=${body.radius}&type=${body.type}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    
//     const response = await fetch(url);
//     const data = await response.json();
    
//     // Log the full response data
//     console.log('Full Google Places API response:', JSON.stringify(data, null, 2));

//     return NextResponse.json(data);
//   } catch (error) {
//     console.error('Error in places API:', error);
//     return NextResponse.json({ error: 'Failed to fetch places' }, { status: 500 });
//   }
// }

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { latitude, longitude, radius, type } = body;

    const params = new URLSearchParams({
      location: `${latitude},${longitude}`,
      radius: radius.toString(),
      type: type,
      key: process.env.GOOGLE_MAPS_API_KEY!
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!response.ok) {
      throw new Error('Failed to fetch nearby places');
    }

    const data = await response.json();

    // Enhance data with blockchain status
    // In production, you would batch check these restaurants against your smart contract
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in nearby places API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nearby places' },
      { status: 500 }
    );
  }
}