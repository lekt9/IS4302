'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FaRegMoneyBillAlt } from 'react-icons/fa';
import { IoSparkles } from 'react-icons/io5';

// const sampleRestaurant = {
//   name: "Wocoww",
//   rating: 4.5,
//   vicinity: "Chay Yan Street",
//   discountRate: 20,
// };

// const menuItems = [
//   { id: 1, name: 'Signature Burger', price: 15.90, description: 'Premium beef patty with special sauce' },
//   { id: 2, name: 'Caesar Salad', price: 12.90, description: 'Fresh romaine lettuce with caesar dressing' },
//   { id: 3, name: 'Truffle Fries', price: 8.90, description: 'Crispy fries with truffle oil' },
// ];

// export default function RestaurantPage() {
//   const router = useRouter();
//   const [quantities, setQuantities] = useState<{ [key: number]: number }>({});

//   const updateQuantity = (itemId: number, delta: number) => {
//     setQuantities(prev => {
//       const newQuantity = (prev[itemId] || 0) + delta;
//       if (newQuantity <= 0) {
//         const { [itemId]: _, ...rest } = prev;
//         return rest;
//       }
//       return { ...prev, [itemId]: newQuantity };
//     });
//   };

//   const getTotal = () => {
//     const subtotal = menuItems.reduce((total, item) => {
//       return total + (item.price * (quantities[item.id] || 0));
//     }, 0);
//     const discount = (subtotal * sampleRestaurant.discountRate) / 100;
//     return {
//       subtotal,
//       discount,
//       final: subtotal - discount
//     };
//   };

//   const handlePlaceOrder = () => {
//     const { subtotal, discount, final } = getTotal();
    
//     toast.custom((t) => (
//       <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} fixed inset-0 z-50`}>
//         {/* 半透明黑色背景遮罩 */}
//         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
//           {/* Toast 内容 */}
//           <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-6 m-4 relative animate-scale-in">
//             {/* 成功图标 */}
//             <div className="flex items-center justify-center mb-4">
//               <div className="bg-green-100 p-4 rounded-full">
//                 <IoSparkles className="text-green-500 text-2xl animate-bounce" />
//               </div>
//             </div>
            
//             {/* 成功消息 */}
//             <div className="text-center mb-6">
//               <h3 className="text-xl font-semibold mb-2">Order Placed Successfully! 🎉</h3>
//               <div className="flex items-center justify-center gap-2 text-green-600">
//                 <FaRegMoneyBillAlt className="text-lg" />
//                 <span className="font-medium">
//                   You saved ${discount.toFixed(2)} with our discount!
//                 </span>
//               </div>
//             </div>

//             {/* 按钮 */}
//             <button
//               onClick={() => {
//                 toast.dismiss(t.id);
//                 router.push('/home');
//               }}
//               className="w-full bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 
//                          transition-colors duration-200 font-medium"
//             >
//               Back to Restaurants
//             </button>
//           </div>
//         </div>
//       </div>
//     ), {
//       duration: 4000,
//       position: 'top-center',
//     });
//   };

//   return (
//     <div className="container mx-auto p-4 pb-24">
//       {/* Restaurant Header */}
//       <div className="mb-6">
//         <button 
//           onClick={() => router.push('/home')}
//           className="mb-4 text-blue-500 hover:text-blue-700"
//         >
//           ← Back to restaurants
//         </button>
//         <h1 className="text-3xl font-bold">{sampleRestaurant.name}</h1>
//         <p className="text-gray-600">{sampleRestaurant.vicinity}</p>
//         <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-semibold mt-2 inline-block">
//           {sampleRestaurant.discountRate}% OFF
//         </span>
//       </div>

//       {/* Menu Items */}
//       <div className="space-y-4">
//         {menuItems.map((item) => (
//           <div key={item.id} className="border rounded-lg p-4 flex justify-between items-center">
//             <div>
//               <h3 className="text-xl font-semibold">{item.name}</h3>
//               <p className="text-gray-600">{item.description}</p>
//               <p className="text-lg font-semibold mt-1">${item.price.toFixed(2)}</p>
//             </div>
//             <div className="flex items-center space-x-3">
//               <button
//                 onClick={() => updateQuantity(item.id, -1)}
//                 className="bg-gray-200 px-3 py-1 rounded-lg"
//               >
//                 -
//               </button>
//               <span>{quantities[item.id] || 0}</span>
//               <button
//                 onClick={() => updateQuantity(item.id, 1)}
//                 className="bg-blue-500 text-white px-3 py-1 rounded-lg"
//               >
//                 +
//               </button>
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* Order Summary */}
//       {Object.keys(quantities).length > 0 && (
//         <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
//           <div className="container mx-auto flex justify-between items-center">
//             <div className="text-lg font-semibold">
//               Total: ${getTotal().final.toFixed(2)}
//             </div>
//             <button 
//               className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
//               onClick={handlePlaceOrder}
//             >
//               Place Order
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }


