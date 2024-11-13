// 'use client';
// import { useState, useEffect } from 'react';
// import { useParams } from 'next/navigation';
// import Image from 'next/image';
// import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

// interface RestaurantDetails {
//   name: string;
//   rating: number;
//   formatted_address: string;
//   formatted_phone_number?: string;
//   opening_hours?: {
//     weekday_text: string[];
//     open_now: boolean;
//   };
//   photos: { photo_reference: string }[];
//   price_level?: number;
//   website?: string;
//   geometry: {
//     location: {
//       lat: number;
//       lng: number;
//     };
//   };
// }

// export default function RestaurantDetailPage() {
//   const params = useParams();
//   const { id } = params;
//   const [restaurant, setRestaurant] = useState<RestaurantDetails | null>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchRestaurantDetails = async () => {
//       try {
//         // 使用我们的 API 路由
//         const response = await fetch(`/api/restaurants/${id}`);
        
//         if (!response.ok) {
//           throw new Error('Failed to fetch restaurant details');
//         }

//         const data = await response.json();
//         setRestaurant(data);
//       } catch (error) {
//         console.error('Error fetching restaurant details:', error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (id) {
//       fetchRestaurantDetails();
//     }
//   }, [id]);

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center min-h-screen">
//         <div className="text-xl">Loading restaurant details...</div>
//       </div>
//     );
//   }

//   if (!restaurant) {
//     return (
//       <div className="flex justify-center items-center min-h-screen">
//         <div className="text-xl">Restaurant not found</div>
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-2xl mx-auto p-4">
//       {/* 餐厅照片 */}
//       <div className="relative h-64 w-full mb-6 rounded-lg overflow-hidden">
//         <Image
//           src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${restaurant.photos?.[0]?.photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
//           alt={restaurant.name}
//           fill
//           className="object-cover"
//         />
//       </div>

//       {/* 餐厅信息 */}
//       <div className="space-y-4">
//         <div className="flex justify-between items-start">
//           <h1 className="text-2xl font-bold">{restaurant.name}</h1>
//           {restaurant.price_level && (
//             <span className="text-gray-600">
//               {'$'.repeat(restaurant.price_level)}
//             </span>
//           )}
//         </div>

//         <div className="flex items-center space-x-2">
//           <span className="text-yellow-500">★</span>
//           <span>{restaurant.rating}</span>
//         </div>

//         <div className="text-gray-600">
//           <p>{restaurant.formatted_address}</p>
//           {restaurant.formatted_phone_number && (
//             <p className="mt-2">{restaurant.formatted_phone_number}</p>
//           )}
//         </div>

//         {/* 营业时间 */}
//         {restaurant.opening_hours?.weekday_text && (
//           <div className="mt-4">
//             <h2 className="font-semibold mb-2">Opening Hours</h2>
//             <ul className="space-y-1">
//               {restaurant.opening_hours.weekday_text.map((hours, index) => (
//                 <li key={index} className="text-sm text-gray-600">{hours}</li>
//               ))}
//             </ul>
//           </div>
//         )}

//         {/* 地图 */}
//         {restaurant && (
//         <div className="h-64 w-full mt-6 rounded-lg overflow-hidden">
//           <GoogleMap
//             mapContainerStyle={{ width: '100%', height: '100%' }}
//             center={restaurant.geometry.location}
//             zoom={15}
//           >
//             <Marker position={restaurant.geometry.location} />
//           </GoogleMap>
//         </div>
//       )}

//         {/* 网站链接 */}
//         {restaurant.website && (
//           <a
//             href={restaurant.website}
//             target="_blank"
//             rel="noopener noreferrer"
//             className="block mt-4 text-blue-600 hover:underline"
//           >
//             Visit Website
//           </a>
//         )}
//       </div>
//     </div>
//   );
// }

'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { useWeb3 } from '@/app/contexts/Web3Context';
import { getRestaurantService, Restaurant, BlockchainData } from '@/app/services/RestaurantService';
import toast from 'react-hot-toast';

