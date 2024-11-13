'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWeb3 } from '@/app/contexts/Web3Context';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const { isConnected, connectWallet, paymentContract } = useWeb3();
  const [googleMapId, setGoogleMapId] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);

  // Search for places using Google Places API
  const searchPlaces = async () => {
    try {
      const response = await fetch('/api/places/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      });
      
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Error searching places:', error);
      toast.error('Failed to search places');
    }
  };

  const handlePlaceSelect = (place: any) => {
    setSelectedPlace(place);
    setGoogleMapId(place.place_id);
    setSearchResults([]);
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
      toast.loading('Registering restaurant...');
      await tx.wait();
      
      toast.success('Restaurant registered successfully!');
      router.push('/home');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Failed to register restaurant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-white">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center">Register Your Restaurant</h1>

        {!isConnected ? (
          <div className="text-center space-y-4">
            <p className="text-gray-600">Connect your wallet to register your restaurant</p>
            <button
              onClick={connectWallet}
              className="bg-yellow-400 text-gray-900 px-6 py-2 rounded-full hover:bg-yellow-500"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Search Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Search Your Restaurant
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter restaurant name"
                  className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                />
                <button
                  onClick={searchPlaces}
                  className="bg-yellow-400 text-gray-900 px-6 py-2 rounded-lg hover:bg-yellow-500"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y">
                {searchResults.map((place) => (
                  <div
                    key={place.place_id}
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handlePlaceSelect(place)}
                  >
                    <h3 className="font-medium">{place.name}</h3>
                    <p className="text-sm text-gray-600">{place.formatted_address}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Place */}
            {selectedPlace && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h3 className="font-medium">Selected Restaurant:</h3>
                <p>{selectedPlace.name}</p>
                <p className="text-sm text-gray-600">{selectedPlace.formatted_address}</p>
              </div>
            )}

            {/* Register Button */}
            <button
              onClick={handleRegister}
              disabled={loading || !googleMapId}
              className={`w-full bg-yellow-400 text-gray-900 font-semibold py-4 px-6 rounded-full
                ${(loading || !googleMapId)
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-yellow-500'
                } transition-colors`}
            >
              {loading ? 'Registering...' : 'Register Restaurant'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}