interface MenuItem {
  id: number;
  name: string;
  price: number;
  description: string;
}

interface Restaurant {
  name: string;
  rating: number;
  vicinity: string;
  discountRate: number;
}

export default function RestaurantPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<{ [key: number]: number }>({});

  useEffect(() => {
    const fetchRestaurantData = async () => {
      try {
        const gmapsId = searchParams.get('gmapsId');
        const contractAddress = searchParams.get('contractAddress');
        
        if (!gmapsId || !contractAddress) {
          toast.error('Missing restaurant information');
          router.push('/home');
          return;
        }

        // Replace with your actual API endpoints
        const restaurantResponse = await fetch(`/api/restaurants/${gmapsId}`);
        const menuResponse = await fetch(`/api/restaurants/${gmapsId}/menu`);

        if (!restaurantResponse.ok || !menuResponse.ok) {
          throw new Error('Failed to fetch restaurant data');
        }

        const restaurantData = await restaurantResponse.json();
        const menuData = await menuResponse.json();

        setRestaurant(restaurantData);
        setMenuItems(menuData);
      } catch (error) {
        console.error('Error fetching restaurant data:', error);
        toast.error('Failed to load restaurant data');
        router.push('/home');
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurantData();
  }, [searchParams, router]);

  const updateQuantity = (itemId: number, delta: number) => {
    setQuantities(prev => {
      const newQuantity = (prev[itemId] || 0) + delta;
      if (newQuantity <= 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: newQuantity };
    });
  };

  const getTotal = () => {
    const subtotal = menuItems.reduce((total, item) => {
      return total + (item.price * (quantities[item.id] || 0));
    }, 0);
    const discount = restaurant ? (subtotal * restaurant.discountRate) / 100 : 0;
    return {
      subtotal,
      discount,
      final: subtotal - discount
    };
  };

  const handlePlaceOrder = () => {
    const { subtotal, discount, final } = getTotal();
    
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} fixed inset-0 z-50`}>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-6 m-4 relative animate-scale-in">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-100 p-4 rounded-full">
                <IoSparkles className="text-green-500 text-2xl animate-bounce" />
              </div>
            </div>
            
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold mb-2">Order Placed Successfully! 🎉</h3>
              <div className="flex items-center justify-center gap-2 text-green-600">
                <FaRegMoneyBillAlt className="text-lg" />
                <span className="font-medium">
                  You saved ${discount.toFixed(2)} with our discount!
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                toast.dismiss(t.id);
                router.push('/home');
              }}
              className="w-full bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 
                         transition-colors duration-200 font-medium"
            >
              Back to Restaurants
            </button>
          </div>
        </div>
      </div>
    ), {
      duration: 4000,
      position: 'top-center',
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!restaurant || !menuItems.length) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p>Restaurant not found</p>
        <button 
          onClick={() => router.push('/home')}
          className="text-blue-500 hover:text-blue-700 mt-4"
        >
          ← Back to restaurants
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 pb-24">
      {/* Restaurant Header */}
      <div className="mb-6">
        <button 
          onClick={() => router.push('/home')}
          className="mb-4 text-blue-500 hover:text-blue-700"
        >
          ← Back to restaurants
        </button>
        <h1 className="text-3xl font-bold">{restaurant.name}</h1>
        <p className="text-gray-600">{restaurant.vicinity}</p>
        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-semibold mt-2 inline-block">
          {restaurant.discountRate}% OFF
        </span>
      </div>

      {/* Menu Items */}
      <div className="space-y-4">
        {menuItems.map((item) => (
          <div key={item.id} className="border rounded-lg p-4 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold">{item.name}</h3>
              <p className="text-gray-600">{item.description}</p>
              <p className="text-lg font-semibold mt-1">${item.price.toFixed(2)}</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => updateQuantity(item.id, -1)}
                className="bg-gray-200 px-3 py-1 rounded-lg"
              >
                -
              </button>
              <span>{quantities[item.id] || 0}</span>
              <button
                onClick={() => updateQuantity(item.id, 1)}
                className="bg-blue-500 text-white px-3 py-1 rounded-lg"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Order Summary */}
      {Object.keys(quantities).length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
          <div className="container mx-auto flex justify-between items-center">
            <div className="text-lg font-semibold">
              Total: ${getTotal().final.toFixed(2)}
            </div>
            <button 
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              onClick={handlePlaceOrder}
            >
              Place Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}