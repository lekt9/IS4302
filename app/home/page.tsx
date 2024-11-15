'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWeb3 } from '../contexts/Web3Context';
import toast from 'react-hot-toast';
import { BlockchainService } from '../services/BlockchainService';

interface Coordinates {
  lat: number;
  lng: number;
}

interface Restaurant {
  id: string;
  name: string;
  photos: {
    photoReference: string;
    height: number;
    width: number;
  }[];
  rating: number;
  userRatingsTotal: number;
  vicinity: string;
  priceLevel?: number;
  location: {
    lat: number;
    lng: number;
  };
  distance: number;
  blockchainData: {
    isRegistered: boolean;
    address: string;
    discountRate: number;
  };
}

export default function HomePage() {
  const router = useRouter();
  const { isConnected, connectWallet, provider } = useWeb3();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordinates({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Failed to get your location. Please enable location services.');
          // Set default coordinates (e.g., city center)
          setCoordinates({
            lat: 1.3521, // Singapore coordinates as default
            lng: 103.8198
          });
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
      // Set default coordinates
      setCoordinates({
        lat: 1.3521,
        lng: 103.8198
      });
    }
  }, []);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        if (!provider || !coordinates) return;

        // Get registered restaurants from blockchain
        const blockchainService = new BlockchainService(provider);
        const registeredRestaurants = await blockchainService.getRegisteredRestaurants();
        
        // Get restaurant details from API
        const response = await fetch(
          `/api/restaurants?lat=${coordinates.lat}&lng=${coordinates.lng}&placeIds=${
            registeredRestaurants.map(r => r.id).join(',')
          }`
        );
        
        if (!response.ok) throw new Error('Failed to fetch restaurants');
        const apiRestaurants = await response.json();
        
        // Merge blockchain data with API data
        const mergedRestaurants = apiRestaurants.map((restaurant: any) => {
          const blockchainData = registeredRestaurants.find(r => r.id === restaurant.id);
          return {
            ...restaurant,
            blockchainData: blockchainData ? {
              isRegistered: true,
              address: blockchainData.contractData.owner,
              discountRate: parseFloat(blockchainData.contractData.discountRate)
            } : {
              isRegistered: false,
              address: '',
              discountRate: 0
            }
          };
        });

        setRestaurants(mergedRestaurants);
      } catch (error) {
        console.error('Error fetching restaurants:', error);
        toast.error('Failed to load restaurants');
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, [provider, coordinates]); // Added coordinates as dependency

  const getPhotoUrl = (photoReference: string) => {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
  };

  const getTrafficStars = (level?: string) => {
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

  const handleRestaurantClick = (restaurantId: string) => {
    router.push(`/restaurants/${restaurantId}`);
  };

  const handleConnectWallet = async () => {
    console.log('Connect wallet button clicked');
    try {
      await connectWallet();
    } catch (error) {
      console.error('Error in handleConnectWallet:', error);
      toast.error('Failed to connect wallet');
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Connect Your Wallet</h1>
          <p className="text-gray-600">Please connect your wallet to view restaurant discounts</p>
          <button
            onClick={handleConnectWallet}
            className="bg-yellow-400 text-gray-900 px-6 py-2 rounded-full hover:bg-yellow-500 transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading restaurants...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Registered Restaurants Near You</h1>
      {restaurants.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No registered restaurants found in your area.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {restaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              className="border rounded-lg p-4 shadow hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleRestaurantClick(restaurant.id)}
            >
              {restaurant.photos?.[0] && (
                <div className="relative h-48 w-full mb-2">
                  <img
                    src={getPhotoUrl(restaurant.photos[0].photoReference)}
                    alt={restaurant.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                    Verified
                  </div>
                </div>
              )}
              
              <h2 className="text-xl font-semibold">{restaurant.name}</h2>
              <p className="text-gray-600">{restaurant.vicinity}</p>

              <div className="mt-2 flex items-center flex-wrap gap-2">
                <span className="text-yellow-500">★ {restaurant.rating}</span>
                <span className="text-gray-500">({restaurant.userRatingsTotal} reviews)</span>
                {restaurant.priceLevel && (
                  <span className="text-gray-500">
                    {'$'.repeat(restaurant.priceLevel)}
                  </span>
                )}
                <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-sm font-semibold">
                  {restaurant.blockchainData.discountRate.toFixed(1)}% OFF
                </span>
              </div>

              <div className="mt-2 text-sm text-gray-500">
                {(restaurant.distance).toFixed(1)} km away
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}