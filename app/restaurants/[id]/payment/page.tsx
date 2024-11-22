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
  const { id } = params; // This is the Google Maps ID
  
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
  
  const [orderTotal, setOrderTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRestaurantData = async () => {
      try {
        if (!isConnected || !paymentContract || !usdtContract) {
          throw new Error('Wallet not connected');
        }

        const response = await fetch(`/api/restaurants/${id.split("_")[0]}`);
        if (!response.ok) {
          throw new Error('Failed to fetch restaurant');
        }

        const baseData = await response.json();
        const restaurantService = getRestaurantService(paymentContract, usdtContract);
        const [enhancedRestaurant] = await restaurantService.enhanceWithBlockchainData([baseData]);
        
        if (!enhancedRestaurant.blockchainData?.isRegistered) {
          throw new Error('Restaurant not registered on blockchain');
        }

        setRestaurant(enhancedRestaurant);
        setBlockchainData(enhancedRestaurant.blockchainData);

        // Get order total from localStorage
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
    if (!restaurant || !blockchainData?.isRegistered) {
      toast.error('Restaurant not properly registered');
      return;
    }

    try {
      const restaurantService = getRestaurantService(paymentContract!, usdtContract!);
      const discountedAmountWei = ethers.utils.parseUnits(
        getDiscountedAmount().toString(),
        6 // USDT uses 6 decimals
      );

      setPaymentStatus({ stage: 'approving', message: 'Approving USDT...' });
      
      // Process payment using Google Maps ID
      const tx = await restaurantService.processPayment(
        restaurant.id, // Using Google Maps ID
        discountedAmountWei
      );

      setPaymentStatus({ stage: 'paying', message: 'Processing payment...' });
      await tx.wait();

      setPaymentStatus({ stage: 'completed', message: 'Payment successful!' });
      toast.success('Payment completed successfully!');
      
      // Save transaction details for success page
      localStorage.setItem('lastTransaction', JSON.stringify({
        amount: getDiscountedAmount().toFixed(2),
        discount: blockchainData.discountRate,
        timestamp: Date.now(),
        transactionHash: tx.hash
      }));
      
      // Clear order
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

  // Rest of your component remains the same...
  // (Keeping all the UI JSX as it was)

  return (
    <div className="min-h-screen p-6 bg-white space-y-6">
      {/* Existing JSX remains the same */}
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