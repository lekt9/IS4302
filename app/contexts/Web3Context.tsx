// 'use client';
// import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// import { ethers } from 'ethers';
// import PaymentContractABI from '../../smartcontract/build/contracts/PaymentContract.json';
// import MockUSDTABI from '../../smartcontract/build/contracts/MockUSDT.json';
// import toast from 'react-hot-toast';

// declare global {
//   interface Window {
//     ethereum?: any;
//   }
// }

// interface Web3ContextType {
//   provider: ethers.providers.Web3Provider | null;
//   signer: ethers.Signer | null;
//   paymentContract: ethers.Contract | null;
//   usdtContract: ethers.Contract | null;
//   account: string;
//   connectWallet: () => Promise<void>;
//   isConnected: boolean;
//   balance: string;
//   registerRestaurant: (googleMapId: string) => Promise<void>;
//   payByGoogleMapId: (googleMapId: string, amount: string) => Promise<void>;
//   getRestaurantAddressByGoogleMapId: (googleMapId: string) => Promise<string>;
//   getRestaurantsByRatio: () => Promise<string[]>;
//   redeemBalance: () => Promise<void>;
//   calculateCustomRatio: (restaurantAddress: string) => Promise<string>;
// }

// const Web3Context = createContext<Web3ContextType>({
//   provider: null,
//   signer: null,
//   paymentContract: null,
//   usdtContract: null,
//   account: '',
//   connectWallet: async () => {},
//   isConnected: false,
//   balance: '0',
//   registerRestaurant: async () => {},
//   payByGoogleMapId: async () => {},
//   getRestaurantAddressByGoogleMapId: async () => '',
//   getRestaurantsByRatio: async () => [],
//   redeemBalance: async () => {},
//   calculateCustomRatio: async () => '0',
// });

// export function Web3Provider({ children }: { children: ReactNode }) {
//   const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
//   const [signer, setSigner] = useState<ethers.Signer | null>(null);
//   const [paymentContract, setPaymentContract] = useState<ethers.Contract | null>(null);
//   const [usdtContract, setUsdtContract] = useState<ethers.Contract | null>(null);
//   const [account, setAccount] = useState('');
//   const [isConnected, setIsConnected] = useState(false);
//   const [balance, setBalance] = useState('0');

//   const PAYMENT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS;
//   const USDT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_USDT_CONTRACT_ADDRESS;

//   useEffect(() => {
//     if (typeof window !== 'undefined' && window.ethereum) {
//       const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
//       setProvider(web3Provider);

//       // Check if already connected
//       web3Provider.listAccounts().then(accounts => {
//         if (accounts.length > 0) {
//           handleAccountsChanged(accounts);
//         }
//       });

//       // Setup event listeners
//       window.ethereum.on('accountsChanged', handleAccountsChanged);
//       window.ethereum.on('chainChanged', () => window.location.reload());

//       return () => {
//         if (window.ethereum.removeListener) {
//           window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
//           window.ethereum.removeListener('chainChanged', () => {});
//         }
//       };
//     }
//   }, []);

//   const handleAccountsChanged = async (accounts: string[]) => {
//     if (accounts.length === 0) {
//       setIsConnected(false);
//       setAccount('');
//       setSigner(null);
//       setPaymentContract(null);
//       setUsdtContract(null);
//       toast.error('Please connect your wallet');
//     } else if (accounts[0] !== account) {
//       const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
//       const web3Signer = web3Provider.getSigner();
      
//       setAccount(accounts[0]);
//       setSigner(web3Signer);
//       setIsConnected(true);
      
//       if (PAYMENT_CONTRACT_ADDRESS && USDT_CONTRACT_ADDRESS) {
//         setupContracts(web3Signer);
//       }
      
//       await updateBalance(accounts[0], web3Provider);
//     }
//   };

//   const setupContracts = (web3Signer: ethers.Signer) => {
//     try {
//       const payment = new ethers.Contract(
//         PAYMENT_CONTRACT_ADDRESS!,
//         PaymentContractABI.abi,
//         web3Signer
//       );
      
//       const usdt = new ethers.Contract(
//         USDT_CONTRACT_ADDRESS!,
//         MockUSDTABI.abi,
//         web3Signer
//       );

//       setPaymentContract(payment);
//       setUsdtContract(usdt);
//     } catch (error) {
//       console.error('Error setting up contracts:', error);
//       toast.error('Failed to setup contracts');
//     }
//   };

