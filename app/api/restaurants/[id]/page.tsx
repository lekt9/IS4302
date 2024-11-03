'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const sampleRestaurant = {
  name: "Sample Restaurant",
  rating: 4.5,
  vicinity: "123 Sample Street",
  discountRate: 20,
};

const menuItems = [
  { id: 1, name: 'Signature Burger', price: 15.90, description: 'Premium beef patty with special sauce' },
  { id: 2, name: 'Caesar Salad', price: 12.90, description: 'Fresh romaine lettuce with caesar dressing' },
  { id: 3, name: 'Truffle Fries', price: 8.90, description: 'Crispy fries with truffle oil' },
];

export default function RestaurantPage() {
  const router = useRouter();
  const [quantities, setQuantities] = useState<{ [key: number]: number }>({});

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
    return menuItems.reduce((total, item) => {
      return total + (item.price * (quantities[item.id] || 0));
    }, 0);
  };

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
        <h1 className="text-3xl font-bold">{sampleRestaurant.name}</h1>
        <p className="text-gray-600">{sampleRestaurant.vicinity}</p>
        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-semibold mt-2 inline-block">
          {sampleRestaurant.discountRate}% OFF
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
              Total: ${getTotal().toFixed(2)}
            </div>
            <button 
              className="bg-blue-500 text-white px-6 py-2 rounded-lg"
              onClick={() => {
                alert('Order placed successfully!');
                router.push('/home');
              }}
            >
              Place Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}