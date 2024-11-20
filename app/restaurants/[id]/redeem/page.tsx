'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWeb3 } from '@/app/contexts/Web3Context';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

export default function RedeemPage() {
  const router = useRouter();
  const { paymentContract, isConnected, connectWallet, account } = useWeb3();
  const [balance, setBalance] = useState<string>('0');
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    const loadBalanceData = async () => {
      try {
        if (!isConnected || !paymentContract || !account) {
          setLoading(false);
          return;
        }

        // Check if restaurant is registered
        const registered = await paymentContract.isRegistered(account);
        setIsRegistered(registered);

        if (registered) {
          // Get balance
          const balance = await paymentContract.balances(account);
          setBalance(ethers.utils.formatUnits(balance, 6)); // USDT uses 6 decimals
        }
      } catch (error) {
        console.error('Error loading balance:', error);
        toast.error('Failed to load balance');
      } finally {
        setLoading(false);
      }
    };

    loadBalanceData();
  }, [isConnected, paymentContract, account]);

  const handleRedeem = async () => {
    if (!isConnected || !paymentContract) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      setRedeeming(true);
      const tx = await paymentContract.redeem();
      toast.loading('Processing redemption...');
      await tx.wait();
      
      toast.success('Redemption successful!');
      setBalance('0'); // Reset balance after successful redemption
    } catch (error: any) {
      console.error('Redemption error:', error);
      toast.error(error.message || 'Failed to redeem tokens');
    } finally {
      setRedeeming(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center">
        <button
          onClick={connectWallet}
          className="bg-yellow-400 text-gray-900 px-6 py-2 rounded-full hover:bg-yellow-500"
        >
          Connect Wallet to View Balance
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center">
        <div className="text-xl">Loading balance...</div>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center">
        <div className="text-xl text-red-600">
          This wallet is not registered as a restaurant
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-white">
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Restaurant Balance</h1>

        {/* Wallet Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Connected Wallet</span>
            <span className="font-mono text-sm">
              {account.slice(0, 6)}...{account.slice(-4)}
            </span>
          </div>
        </div>

        {/* Balance Card */}
        <div className="bg-white rounded-lg p-6 shadow-lg space-y-4">
          <div className="text-center">
            <div className="text-gray-600 mb-2">Available Balance</div>
            <div className="text-3xl font-bold">{parseFloat(balance).toFixed(2)} USDT</div>
          </div>

          <button
            onClick={handleRedeem}
            disabled={redeeming || parseFloat(balance) === 0}
            className={`w-full bg-yellow-400 text-gray-900 font-semibold py-4 px-6 rounded-full
              ${(redeeming || parseFloat(balance) === 0)
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-yellow-500'
              } transition-colors`}
          >
            {redeeming 
              ? 'Processing...' 
              : parseFloat(balance) === 0 
                ? 'No Balance to Redeem'
                : 'Redeem USDT'}
          </button>
        </div>

        {/* Transaction History (Optional) */}
        {/* Could add transaction history here if needed */}
      </div>
    </div>
  );
}