//   const updateBalance = async (address: string, provider: ethers.providers.Web3Provider) => {
//     if (!USDT_CONTRACT_ADDRESS) return;

//     try {
//       const usdt = new ethers.Contract(
//         USDT_CONTRACT_ADDRESS,
//         MockUSDTABI.abi,
//         provider
//       );
//       const balance = await usdt.balanceOf(address);
//       setBalance(ethers.utils.formatUnits(balance, 6)); // USDT uses 6 decimals
//     } catch (error) {
//       console.error('Error fetching balance:', error);
//     }
//   };

//   const connectWallet = async () => {
//     if (!window.ethereum) {
//       toast.error('Please install MetaMask');
//       return;
//     }

//     try {
//       const accounts = await window.ethereum.request({ 
//         method: 'eth_requestAccounts' 
//       });
      
//       if (accounts.length > 0) {
//         const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
//         const web3Signer = web3Provider.getSigner();
        
//         setProvider(web3Provider);
//         setSigner(web3Signer);
//         setAccount(accounts[0]);
//         setIsConnected(true);

//         if (PAYMENT_CONTRACT_ADDRESS && USDT_CONTRACT_ADDRESS) {
//           setupContracts(web3Signer);
//         }

//         await updateBalance(accounts[0], web3Provider);
//         toast.success('Wallet connected successfully!');
//       }
//     } catch (error) {
//       console.error('Error connecting wallet:', error);
//       toast.error('Failed to connect wallet');
//     }
//   };

//   const registerRestaurant = async (googleMapId: string) => {
//     if (!paymentContract || !account) {
//       toast.error('Please connect your wallet first');
//       return;
//     }

//     try {
//       const tx = await paymentContract.registerRestaurant(googleMapId);
//       await tx.wait();
//       toast.success('Restaurant registered successfully!');
//     } catch (error: any) {
//       console.error('Error registering restaurant:', error);
//       toast.error(error.reason || 'Failed to register restaurant');
//     }
//   };

//   const payByGoogleMapId = async (googleMapId: string, amount: string) => {
//     if (!paymentContract || !usdtContract || !account) {
//       toast.error('Please connect your wallet first');
//       return;
//     }

//     try {
//       // Convert amount to USDT units (6 decimals)
//       const amountInWei = ethers.utils.parseUnits(amount, 6);
      
//       // First approve the payment contract to spend USDT
//       const approveTx = await usdtContract.approve(PAYMENT_CONTRACT_ADDRESS, amountInWei);
//       await approveTx.wait();
      
//       // Then make the payment
//       const payTx = await paymentContract.payByGoogleMapId(googleMapId, amountInWei);
//       await payTx.wait();
      
//       // Update balance after payment
//       await updateBalance(account, provider!);
//       toast.success('Payment processed successfully!');
//     } catch (error: any) {
//       console.error('Error processing payment:', error);
//       toast.error(error.reason || 'Failed to process payment');
//     }
//   };

//   const getRestaurantAddressByGoogleMapId = async (googleMapId: string): Promise<string> => {
//     if (!paymentContract) {
//       toast.error('Contract not initialized');
//       return '';
//     }

//     try {
//       const address = await paymentContract.getRestaurantAddressByGoogleMapId(googleMapId);
//       return address;
//     } catch (error) {
//       console.error('Error getting restaurant address:', error);
//       throw error;
//     }
//   };

//   const getRestaurantsByRatio = async (): Promise<string[]> => {
//     if (!paymentContract) {
//       toast.error('Contract not initialized');
//       return [];
//     }

//     try {
//       const restaurants = await paymentContract.getRestaurantsByRatio();
//       return restaurants;
//     } catch (error) {
//       console.error('Error getting restaurants:', error);
//       throw error;
//     }
//   };

//   const redeemBalance = async () => {
//     if (!paymentContract || !account) {
//       toast.error('Please connect your wallet first');
//       return;
//     }

//     try {
//       const tx = await paymentContract.redeem();
//       await tx.wait();
//       await updateBalance(account, provider!);
//       toast.success('Balance redeemed successfully!');
//     } catch (error: any) {
//       console.error('Error redeeming balance:', error);
//       toast.error(error.reason || 'Failed to redeem balance');
//     }
//   };

//   const calculateCustomRatio = async (restaurantAddress: string): Promise<string> => {
//     if (!paymentContract) {
//       toast.error('Contract not initialized');
//       return '0';
//     }

