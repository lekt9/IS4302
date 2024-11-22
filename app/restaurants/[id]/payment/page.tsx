'use client';
import { ethers } from 'ethers';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useWeb3 } from '@/app/contexts/Web3Context';
import toast from 'react-hot-toast';

export default function PaymentPage() {
  const { id } = useParams();
  const [googleMapsId, contractId] = (id as string).split('_');
  
  const { 
    account, 
    balance, 
    isConnected, 
    connectWallet, 
    payByGoogleMapId,
    mintTestUSDT,
    registerRestaurant,
    getRestaurantAddressByGoogleMapId
  } = useWeb3();

  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [discountRate, setDiscountRate] = useState(0);
  const [finalAmount, setFinalAmount] = useState('0');
  const [isRestaurantRegistered, setIsRestaurantRegistered] = useState(false);

  useEffect(() => {
    checkRestaurantRegistration();
  }, [id, isConnected]);

  const checkRestaurantRegistration = async () => {
    if (!isConnected || !contractId) return;
    
    try {
      const restaurantAddress = await getRestaurantAddressByGoogleMapId(googleMapsId);
      setIsRestaurantRegistered(restaurantAddress !== ethers.constants.AddressZero);
    } catch (error) {
      console.error('Error checking restaurant registration:', error);
      setIsRestaurantRegistered(false);
    }
  };

  const handleRegisterRestaurant = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }
  
    setLoading(true);
    try {
      const loadingToast = toast.loading('Registering restaurant...');
      await registerRestaurant(contractId);
      toast.dismiss(loadingToast);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      await checkRestaurantRegistration();
      
      toast.success('Restaurant registered successfully!');
    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error?.data?.message?.includes('Restaurant already registered') || 
          error?.message?.includes('Restaurant already registered')) {
        setIsRestaurantRegistered(true);
        toast.error('Restaurant is already registered');
      } else {
        toast.error('Failed to register restaurant. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMintTestUSDT = async () => {
    try {
      await mintTestUSDT('1000');
      toast.success('Test USDT minted successfully');
    } catch (error) {
      toast.error('Failed to mint test USDT');
    }
  };

  const handlePayment = async () => {
    if (!isConnected || !amount) return;
    
    setLoading(true);
    try {
      await payByGoogleMapId(googleMapsId, amount);
      toast.success('Payment successful!');
      setAmount('');
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Complete Payment</h1>
      
      {/* Wallet Connection Info */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span>Connected Wallet</span>
          {isConnected ? (
            <span className="text-sm text-gray-600">{`${account.slice(0, 6)}...${account.slice(-4)}`}</span>
          ) : (
            <button 
              onClick={connectWallet}
              className="text-blue-500 hover:text-blue-600"
            >
              Connect Wallet
            </button>
          )}
        </div>
        <div className="flex justify-between">
          <span>USDT Balance</span>
          <span>{balance} USDT</span>
        </div>
      </div>

      {/* Test USDT Minting */}
      <button
        onClick={handleMintTestUSDT}
        className="w-full mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Get Test USDT (1000)
      </button>

      {/* Restaurant Registration Status */}
      {!isRestaurantRegistered && (
        <div className="mb-4">
          <div className="bg-yellow-100 p-4 rounded-lg mb-2">
            <p className="text-yellow-800">This restaurant needs to be registered first.</p>
          </div>
          <button
            onClick={handleRegisterRestaurant}
            disabled={loading || !isConnected}
            className="w-full py-2 px-4 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Registering...' : 'Register Restaurant'}
          </button>
        </div>
      )}

      {/* Payment Form - Only show if restaurant is registered */}
      {isRestaurantRegistered && (
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <span>Original Amount</span>
              <span>${amount || '0.00'}</span>
            </div>
            <div className="flex justify-between mb-1 text-green-500">
              <span>Discount ({discountRate}%)</span>
              <span>-${((parseFloat(amount) || 0) * (discountRate / 100)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Final Amount</span>
              <span>${finalAmount} USDT</span>
            </div>
          </div>

          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full p-2 border rounded"
          />

          <button
            onClick={handlePayment}
            disabled={loading || !isConnected || !amount}
            className="w-full py-2 px-4 bg-yellow-400 rounded hover:bg-yellow-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Confirm Payment'}
          </button>
        </div>
      )}
    </div>
  );
}