interface RestaurantDetails extends Restaurant {
  formatted_address: string;
  formatted_phone_number?: string;
  opening_hours?: {
    weekday_text: string[];
    open_now: boolean;
  };
  website?: string;
}

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const { paymentContract, usdtContract, isConnected, connectWallet } = useWeb3();
  const [restaurant, setRestaurant] = useState<RestaurantDetails | null>(null);
  const [blockchainData, setBlockchainData] = useState<BlockchainData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      try {
        const response = await fetch(`/api/restaurants/${id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch restaurant details');
        }

        const baseData = await response.json();
        
        if (isConnected && paymentContract && usdtContract) {
          const restaurantService = getRestaurantService(paymentContract, usdtContract);
          const [enhancedRestaurant] = await restaurantService.enhanceWithBlockchainData([baseData]);
          setRestaurant(enhancedRestaurant as RestaurantDetails);
        } else {
          setRestaurant(baseData as RestaurantDetails);
        }
      } catch (error) {
        console.error('Error fetching restaurant details:', error);
        toast.error('Failed to load restaurant details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchRestaurantDetails();
    }
  }, [id, isConnected, paymentContract, usdtContract]);

  const handleOrderClick = () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }
    if (!blockchainData?.isRegistered) {
      toast.error('This restaurant is not registered in our system');
      return;
    }
    router.push(`/restaurants/${id}/order`);
  };

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
      {/* Restaurant Photo */}
      <div className="relative h-64 w-full mb-6 rounded-lg overflow-hidden">
        {restaurant.photos?.[0] && (
          <Image
            src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${restaurant.photos[0].photoReference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
            alt={restaurant.name}
            fill
            className="object-cover"
          />
        )}
        {blockchainData?.isRegistered && (
          <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full">
            Verified Restaurant
          </div>
        )}
      </div>

      {/* Restaurant Info */}
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <h1 className="text-2xl font-bold">{restaurant.name}</h1>
          {restaurant.priceLevel && (
            <span className="text-gray-600">
              {'$'.repeat(restaurant.priceLevel)}
            </span>
          )}
        </div>

        {/* Rating and Blockchain Info */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-500">★</span>
            <span>{restaurant.rating}</span>
            <span className="text-gray-500">({restaurant.userRatingsTotal} reviews)</span>
          </div>
          {blockchainData?.isRegistered && (
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full font-semibold">
              {blockchainData.discountRate.toFixed(1)}% OFF
            </span>
          )}
        </div>

        {/* Traffic Level */}
        {blockchainData?.isRegistered && (
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">Current Traffic:</span>
            <span className={`font-semibold ${
              blockchainData.trafficLevel === 'Low' ? 'text-green-500' :
              blockchainData.trafficLevel === 'Medium' ? 'text-yellow-500' : 'text-red-500'
            }`}>
              {blockchainData.trafficLevel}
            </span>
          </div>
        )}

        <div className="text-gray-600">
          <p>{restaurant.formatted_address}</p>
          {restaurant.formatted_phone_number && (
            <p className="mt-2">{restaurant.formatted_phone_number}</p>
          )}
        </div>

        {/* Opening Hours */}
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

        {/* Map */}
        <div className="h-64 w-full mt-6 rounded-lg overflow-hidden">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={restaurant.location}
            zoom={15}
          >
            <Marker position={restaurant.location} />
          </GoogleMap>
        </div>

        {/* Website Link */}
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

        {/* Action Buttons */}
        <div className="sticky bottom-4 flex gap-4 mt-8">
          {!isConnected ? (
            <button
              onClick={connectWallet}
              className="w-full bg-yellow-400 text-gray-900 font-semibold py-3 px-6 rounded-lg hover:bg-yellow-500 transition-colors"
            >
              Connect Wallet to Order
            </button>
          ) : (
            <>
              <button
                onClick={handleOrderClick}
                className="w-full bg-yellow-400 text-gray-900 font-semibold py-3 px-6 rounded-lg hover:bg-yellow-500 transition-colors"
                disabled={!blockchainData?.isRegistered}
              >
                Order Now
              </button>
              <button
                onClick={() => router.push(`/restaurants/${id}/reserve`)}
                className="w-full bg-white text-gray-900 font-semibold py-3 px-6 rounded-lg border-2 border-yellow-400 hover:bg-yellow-50 transition-colors"
              >
                Reserve Table
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}