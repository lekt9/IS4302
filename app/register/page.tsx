'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { ethers } from 'ethers';
import PaymentContractABI from '../contracts/PaymentContract.json';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Place {
  place_id: string;
  name: string;
  formatted_address: string;
  contractAddress?: string;
}

const debugContract = async (contract: ethers.Contract, googleMapId: string) => {
  try {
    console.log('Debug Contract State:', {
      contractAddress: contract.address,
      googleMapId,
      signerAddress: await contract.signer.getAddress()
    });

    // Debug contract functions
    console.log('Contract functions:', {
      restaurants: contract.interface.getFunction('restaurants'),
      registerRestaurant: contract.interface.getFunction('registerRestaurant')
    });

    // Try to get all restaurants
    console.log('Attempting to read restaurant data...');
    let restaurantCount;
    try {
      const restaurants = await contract.restaurants;
      restaurantCount = restaurants.length;
      console.log('Total restaurants:', restaurantCount);
    } catch (e) {
      console.log('Error reading restaurant count:', e);
    }

    // Try to get specific restaurant
    try {
      const restaurantInfo = await contract.restaurants(googleMapId);
      console.log('Restaurant info by ID:', restaurantInfo);
    } catch (e) {
      console.log('Error reading specific restaurant:', e);
    }
  } catch (error) {
    console.error('Debug contract error:', error);
  }
};

const verifyContract = async (contract: ethers.Contract) => {
  try {
    const owner = await contract.owner();
    const signer = await contract.signer.getAddress();
    console.log('Contract verification:', {
      owner,
      signer,
      address: contract.address
    });
    return true;
  } catch (error) {
    console.error('Contract verification failed:', error);
    return false;
  }
};

export default function RegisterPage() {
  const router = useRouter();
  const { isConnected, connectWallet, signer } = useWeb3();
  const [googleMapId, setGoogleMapId] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [localContract, setLocalContract] = useState<ethers.Contract | null>(null);
  const [contractVerified, setContractVerified] = useState(false);

  useEffect(() => {
    const initializeContract = async () => {
      if (signer) {
        try {
          console.log('Initializing contract with:', {
            address: process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS,
            signer: await signer.getAddress()
          });

          const contract = new ethers.Contract(
            process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS!,
            PaymentContractABI,
            signer
          );

          const isVerified = await verifyContract(contract);
          if (isVerified) {
            setLocalContract(contract);
            setContractVerified(true);
            console.log('Contract initialized and verified');
          } else {
            toast.error('Contract verification failed');
          }
        } catch (error) {
          console.error('Contract initialization error:', error);
          toast.error('Failed to initialize contract');
        }
      }
    };

    initializeContract();
  }, [signer]);

  const searchPlaces = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      console.log('Searching places with query:', searchQuery);
      toast.loading('Searching restaurants...');
      const response = await fetch('/api/places/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      });
      
      const data = await response.json();
      console.log('Search results:', data);
      setSearchResults(data.results || []);
      toast.dismiss();
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search places');
    }
  };

  const checkRegistrationStatus = async (googleMapId: string) => {
    if (!localContract) return false;

    try {
      // Try different ways to check registration
      console.log('Checking registration for:', googleMapId);
      
      // Method 1: Direct call
      try {
        const restaurantInfo = await localContract.restaurants(googleMapId);
        console.log('Restaurant info:', restaurantInfo);
        if (restaurantInfo && restaurantInfo.googlemap_id) {
          return true;
        }
      } catch (e) {
        console.log('Method 1 check failed:', e);
      }

      // Method 2: Event check
      try {
        const filter = localContract.filters.RestaurantRegistered(null, googleMapId);
        const events = await localContract.queryFilter(filter);
        console.log('Registration events:', events);
        if (events.length > 0) {
          return true;
        }
      } catch (e) {
        console.log('Method 2 check failed:', e);
      }

      return false;
    } catch (error) {
      console.error('Registration check error:', error);
      return false;
    }
  };

  const handlePlaceSelect = async (place: Place) => {
    console.log('Selected place:', place);
    setSelectedPlace(place);
    setGoogleMapId(place.place_id);
    setSearchResults([]);

    if (localContract) {
      const isRegistered = await checkRegistrationStatus(place.place_id);
      if (isRegistered) {
        toast.error('This restaurant is already registered');
        setGoogleMapId('');
        setSelectedPlace(null);
      } else {
        toast.success('Restaurant selected');
      }
    }
  };

  const handleRegister = async () => {
    if (!isConnected || !localContract) {
      toast.error('Please check wallet connection');
      return;
    }

    if (!googleMapId) {
      toast.error('Please select a restaurant');
      return;
    }

    if (!contractVerified) {
      toast.error('Contract not properly initialized');
      return;
    }

    setLoading(true);
    try {
      // Debug current state
      await debugContract(localContract, googleMapId);

      // Final registration check
      const isRegistered = await checkRegistrationStatus(googleMapId);
      if (isRegistered) {
        toast.error('Restaurant is already registered');
        setLoading(false);
        return;
      }

      console.log('Proceeding with registration:', {
        googleMapId,
        contractAddress: localContract.address,
        signer: await localContract.signer.getAddress()
      });

      // Estimate gas first
      let gasLimit;
      try {
        const estimate = await localContract.estimateGas.registerRestaurant(googleMapId);
        gasLimit = estimate.mul(120).div(100); // Add 20% buffer
        console.log('Estimated gas limit:', gasLimit.toString());
      } catch (e) {
        console.log('Gas estimation failed, using default:', e);
        gasLimit = ethers.BigNumber.from(500000);
      }

      const tx = await localContract.registerRestaurant(googleMapId, {
        gasLimit,
      });

      console.log('Transaction sent:', tx.hash);
      const loadingToast = toast.loading('Registering restaurant...');

      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);

      toast.dismiss(loadingToast);
      toast.success('Restaurant registered successfully!');

      // Navigate to restaurant page
      const restaurantPath = `${googleMapId}_${localContract.address}`;
      await new Promise(resolve => setTimeout(resolve, 2000));
      router.push(`/restaurants/${restaurantPath}`);
    } catch (error: any) {
      console.error('Registration error:', {
        error,
        code: error.code,
        message: error.message,
        data: error.data
      });

      let errorMessage = 'Registration failed: ';
      if (error.data?.message?.includes('revert')) {
        const match = error.data.message.match(/revert\s(.+)/);
        errorMessage += match ? match[1] : error.data.message;
      } else if (error.reason) {
        errorMessage += error.reason;
      } else if (error.message) {
        errorMessage += error.message;
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Rest of your component remains the same...
  // (Keep all your existing UI JSX)

  return (
    // Your existing JSX...
    <div className="flex flex-col items-center min-h-screen p-6 bg-white">
      {/* Keep your existing UI components */}
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