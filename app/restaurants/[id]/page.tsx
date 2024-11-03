'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

interface RestaurantDetails {
  name: string;
  rating: number;
  formatted_address: string;
  formatted_phone_number?: string;
  opening_hours?: {
    weekday_text: string[];
    open_now: boolean;
  };
  photos: { photo_reference: string }[];
  price_level?: number;
  website?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export default function RestaurantDetailPage() {
  const params = useParams();
  const { id } = params;
  const [restaurant, setRestaurant] = useState<RestaurantDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      try {
        // 使用我们的 API 路由
        const response = await fetch(`/api/restaurants/${id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch restaurant details');
        }

        const data = await response.json();
        setRestaurant(data);
      } catch (error) {
        console.error('Error fetching restaurant details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchRestaurantDetails();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading restaurant details...</div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Restaurant not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* 餐厅照片 */}
      <div className="relative h-64 w-full mb-6 rounded-lg overflow-hidden">
        <Image
          src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${restaurant.photos?.[0]?.photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
          alt={restaurant.name}
          fill
          className="object-cover"
        />
      </div>

      {/* 餐厅信息 */}
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <h1 className="text-2xl font-bold">{restaurant.name}</h1>
          {restaurant.price_level && (
            <span className="text-gray-600">
              {'$'.repeat(restaurant.price_level)}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-yellow-500">★</span>
          <span>{restaurant.rating}</span>
        </div>

        <div className="text-gray-600">
          <p>{restaurant.formatted_address}</p>
          {restaurant.formatted_phone_number && (
            <p className="mt-2">{restaurant.formatted_phone_number}</p>
          )}
        </div>

        {/* 营业时间 */}
        {restaurant.opening_hours?.weekday_text && (
          <div className="mt-4">
            <h2 className="font-semibold mb-2">Opening Hours</h2>
            <ul className="space-y-1">
              {restaurant.opening_hours.weekday_text.map((hours, index) => (
                <li key={index} className="text-sm text-gray-600">{hours}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 地图 */}
        {restaurant && (
        <div className="h-64 w-full mt-6 rounded-lg overflow-hidden">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={restaurant.geometry.location}
            zoom={15}
          >
            <Marker position={restaurant.geometry.location} />
          </GoogleMap>
        </div>
      )}

        {/* 网站链接 */}
        {restaurant.website && (
          <a
            href={restaurant.website}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-4 text-blue-600 hover:underline"
          >
            Visit Website
          </a>
        )}
      </div>
    </div>
  );
}