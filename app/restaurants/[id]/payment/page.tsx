// 'use client';
// import { useState, useEffect } from 'react';
// import { useRouter, useParams } from 'next/navigation';
// import { useWeb3 } from '@/app/contexts/Web3Context';
// import { getRestaurantService, Restaurant, BlockchainData } from '@/app/services/RestaurantService';
// import { ethers } from 'ethers';
// import toast from 'react-hot-toast';

// interface PaymentStatus {
//   stage: 'initial' | 'approving' | 'approved' | 'paying' | 'completed' | 'failed';
//   message: string;
// }

// export default function PaymentPage() {
//   const router = useRouter();
//   const params = useParams();
//   const { id } = params; // This is the Google Maps ID
  
//   const { 
//     paymentContract, 
//     usdtContract, 
//     isConnected, 
//     connectWallet,
//     account,
//     balance 
//   } = useWeb3();

//   const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
//   const [blockchainData, setBlockchainData] = useState<BlockchainData | null>(null);
//   const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
//     stage: 'initial',
//     message: 'Ready to process payment'
//   });
  
//   const [orderTotal, setOrderTotal] = useState<number>(0);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const loadRestaurantData = async () => {
//       try {
//         if (!isConnected || !paymentContract || !usdtContract) {
//           throw new Error('Wallet not connected');
//         }

//         const response = await fetch(`/api/restaurants/${id.split("_")[0]}`);
//         if (!response.ok) {
//           throw new Error('Failed to fetch restaurant');
//         }

//         const baseData = await response.json();
//         const restaurantService = getRestaurantService(paymentContract, usdtContract);
//         const [enhancedRestaurant] = await restaurantService.enhanceWithBlockchainData([baseData]);
        
//         if (!enhancedRestaurant.blockchainData?.isRegistered) {
//           throw new Error('Restaurant not registered on blockchain');
//         }

//         setRestaurant(enhancedRestaurant);
//         setBlockchainData(enhancedRestaurant.blockchainData);

//         // Get order total from localStorage
//         const storedOrder = localStorage.getItem('currentOrder');
//         if (storedOrder) {
//           const { total } = JSON.parse(storedOrder);
//           setOrderTotal(total);
//         }
//       } catch (error) {
//         console.error('Error loading data:', error);
//         toast.error('Failed to load payment details');
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadRestaurantData();
//   }, [id, isConnected, paymentContract, usdtContract]);

//   const getDiscountedAmount = () => {
//     if (!blockchainData) return orderTotal;
//     return orderTotal * (1 - blockchainData.discountRate / 100);
//   };

//   const handlePayment = async () => {
//     if (!restaurant || !blockchainData?.isRegistered) {
//       toast.error('Restaurant not properly registered');
//       return;
//     }

//     try {
//       const restaurantService = getRestaurantService(paymentContract!, usdtContract!);
//       const discountedAmountWei = ethers.utils.parseUnits(
//         getDiscountedAmount().toString(),
//         6 // USDT uses 6 decimals
//       );

//       setPaymentStatus({ stage: 'approving', message: 'Approving USDT...' });
      
//       // Process payment using Google Maps ID
//       const tx = await restaurantService.processPayment(
//         restaurant.id, // Using Google Maps ID
//         discountedAmountWei
//       );

//       setPaymentStatus({ stage: 'paying', message: 'Processing payment...' });
//       await tx.wait();

//       setPaymentStatus({ stage: 'completed', message: 'Payment successful!' });
//       toast.success('Payment completed successfully!');
      
//       // Save transaction details for success page
//       localStorage.setItem('lastTransaction', JSON.stringify({
//         amount: getDiscountedAmount().toFixed(2),
//         discount: blockchainData.discountRate,
//         timestamp: Date.now(),
//         transactionHash: tx.hash
//       }));
      
//       // Clear order
//       localStorage.removeItem('currentOrder');
      
//       // Redirect to success page
//       router.push(`/restaurants/${id}/payment/success`);
//     } catch (error: any) {
//       console.error('Payment error:', error);
//       setPaymentStatus({ 
//         stage: 'failed', 
//         message: error.message || 'Payment failed. Please try again.' 
//       });
//       toast.error('Payment failed. Please try again.');
//     }
//   };