//     try {
//       const ratio = await paymentContract._calculateCustomRatio(restaurantAddress);
//       return ethers.utils.formatUnits(ratio, 18); // The ratio is in 18 decimals
//     } catch (error) {
//       console.error('Error calculating custom ratio:', error);
//       throw error;
//     }
//   };

//   const value = {
//     provider,
//     signer,
//     paymentContract,
//     usdtContract,
//     account,
//     connectWallet,
//     isConnected,
//     balance,
//     registerRestaurant,
//     payByGoogleMapId,
//     getRestaurantAddressByGoogleMapId,
//     getRestaurantsByRatio,
//     redeemBalance,
//     calculateCustomRatio,
//   };

//   return (
//     <Web3Context.Provider value={value}>
//       {children}
//     </Web3Context.Provider>
//   );
// }

// export const useWeb3 = () => useContext(Web3Context);

'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ethers } from 'ethers';
import PaymentContractABI from '../../smartcontract/build/contracts/PaymentContract.json';
import MockUSDTABI from '../../smartcontract/build/contracts/MockUSDT.json';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Web3ContextType {
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  paymentContract: ethers.Contract | null;
  usdtContract: ethers.Contract | null;
  account: string;
  connectWallet: () => Promise<void>;
  isConnected: boolean;
  balance: string;
  registerRestaurant: (googleMapId: string) => Promise<void>;
  payByGoogleMapId: (googleMapId: string, amount: string) => Promise<void>;
  getRestaurantAddressByGoogleMapId: (googleMapId: string) => Promise<string>;
  getRestaurantsByRatio: () => Promise<string[]>;
  redeemBalance: () => Promise<void>;
  calculateCustomRatio: (restaurantAddress: string) => Promise<string>;
  mintTestUSDT: (amount: string) => Promise<void>;
}

const Web3Context = createContext<Web3ContextType>({
  provider: null,
  signer: null,
  paymentContract: null,
  usdtContract: null,
  account: '',
  connectWallet: async () => {},
  isConnected: false,
  balance: '0',
  registerRestaurant: async () => {},
  payByGoogleMapId: async () => {},
  getRestaurantAddressByGoogleMapId: async () => '',
  getRestaurantsByRatio: async () => [],
  redeemBalance: async () => {},
  calculateCustomRatio: async () => '0',
  mintTestUSDT: async () => {},
});

