'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const { isConnected, connectWallet, paymentContract } = useWeb3();
  const [googleMapId, setGoogleMapId] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);

  const searchPlaces = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      toast.loading('Searching restaurants...');
      const response = await fetch('/api/places/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      });
      
      const data = await response.json();
      setSearchResults(data.results || []);
      toast.dismiss();
    } catch (error) {
      console.error('Error searching places:', error);
      toast.error('Failed to search places');
    }
  };

  const handlePlaceSelect = (place: any) => {
    setSelectedPlace(place);
    setGoogleMapId(place.place_id);
    setSearchResults([]);
    toast.success('Restaurant selected');
  };

  const handleRegister = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!googleMapId) {
      toast.error('Please select a restaurant');
      return;
    }

    setLoading(true);
    try {
      const tx = await paymentContract?.registerRestaurant(googleMapId);
      const loadingToast = toast.loading('Registering restaurant...');
      await tx.wait();
      
      toast.dismiss(loadingToast);
      toast.success('Restaurant registered successfully!');
      router.push('/home');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Failed to register restaurant');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-white">
        <div className="max-w-md w-full space-y-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900">Register Restaurant</h1>
          <p className="text-lg text-gray-600">
            Connect your wallet to register your restaurant and start offering discounts
          </p>
          <button
            onClick={connectWallet}
            className="w-full bg-yellow-400 text-gray-900 font-semibold py-4 px-6 rounded-full hover:bg-yellow-500 transition-colors"
          >
            Connect Wallet
          </button>
          <Link href="/" className="block text-sm text-gray-500 hover:text-gray-700">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen p-6 bg-white">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Register Restaurant</h1>
          <p className="mt-2 text-lg text-gray-600">
            Search and select your restaurant to register
          </p>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchPlaces()}
              placeholder="Enter restaurant name or address"
              className="w-full p-4 border-2 border-gray-200 rounded-full focus:outline-none focus:border-yellow-400 transition-colors"
            />
            <button
              onClick={searchPlaces}
              disabled={!searchQuery.trim()}
              className="w-full bg-yellow-400 text-gray-900 font-semibold py-4 px-6 rounded-full hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Search Restaurant
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="border-2 border-gray-100 rounded-2xl p-4 space-y-3 shadow-sm">
              <h2 className="font-semibold text-gray-900">Search Results</h2>
              {searchResults.map((place) => (
                <div
                  key={place.place_id}
                  onClick={() => handlePlaceSelect(place)}
                  className="p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="font-medium text-gray-900">{place.name}</div>
                  <div className="text-sm text-gray-600">{place.formatted_address}</div>
                </div>
              ))}
            </div>
          )}

          {selectedPlace && (
            <div className="border-2 border-yellow-200 rounded-2xl p-4 bg-yellow-50">
              <h2 className="font-semibold text-gray-900 mb-2">Selected Restaurant</h2>
              <div className="font-medium text-gray-900">{selectedPlace.name}</div>
              <div className="text-sm text-gray-600">{selectedPlace.formatted_address}</div>
            </div>
          )}

          <button
            onClick={handleRegister}
            disabled={loading || !googleMapId}
            className={`w-full bg-green-500 text-white font-semibold py-4 px-6 rounded-full ${
              loading || !googleMapId 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-green-600'
            } transition-colors`}
          >
            {loading ? 'Registering...' : 'Register Restaurant'}
          </button>

          <Link 
            href="/" 
            className="block text-center text-sm text-gray-500 hover:text-gray-700"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}