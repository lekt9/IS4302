'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ethers } from 'ethers';
import PaymentContractABI from '../contracts/PaymentContract.json';
import MockUSDTABI from '../contracts/MockUSDT.json';
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
}

const Web3Context = createContext<Web3ContextType>({
  provider: null,
  signer: null,
  paymentContract: null,
  usdtContract: null,
  account: '',
  connectWallet: async () => {},
  isConnected: false,
  balance: '0'
});

export function Web3Provider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<ethers.providers.JsonRpcProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [paymentContract, setPaymentContract] = useState<ethers.Contract | null>(null);
  const [usdtContract, setUsdtContract] = useState<ethers.Contract | null>(null);
  const [account, setAccount] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [balance, setBalance] = useState('0');

  const PAYMENT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS;
  const USDT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_USDT_CONTRACT_ADDRESS;
  const ETHEREUM_RPC_URL = process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'http://127.0.0.1:7545';
  const NETWORK_ID = '1337'; // Ganache default network ID
  const NETWORK_HEX = '0x539'; // Hex value of 1337

  useEffect(() => {
    console.log('ETHEREUM_RPC_URL', ETHEREUM_RPC_URL);
    if (typeof window !== 'undefined') {
      const web3Provider = new ethers.providers.JsonRpcProvider(ETHEREUM_RPC_URL);
      
      setProvider(web3Provider);

      // Check if already connected (only for MetaMask)
      if (window.ethereum) {
        web3Provider.listAccounts().then(accounts => {
          if (accounts.length > 0) {
            handleAccountsChanged(accounts);
          }
        });

        // Setup event listeners
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', () => window.location.reload());

        return () => {
          if (window.ethereum.removeListener) {
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            window.ethereum.removeListener('chainChanged', () => {});
          }
        };
      }
    }
  }, []);

  const handleAccountsChanged = async (accounts: string[]) => {
    if (accounts.length === 0) {
      setIsConnected(false);
      setAccount('');
      setSigner(null);
      setPaymentContract(null);
      setUsdtContract(null);
      toast.error('Please connect your wallet');
    } else if (accounts[0] !== account) {
      const web3Provider = new ethers.providers.JsonRpcProvider(ETHEREUM_RPC_URL);
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
        PaymentContractABI,
        web3Signer
      );
      
      const usdt = new ethers.Contract(
        USDT_CONTRACT_ADDRESS!,
        MockUSDTABI,
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
    if (!USDT_CONTRACT_ADDRESS) return;

    try {
      const usdt = new ethers.Contract(
        USDT_CONTRACT_ADDRESS,
        MockUSDTABI,
        provider
      );
      const balance = await usdt.balanceOf(address);
      setBalance(ethers.utils.formatUnits(balance, 6)); // USDT uses 6 decimals
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const setupNetwork = async () => {
    if (!window.ethereum) return false;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: NETWORK_HEX }],
      });
      return true;
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: NETWORK_HEX,
                chainName: 'Ganache Local',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: [ETHEREUM_RPC_URL],
                blockExplorerUrls: [],
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error('Error adding network:', addError);
          return false;
        }
      }
      console.error('Error switching network:', switchError);
      return false;
    }
  };

  const connectWallet = async () => {
    console.log('Attempting to connect wallet...');
    
    if (!window.ethereum) {
      console.log('MetaMask not found');
      toast.error('Please install MetaMask');
      return;
    }

    try {
      console.log('Setting up network...');
      const networkConfigured = await setupNetwork();
      if (!networkConfigured) {
        console.log('Network configuration failed');
        toast.error('Failed to configure network. Please check MetaMask.');
        return;
      }

      console.log('Requesting accounts...');
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      console.log('Accounts received:', accounts);
      
      if (accounts.length > 0) {
        console.log('Creating Web3Provider...');
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        const web3Signer = web3Provider.getSigner();
        
        console.log('Verifying network...');
        const network = await web3Provider.getNetwork();
        console.log('Current network:', network);
        
        if (network.chainId !== parseInt(NETWORK_ID)) {
          console.log('Wrong network detected');
          toast.error('Please connect to the correct network in MetaMask');
          return;
        }
        
        setProvider(web3Provider);
        setSigner(web3Signer);
        setAccount(accounts[0]);
        setIsConnected(true);

        if (PAYMENT_CONTRACT_ADDRESS && USDT_CONTRACT_ADDRESS) {
          console.log('Setting up contracts...');
          setupContracts(web3Signer);
        }

        await updateBalance(accounts[0], web3Provider);
        console.log('Wallet connected successfully');
        toast.success('Wallet connected successfully!');
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast.error(error.message || 'Failed to connect wallet');
    }
  };

  const value = {
    provider,
    signer,
    paymentContract,
    usdtContract,
    account,
    connectWallet,
    isConnected,
    balance
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}

export const useWeb3 = () => useContext(Web3Context);