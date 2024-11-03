'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Restaurant {
  id: string;
  name: string;
  image: string;
  rating: number;
  vicinity: string;
  photos?: { photo_reference: string }[];
  price_level?: number;
  opening_hours?: {
    open_now: boolean;
  };
}

export default function HomePage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        // 从 localStorage 获取用户偏好
        const locationData = JSON.parse(localStorage.getItem('userLocation') || '{}');
        const coordinates = locationData.coordinates;
        
        if (!coordinates) {
          router.push('/preferences');
          return;
        }

        // 使用我们的 API 路由
        const response = await fetch(
          `/api/restaurants?lat=${coordinates.lat}&lng=${coordinates.lng}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch restaurants');
        }

        const restaurants = await response.json();
        setRestaurants(restaurants);
      } catch (error) {
        console.error('Error fetching restaurants:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, [router]);

  const handleRestaurantClick = (id: string) => {
    router.push(`/restaurants/${id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading restaurants...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold mb-6">Nearby Restaurants</h1>
      <button
        onClick={() => router.push('/restaurants/search')}
        className="px-4 py-2 bg-yellow-400 rounded-lg hover:bg-yellow-500"
      > Search
      </button></div>
      <div className="grid gap-4">
        {restaurants.map((restaurant) => (
          <div
            key={restaurant.id}
            onClick={() => handleRestaurantClick(restaurant.id)}
            className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer"
          >
            <div className="flex h-32 sm:h-48">
              {/* 餐厅图片 */}
              <div className="relative w-1/3">
                <Image
                  src={restaurant.image}
                  alt={restaurant.name}
                  fill
                  className="object-cover"
                />
              </div>
              
              {/* 餐厅信息 */}
              <div className="flex-1 p-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold">{restaurant.name}</h3>
                  {restaurant.price_level && (
                    <span className="text-gray-600">
                      {'$'.repeat(restaurant.price_level)}
                    </span>
                  )}
                </div>
                
                <div className="mt-2 flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    ⭐ {restaurant.rating}
                  </span>
                  {restaurant.opening_hours && (
                    <span className={`text-sm ${
                      restaurant.opening_hours.open_now ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {restaurant.opening_hours.open_now ? 'Open' : 'Closed'}
                    </span>
                  )}
                </div>
                
                <div className="mt-2 text-sm text-gray-600">
                  {restaurant.vicinity}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}