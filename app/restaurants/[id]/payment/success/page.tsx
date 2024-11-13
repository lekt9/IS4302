// 'use client';
// import { useRouter } from 'next/navigation';
// import { useEffect } from 'react';

// export default function PaymentSuccessPage() {
//   const router = useRouter();

//   useEffect(() => {
//     // 3秒后自动返回首页
//     const timer = setTimeout(() => {
//       router.push('/home');
//     }, 3000);

//     return () => clearTimeout(timer);
//   }, [router]);

//   return (
//     <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
//       <div className="text-center space-y-4">
//         <span className="text-5xl">✅</span>
//         <h1 className="text-2xl font-bold">Payment successful!</h1>
//         <p className="text-gray-600">Thank you for dining with us.</p>
//         <p className="text-sm text-gray-500">Redirecting to home page...</p>
//       </div>
//     </div>
//   );
// }

'use client';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useWeb3 } from '@/app/contexts/Web3Context';
import { getRestaurantService, Restaurant, BlockchainData } from '@/app/services/RestaurantService';


interface TransactionDetails {
  amount: string;
  discount: number;
  timestamp: number;
  transactionHash: string;
}

export default function PaymentSuccessPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const { paymentContract, usdtContract } = useWeb3();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null);

  useEffect(() => {
    // Get transaction details from localStorage
    const storedTransaction = localStorage.getItem('lastTransaction');
    if (storedTransaction) {
      setTransaction(JSON.parse(storedTransaction));
    }

    // Fetch restaurant details
    const fetchRestaurantDetails = async () => {
      try {
        const response = await fetch(`/api/restaurants/${id}`);
        if (!response.ok) throw new Error('Failed to fetch restaurant');
        
        const baseData = await response.json();
        if (paymentContract && usdtContract) {
          const restaurantService = getRestaurantService(paymentContract, usdtContract);
          const [enhancedRestaurant] = await restaurantService.enhanceWithBlockchainData([baseData]);
          setRestaurant(enhancedRestaurant);
        }
      } catch (error) {
        console.error('Error fetching restaurant details:', error);
      }
    };

    fetchRestaurantDetails();

    // Auto redirect after 5 seconds
    const timer = setTimeout(() => {
      router.push('/home');
    }, 5000);

    return () => {
      clearTimeout(timer);
      localStorage.removeItem('lastTransaction');
    };
  }, [id, router, paymentContract, usdtContract]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 space-y-6">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Success Message */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Payment Successful!</h1>
          <p className="text-gray-600">
            Thank you for dining at {restaurant?.name}
          </p>
        </div>

        {/* Transaction Details */}
        {transaction && (
          <div className="space-y-4 border-t pt-4">
            <h2 className="text-lg font-semibold">Transaction Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount Paid:</span>
                <span className="font-medium">{transaction.amount} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Discount Applied:</span>
                <span className="font-medium text-green-600">{transaction.discount}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">{formatDate(transaction.timestamp)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-gray-600">Transaction Hash:</span>
                <a
                  href={`https://sepolia.etherscan.io/tx/${transaction.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 truncate font-mono text-xs"
                >
                  {transaction.transactionHash}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Status Message */}
        <div className="text-center text-sm text-gray-500">
          <p>Redirecting to home page in a few seconds...</p>
        </div>

        {/* Manual Return Button */}
        <button
          onClick={() => router.push('/home')}
          className="w-full bg-yellow-400 text-gray-900 font-semibold py-3 px-6 rounded-lg hover:bg-yellow-500 transition-colors"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
}