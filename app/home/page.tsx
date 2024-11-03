'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Restaurant {
  id: string;
  name: string;
  rating: number;
  userRatingsTotal: number;
  vicinity: string;
  priceLevel?: number;
  photos: {
    photoReference: string;
    height: number;
    width: number;
  }[];
  location: {
    lat: number;
    lng: number;
  };
  discountRate: number;
  trafficLevel: 'Low' | 'Medium' | 'High';
}

export default function HomePage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedData = localStorage.getItem('nearbyRestaurants');
    if (storedData) {
      const { restaurants } = JSON.parse(storedData);
      const enhancedRestaurants = restaurants.map((restaurant: Restaurant) => ({
        ...restaurant,
        discountRate: Math.floor(Math.random() * 31), // Random discount between 0-30%
        trafficLevel: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)] as 'Low' | 'Medium' | 'High'
      }));
      setRestaurants(enhancedRestaurants);
    }
  }, []);

  const getPhotoUrl = (photoReference: string) => {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
  };

  const getTrafficStars = (level: string) => {
    switch (level) {
      case 'Low':
        return (
          <span className="text-green-500">
            ★<span className="text-gray-300">★★</span>
          </span>
        );
      case 'Medium':
        return (
          <span className="text-yellow-500">
            ★★<span className="text-gray-300">★</span>
          </span>
        );
      case 'High':
        return <span className="text-red-500">★★★</span>;
      default:
        return <span className="text-gray-300">★★★</span>;
    }
  };

  const handleRestaurantClick = () => {
    router.push('/order');
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Nearby Restaurants</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {restaurants.map((restaurant) => (
          <div key={restaurant.id} className="border rounded-lg p-4 shadow"  onClick={() => handleRestaurantClick()}>
            {restaurant.photos[0] && (
              <img
                src={getPhotoUrl(restaurant.photos[0].photoReference)}
                alt={restaurant.name}
                className="w-full h-48 object-cover rounded-lg mb-2"
              />
            )}
            <h2 className="text-xl font-semibold">{restaurant.name}</h2>
            <p className="text-gray-600">{restaurant.vicinity}</p>
                       {/* Rating, Reviews, Price Level, and Discount in one line */}
                       <div className="mt-2 flex items-center flex-wrap gap-2">
              <span className="text-yellow-500">★ {restaurant.rating}</span>
              <span className="text-gray-500">({restaurant.userRatingsTotal} reviews)</span>
              {restaurant.priceLevel && (
                <span className="text-gray-500">
                  {'$'.repeat(restaurant.priceLevel)}
                </span>
              )}
              {restaurant.discountRate > 0 && (
                <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-sm font-semibold">
                  Discount: {restaurant.discountRate}% OFF
                </span>
              )}
            </div>

            {/* Traffic Level */}
            <div className="mt-2 flex items-center">
              <span className="text-sm font-medium mr-2">Traffic:</span>
              <span className="text-lg">{getTrafficStars(restaurant.trafficLevel)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}