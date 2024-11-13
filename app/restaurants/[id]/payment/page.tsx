// 'use client';
// import { useState } from 'react';
// import { useRouter } from 'next/navigation';

// const paymentMethods = [
//   { id: 'credit', label: 'Credit Card' },
//   { id: 'paypal', label: 'PayPal' },
//   { id: 'apple', label: 'Apple Pay' }
// ];

// export default function PaymentPage() {
//   const router = useRouter();
//   const [selectedMethod, setSelectedMethod] = useState('');
//   const [isProcessing, setIsProcessing] = useState(false);

//   const originalPrice = 50.00;
//   const discountRate = 0.2; // 20% discount
//   const discountedPrice = originalPrice * (1 - discountRate);

//   const handlePayment = async () => {
//     if (!selectedMethod) {
//       alert('Please select a payment method');
//       return;
//     }

//     setIsProcessing(true);
    
//     // 模拟支付处理
//     try {
//       await new Promise(resolve => setTimeout(resolve, 2000));
//       router.push('payment/success');
//     } catch (error) {
//       alert('Payment failed. Please try again.');
//     } finally {
//       setIsProcessing(false);
//     }
//   };

//   return (
//     <div className="min-h-screen p-6 bg-white space-y-6">
//       <h1 className="text-2xl font-bold">Discount Payment</h1>

//       {/* 价格信息 */}
//       <div className="bg-white rounded-lg p-6 shadow-sm space-y-2">
//         <div className="flex justify-between items-center">
//           <span>Original Price:</span>
//           <span>${originalPrice.toFixed(2)}</span>
//         </div>
//         <div className="flex justify-between items-center text-yellow-500 font-bold">
//           <span>Discounted Price:</span>
//           <span>${discountedPrice.toFixed(2)}</span>
//         </div>
//       </div>

//       {/* 支付方式选择 */}
//       <div className="bg-white rounded-lg p-6 shadow-sm">
//         <h2 className="text-xl font-bold mb-4">Payment Options</h2>
//         <div className="space-y-3">
//           {paymentMethods.map((method) => (
//             <label
//               key={method.id}
//               className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer"
//             >
//               <input
//                 type="radio"
//                 name="payment"
//                 value={method.id}
//                 checked={selectedMethod === method.id}
//                 onChange={(e) => setSelectedMethod(e.target.value)}
//                 className="h-4 w-4 text-yellow-400"
//               />
//               <span>{method.label}</span>
//             </label>
//           ))}
//         </div>
//       </div>

//       <button
//         onClick={handlePayment}
//         disabled={isProcessing || !selectedMethod}
//         className="w-full bg-yellow-400 text-gray-900 font-semibold py-4 px-6 rounded-full disabled:bg-gray-300"
//       >
//         {isProcessing ? 'Processing...' : 'Confirm Payment'}
//       </button>
//     </div>
//   );
// }


'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useWeb3 } from '@/app/contexts/Web3Context';
import { getRestaurantService, Restaurant, BlockchainData } from '@/app/services/RestaurantService';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

interface PaymentStatus {
  stage: 'initial' | 'approving' | 'approved' | 'paying' | 'completed' | 'failed';
  message: string;
}