//   // Rest of your component remains the same...
//   // (Keeping all the UI JSX as it was)

//   return (
//     <div className="min-h-screen p-6 bg-white space-y-6">
//       {/* Existing JSX remains the same */}
//       <h1 className="text-2xl font-bold">Complete Payment</h1>

//       {/* Wallet Info */}
//       <div className="bg-gray-50 rounded-lg p-4 space-y-2">
//         <div className="flex justify-between items-center">
//           <span className="text-gray-600">Connected Wallet</span>
//           <span className="font-mono text-sm">
//             {account.slice(0, 6)}...{account.slice(-4)}
//           </span>
//         </div>
//         <div className="flex justify-between items-center">
//           <span className="text-gray-600">USDT Balance</span>
//           <span className="font-mono">{parseFloat(balance).toFixed(2)} USDT</span>
//         </div>
//       </div>

//       {/* Price Information */}
//       <div className="bg-white rounded-lg p-6 shadow-sm space-y-3">
//         <div className="flex justify-between items-center">
//           <span>Original Amount</span>
//           <span>${orderTotal.toFixed(2)}</span>
//         </div>
//         {blockchainData && (
//           <div className="flex justify-between items-center text-green-600">
//             <span>Discount ({blockchainData.discountRate.toFixed(1)}%)</span>
//             <span>-${(orderTotal - getDiscountedAmount()).toFixed(2)}</span>
//           </div>
//         )}
//         <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
//           <span>Final Amount</span>
//           <span>${getDiscountedAmount().toFixed(2)} USDT</span>
//         </div>
//       </div>

//       {/* Payment Status */}
//       {paymentStatus.stage !== 'initial' && (
//         <div className={`text-center p-4 rounded-lg ${
//           paymentStatus.stage === 'failed' ? 'bg-red-100 text-red-800' : 
//           paymentStatus.stage === 'completed' ? 'bg-green-100 text-green-800' :
//           'bg-blue-100 text-blue-800'
//         }`}>
//           {paymentStatus.message}
//         </div>
//       )}

//       {/* Payment Button */}
//       <button
//         onClick={handlePayment}
//         disabled={
//           paymentStatus.stage !== 'initial' && 
//           paymentStatus.stage !== 'failed' || 
//           parseFloat(balance) < getDiscountedAmount()
//         }
//         className={`w-full bg-yellow-400 text-gray-900 font-semibold py-4 px-6 rounded-full
//           ${(paymentStatus.stage !== 'initial' && paymentStatus.stage !== 'failed') || 
//             parseFloat(balance) < getDiscountedAmount()
//             ? 'opacity-50 cursor-not-allowed'
//             : 'hover:bg-yellow-500'
//           }`}
//       >
//         {parseFloat(balance) < getDiscountedAmount()
//           ? 'Insufficient USDT Balance'
//           : 'Confirm Payment'
//         }
//       </button>
//     </div>
//   );
// }

'use client';
import { ethers } from 'ethers';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useWeb3 } from '@/app/contexts/Web3Context';
import toast from 'react-hot-toast';

export default function PaymentPage() {
  const { id } = useParams();
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
    if (!isConnected || !id) return;
    
    try {
      const restaurantAddress = await getRestaurantAddressByGoogleMapId(id as string);
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
      // First check if already registered
      const restaurantAddress = await getRestaurantAddressByGoogleMapId(id as string);
      if (restaurantAddress !== ethers.constants.AddressZero) {
        setIsRestaurantRegistered(true);
        toast.error('Restaurant is already registered');
        return;
      }
  
      const loadingToast = toast.loading('Registering restaurant...');
      await registerRestaurant(id as string);
      toast.dismiss(loadingToast);
      
      // Verify registration after transaction
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for blockchain update
      await checkRestaurantRegistration();
      
      toast.success('Restaurant registered successfully!');
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Check for specific error messages
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
      // Process the payment (approval is handled internally)
      await payByGoogleMapId(id as string, amount);
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