export function Web3Provider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [paymentContract, setPaymentContract] = useState<ethers.Contract | null>(null);
  const [usdtContract, setUsdtContract] = useState<ethers.Contract | null>(null);
  const [account, setAccount] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [balance, setBalance] = useState('0');

  const PAYMENT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS;
  const USDT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_USDT_CONTRACT_ADDRESS;

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(web3Provider);

      web3Provider.listAccounts().then(accounts => {
        if (accounts.length > 0) {
          handleAccountsChanged(accounts);
        }
      });

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', () => {});
        }
      };
    }
  }, []);

  // const registerRestaurant = async (googleMapId: string) => {
  //   if (!paymentContract || !account) {
  //     toast.error('Please connect your wallet first');
  //     return;
  //   }

  //   try {
  //     const tx = await paymentContract.registerRestaurant(googleMapId);
  //     await tx.wait();
  //     toast.success('Restaurant registered successfully!');
  //   } catch (error: any) {
  //     console.error('Error registering restaurant:', error);
  //     toast.error(error.reason || 'Failed to register restaurant');
  //   }
  // };
  const registerRestaurant = async (googleMapId: string) => {
    if (!paymentContract || !account) {
      throw new Error('Wallet not connected');
    }
  
    try {
      const tx = await paymentContract.registerRestaurant(googleMapId, {
        gasLimit: 500000
      });
      await tx.wait();
      return tx;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw error; // Propagate error to be handled by the component
    }
  };

  const payByGoogleMapId = async (googleMapId: string, amount: string) => {
    if (!paymentContract || !usdtContract || !account) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      // Convert amount to USDT units (6 decimals)
      const amountInWei = ethers.utils.parseUnits(amount, 6);
      
      // First approve the payment contract to spend USDT
      const approveTx = await usdtContract.approve(PAYMENT_CONTRACT_ADDRESS, amountInWei);
      await approveTx.wait();
      
      // Then make the payment
      const payTx = await paymentContract.payByGoogleMapId(googleMapId, amountInWei);
      await payTx.wait();
      
      // Update balance after payment
      await updateBalance(account, provider!);
      toast.success('Payment processed successfully!');
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast.error(error.reason || 'Failed to process payment');
    }
  };

  const getRestaurantAddressByGoogleMapId = async (googleMapId: string): Promise<string> => {
    if (!paymentContract) {
      toast.error('Contract not initialized');
      return '';
    }

    try {
      const address = await paymentContract.getRestaurantAddressByGoogleMapId(googleMapId);
      return address;
    } catch (error) {
      console.error('Error getting restaurant address:', error);
      throw error;
    }
  };

  const getRestaurantsByRatio = async (): Promise<string[]> => {
    if (!paymentContract) {
      toast.error('Contract not initialized');
      return [];
    }

    try {
      const restaurants = await paymentContract.getRestaurantsByRatio();
      return restaurants;
    } catch (error) {
      console.error('Error getting restaurants:', error);
      throw error;
    }
  };

  const redeemBalance = async () => {
    if (!paymentContract || !account) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      const tx = await paymentContract.redeem();
      await tx.wait();
      await updateBalance(account, provider!);
      toast.success('Balance redeemed successfully!');
    } catch (error: any) {
      console.error('Error redeeming balance:', error);
      toast.error(error.reason || 'Failed to redeem balance');
    }
  };

  const calculateCustomRatio = async (restaurantAddress: string): Promise<string> => {
    if (!paymentContract) {
      toast.error('Contract not initialized');
      return '0';
    }

    try {
      const ratio = await paymentContract._calculateCustomRatio(restaurantAddress);
      return ethers.utils.formatUnits(ratio, 18); // The ratio is in 18 decimals
    } catch (error) {
      console.error('Error calculating custom ratio:', error);
      throw error;
    }
  };

  const handleAccountsChanged = async (accounts: string[]) => {
    if (accounts.length === 0) {
      setIsConnected(false);
      setAccount('');
      setSigner(null);
      setPaymentContract(null);
      setUsdtContract(null);
      toast.error('Please connect your wallet');
    } else if (accounts[0] !== account) {
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      const web3Signer = web3Provider.getSigner();
      
      setAccount(accounts[0]);
      setSigner(web3Signer);
      setIsConnected(true);
      
      if (PAYMENT_CONTRACT_ADDRESS && USDT_CONTRACT_ADDRESS) {
        setupContracts(web3Signer);
      }
      
      await updateBalance(accounts[0], web3Provider);
    }
  };

  const setupContracts = (web3Signer: ethers.Signer) => {
    try {
      const payment = new ethers.Contract(
        PAYMENT_CONTRACT_ADDRESS!,
        PaymentContractABI.abi,
        web3Signer
      );
      
      const usdt = new ethers.Contract(
        USDT_CONTRACT_ADDRESS!,
        MockUSDTABI.abi,
        web3Signer
      );

      setPaymentContract(payment);
      setUsdtContract(usdt);
    } catch (error) {
      console.error('Error setting up contracts:', error);
      toast.error('Failed to setup contracts');
    }
  };

  const updateBalance = async (address: string, provider: ethers.providers.Web3Provider) => {
    try {
      if (USDT_CONTRACT_ADDRESS) {
        const usdt = new ethers.Contract(USDT_CONTRACT_ADDRESS, MockUSDTABI.abi, provider);
        const balance = await usdt.balanceOf(address);
        setBalance(ethers.utils.formatUnits(balance, 6));
      }
    } catch (error) {
      console.error('Error updating balance:', error);
    }
  };

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      toast.error('Please install MetaMask');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      handleAccountsChanged(accounts);
      toast.success('Wallet connected successfully!');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet');
    }
  };

  const mintTestUSDT = async (amount: string) => {
    if (!usdtContract || !account) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      // Convert amount to USDT units (6 decimals)
      const amountInWei = ethers.utils.parseUnits(amount, 6);
      
      // Get the mint function from the contract
      const mintTx = await usdtContract.mint(account, amountInWei);
      await mintTx.wait();
      
      // Update balance after minting
      await updateBalance(account, provider!);
      toast.success(`Successfully minted ${amount} USDT`);
    } catch (error: any) {
      console.error('Error minting USDT:', error);
      toast.error(error.reason || 'Failed to mint USDT');
    }
  };

  // ... (rest of your existing methods)

  const value = {
    provider,
    signer,
    paymentContract,
    usdtContract,
    account,
    connectWallet,
    isConnected,
    balance,
    registerRestaurant,
    payByGoogleMapId,
    getRestaurantAddressByGoogleMapId,
    getRestaurantsByRatio,
    redeemBalance,
    calculateCustomRatio,
    mintTestUSDT,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}

export const useWeb3 = () => useContext(Web3Context);