export default function PaymentPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  
  const { 
    paymentContract, 
    usdtContract, 
    isConnected, 
    connectWallet,
    account,
    balance 
  } = useWeb3();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [blockchainData, setBlockchainData] = useState<BlockchainData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    stage: 'initial',
    message: 'Ready to process payment'
  });
  
  // Payment details from previous page (you might want to pass these through state or context)
  const [orderTotal, setOrderTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRestaurantData = async () => {
      try {
        if (!isConnected || !paymentContract || !usdtContract) {
          throw new Error('Wallet not connected');
        }

        const response = await fetch(`/api/restaurants/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch restaurant');
        }

        const baseData = await response.json();
        const restaurantService = getRestaurantService(paymentContract, usdtContract);
        const [enhancedRestaurant] = await restaurantService.enhanceWithBlockchainData([baseData]);
        
        setRestaurant(enhancedRestaurant);
        setBlockchainData(enhancedRestaurant.blockchainData || null);

        // Get order total from localStorage or state management
        const storedOrder = localStorage.getItem('currentOrder');
        if (storedOrder) {
          const { total } = JSON.parse(storedOrder);
          setOrderTotal(total);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load payment details');
      } finally {
        setLoading(false);
      }
    };

    loadRestaurantData();
  }, [id, isConnected, paymentContract, usdtContract]);

  const getDiscountedAmount = () => {
    if (!blockchainData) return orderTotal;
    return orderTotal * (1 - blockchainData.discountRate / 100);
  };

  const handlePayment = async () => {
    if (!restaurant?.blockchainData?.address || !blockchainData) {
      toast.error('Restaurant not properly registered');
      return;
    }

    try {
      const restaurantService = getRestaurantService(paymentContract!, usdtContract!);
      const discountedAmount = getDiscountedAmount().toString();

      await restaurantService.processPayment(
        restaurant.blockchainData.address,
        discountedAmount,
        () => setPaymentStatus({ stage: 'approving', message: 'Approving USDT...' }),
        () => setPaymentStatus({ stage: 'approved', message: 'USDT Approved' }),
        () => setPaymentStatus({ stage: 'paying', message: 'Processing payment...' })
      );

      setPaymentStatus({ stage: 'completed', message: 'Payment successful!' });
      toast.success('Payment completed successfully!');
      
      // Clear order from localStorage
      localStorage.removeItem('currentOrder');
      
      // Redirect to success page
      router.push(`/restaurants/${id}/payment/success`);
    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentStatus({ 
        stage: 'failed', 
        message: error.message || 'Payment failed. Please try again.' 
      });
      toast.error('Payment failed. Please try again.');
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center">
        <button
          onClick={connectWallet}
          className="bg-yellow-400 text-gray-900 px-6 py-2 rounded-full hover:bg-yellow-500"
        >
          Connect Wallet to Pay
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center">
        <div className="text-xl">Loading payment details...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-white space-y-6">
      <h1 className="text-2xl font-bold">Complete Payment</h1>

      {/* Wallet Info */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Connected Wallet</span>
          <span className="font-mono text-sm">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">USDT Balance</span>
          <span className="font-mono">{parseFloat(balance).toFixed(2)} USDT</span>
        </div>
      </div>

      {/* Price Information */}
      <div className="bg-white rounded-lg p-6 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <span>Original Amount</span>
          <span>${orderTotal.toFixed(2)}</span>
        </div>
        {blockchainData && (
          <div className="flex justify-between items-center text-green-600">
            <span>Discount ({blockchainData.discountRate.toFixed(1)}%)</span>
            <span>-${(orderTotal - getDiscountedAmount()).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
          <span>Final Amount</span>
          <span>${getDiscountedAmount().toFixed(2)} USDT</span>
        </div>
      </div>

      {/* Payment Status */}
      {paymentStatus.stage !== 'initial' && (
        <div className={`text-center p-4 rounded-lg ${
          paymentStatus.stage === 'failed' ? 'bg-red-100 text-red-800' : 
          paymentStatus.stage === 'completed' ? 'bg-green-100 text-green-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {paymentStatus.message}
        </div>
      )}

      {/* Payment Button */}
      <button
        onClick={handlePayment}
        disabled={
          paymentStatus.stage !== 'initial' && 
          paymentStatus.stage !== 'failed' || 
          parseFloat(balance) < getDiscountedAmount()
        }
        className={`w-full bg-yellow-400 text-gray-900 font-semibold py-4 px-6 rounded-full
          ${(paymentStatus.stage !== 'initial' && paymentStatus.stage !== 'failed') || 
            parseFloat(balance) < getDiscountedAmount()
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-yellow-500'
          }`}
      >
        {parseFloat(balance) < getDiscountedAmount()
          ? 'Insufficient USDT Balance'
          : 'Confirm Payment'
        }
      </button>
    </div>
  );
}