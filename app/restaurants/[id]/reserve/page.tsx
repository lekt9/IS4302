'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useWeb3 } from '@/app/contexts/Web3Context';
import { getRestaurantService, Restaurant } from '@/app/services/RestaurantService';
import toast from 'react-hot-toast';

interface TimeSlot {
  value: string;
  label: string;
  available: boolean;
}

export default function ReservePage() {
  const router = useRouter();
  const params = useParams();
  const { id: mergedId } = params;
  const [gmaps_id, contractAddress] = typeof mergedId === 'string' ? mergedId.split('_') : [];
  const { isConnected, connectWallet, paymentContract, usdtContract } = useWeb3();
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestCount, setGuestCount] = useState(2);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load restaurant data
  useEffect(() => {
    const loadRestaurantData = async () => {
      try {
        const response = await fetch(`/api/restaurants/${gmaps_id}`);
        if (!response.ok) throw new Error('Failed to fetch restaurant');
        
        const baseData = await response.json();
        
        if (isConnected && paymentContract && usdtContract && contractAddress) {
          const restaurantService = getRestaurantService(paymentContract, usdtContract);
          const [enhancedRestaurant] = await restaurantService.enhanceWithBlockchainData([baseData]);
          
          // Only set restaurant data if the contract addresses match
          if (enhancedRestaurant.blockchainData?.address.toLowerCase() === contractAddress.toLowerCase()) {
            setRestaurant(enhancedRestaurant);
          } else {
            setRestaurant(baseData);
          }
        } else {
          setRestaurant(baseData);
        }
      } catch (error) {
        console.error('Error loading restaurant:', error);
        toast.error('Failed to load restaurant details');
      } finally {
        setLoading(false);
      }
    };

    if (gmaps_id) {
      loadRestaurantData();
    }
  }, [gmaps_id, contractAddress, isConnected, paymentContract, usdtContract]);

  // Generate time slots based on date selection
  useEffect(() => {
    if (!date) return;

    const generateTimeSlots = () => {
      const slots: TimeSlot[] = [];
      const selectedDate = new Date(date);
      const now = new Date();
      const isToday = selectedDate.toDateString() === now.toDateString();
      
      const startHour = isToday ? Math.max(now.getHours() + 1, 8) : 8;
      const endHour = 22;

      for (let hour = startHour; hour <= endHour; hour++) {
        // Full hour slot
        slots.push({
          value: `${hour.toString().padStart(2, '0')}:00`,
          label: `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`,
          available: true // In real app, check availability from smart contract
        });

        // Half hour slot
        if (hour !== endHour) {
          slots.push({
            value: `${hour.toString().padStart(2, '0')}:30`,
            label: `${hour % 12 || 12}:30 ${hour < 12 ? 'AM' : 'PM'}`,
            available: true // In real app, check availability from smart contract
          });
        }
      }
      
      setAvailableSlots(slots);
    };

    generateTimeSlots();
  }, [date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }
    if (!restaurant?.blockchainData?.isRegistered) {
      toast.error('This restaurant is not registered in our system');
      return;
    }
    if (!contractAddress) {
      toast.error('Invalid payment address');
      return;
    }

    setIsSubmitting(true);
    try {
      const reservationDetails = {
        restaurantId: gmaps_id,
        contractAddress,
        guestCount,
        date,
        time,
        timestamp: new Date(`${date} ${time}`).getTime()
      };
      localStorage.setItem('currentReservation', JSON.stringify(reservationDetails));

      router.push(`/restaurants/${gmaps_id}_${contractAddress}/payment`);
    } catch (error) {
      console.error('Error processing reservation:', error);
      toast.error('Failed to process reservation');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading reservation details...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-white">
      <h1 className="text-2xl font-bold mb-6">
        Make a Reservation {restaurant && `at ${restaurant.name}`}
      </h1>
      
      {!isConnected ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">Please connect your wallet to make a reservation</p>
          <button
            onClick={connectWallet}
            className="bg-yellow-400 text-gray-900 px-6 py-2 rounded-full hover:bg-yellow-500"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Guest Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Guests
            </label>
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                className="p-2 border rounded-full hover:bg-gray-50"
              >
                -
              </button>
              <span className="text-lg font-medium w-8 text-center">{guestCount}</span>
              <button
                type="button"
                onClick={() => setGuestCount(Math.min(10, guestCount + 1))}
                className="p-2 border rounded-full hover:bg-gray-50"
              >
                +
              </button>
            </div>
          </div>

          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              required
            />
          </div>

          {/* Time Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time
            </label>
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              required
              disabled={!date}
            >
              <option value="">Select time</option>
              {availableSlots.map((slot) => (
                <option 
                  key={slot.value} 
                  value={slot.value}
                  disabled={!slot.available}
                >
                  {slot.label} {!slot.available && '(Unavailable)'}
                </option>
              ))}
            </select>
          </div>

          {/* Restaurant Details */}
          {restaurant?.blockchainData && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Current Discount</span>
                <span className="font-semibold text-green-600">
                  {restaurant.blockchainData.discountRate.toFixed(1)}% OFF
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Traffic Level</span>
                <span className={`font-semibold ${
                  restaurant.blockchainData.trafficLevel === 'Low' ? 'text-green-600' :
                  restaurant.blockchainData.trafficLevel === 'Medium' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {restaurant.blockchainData.trafficLevel}
                </span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !date || !time}
            className={`w-full bg-yellow-400 text-gray-900 font-semibold py-4 px-6 rounded-full
              ${isSubmitting || !date || !time
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-yellow-500'
              } transition-colors`}
          >
            {isSubmitting ? 'Processing...' : 'Continue to Payment'}
          </button>
        </form>
      )}
    </div>
  );
}