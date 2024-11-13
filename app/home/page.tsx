// 'use client';
// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import Image from 'next/image';

// interface Restaurant {
//   id: string;
//   name: string;
//   rating: number;
//   userRatingsTotal: number;
//   vicinity: string;
//   priceLevel?: number;
//   photos: {
//     photoReference: string;
//     height: number;
//     width: number;
//   }[];
//   location: {
//     lat: number;
//     lng: number;
//   };
//   discountRate: number;
//   trafficLevel: 'Low' | 'Medium' | 'High';
// }

// export default function HomePage() {
//   const router = useRouter();
//   const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const storedData = localStorage.getItem('nearbyRestaurants');
//     if (storedData) {
//       const { restaurants } = JSON.parse(storedData);
//       const enhancedRestaurants = restaurants.map((restaurant: Restaurant) => ({
//         ...restaurant,
//         discountRate: Math.floor(Math.random() * 31), // Random discount between 0-30%
//         trafficLevel: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)] as 'Low' | 'Medium' | 'High'
//       }));
//       setRestaurants(enhancedRestaurants);
//     }
//   }, []);

//   const getPhotoUrl = (photoReference: string) => {
//     return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
//   };

//   const getTrafficStars = (level: string) => {
//     switch (level) {
//       case 'Low':
//         return (
//           <span className="text-green-500">
//             ★<span className="text-gray-300">★★</span>
//           </span>
//         );
//       case 'Medium':
//         return (
//           <span className="text-yellow-500">
//             ★★<span className="text-gray-300">★</span>
//           </span>
//         );
//       case 'High':
//         return <span className="text-red-500">★★★</span>;
//       default:
//         return <span className="text-gray-300">★★★</span>;
//     }
//   };

//   const handleRestaurantClick = () => {
//     router.push('/order');
//   };

//   return (
//     <div className="container mx-auto p-4">
//       <h1 className="text-2xl font-bold mb-4">Nearby Restaurants</h1>
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//         {restaurants.map((restaurant) => (
//           <div key={restaurant.id} className="border rounded-lg p-4 shadow"  onClick={() => handleRestaurantClick()}>
//             {restaurant.photos[0] && (
//               <img
//                 src={getPhotoUrl(restaurant.photos[0].photoReference)}
//                 alt={restaurant.name}
//                 className="w-full h-48 object-cover rounded-lg mb-2"
//               />
//             )}
//             <h2 className="text-xl font-semibold">{restaurant.name}</h2>
//             <p className="text-gray-600">{restaurant.vicinity}</p>
//                        {/* Rating, Reviews, Price Level, and Discount in one line */}
//                        <div className="mt-2 flex items-center flex-wrap gap-2">
//               <span className="text-yellow-500">★ {restaurant.rating}</span>
//               <span className="text-gray-500">({restaurant.userRatingsTotal} reviews)</span>
//               {restaurant.priceLevel && (
//                 <span className="text-gray-500">
//                   {'$'.repeat(restaurant.priceLevel)}
//                 </span>
//               )}
//               {restaurant.discountRate > 0 && (
//                 <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-sm font-semibold">
//                   Discount: {restaurant.discountRate}% OFF
//                 </span>
//               )}
//             </div>

//             {/* Traffic Level */}
//             <div className="mt-2 flex items-center">
//               <span className="text-sm font-medium mr-2">Traffic:</span>
//               <span className="text-lg">{getTrafficStars(restaurant.trafficLevel)}</span>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWeb3 } from '../contexts/Web3Context';
import { getRestaurantService, Restaurant } from '../services/RestaurantService';
import toast from 'react-hot-toast';

export default function HomePage() {
  const router = useRouter();
  const { paymentContract, usdtContract, isConnected, connectWallet } = useWeb3();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        const storedData = localStorage.getItem('nearbyRestaurants');
        if (!storedData || !paymentContract || !usdtContract) return;

        const { restaurants: baseRestaurants } = JSON.parse(storedData);
        const restaurantService = getRestaurantService(paymentContract, usdtContract);
        
        // Enhance restaurants with blockchain data
        const enhancedRestaurants = await restaurantService.enhanceWithBlockchainData(baseRestaurants);
        setRestaurants(enhancedRestaurants);
      } catch (error) {
        console.error('Error loading restaurants:', error);
        toast.error('Failed to load restaurant data');
      } finally {
        setLoading(false);
      }
    };

    loadRestaurants();
  }, [paymentContract, usdtContract]);

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

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Connect Your Wallet</h1>
          <p className="text-gray-600">Please connect your wallet to view restaurant discounts</p>
          <button
            onClick={connectWallet}
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
      <h1 className="text-2xl font-bold mb-4">Nearby Restaurants</h1>
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
                {restaurant.blockchainData?.isRegistered && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                    Verified
                  </div>
                )}
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
              {restaurant.blockchainData?.isRegistered && (
                <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-sm font-semibold">
                  {restaurant.blockchainData.discountRate.toFixed(1)}% OFF
                </span>
              )}
            </div>

            {restaurant.blockchainData?.isRegistered && (
              <div className="mt-2 flex items-center">
                <span className="text-sm font-medium mr-2">Traffic:</span>
                <span className="text-lg">
                  {getTrafficStars(restaurant.blockchainData.trafficLevel)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}