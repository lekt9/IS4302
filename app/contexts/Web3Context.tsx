'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ethers } from 'ethers';
import PaymentContractABI from '../contracts/PaymentContract.json';
import MockUSDTABI from '../contracts/MockUSDT.json';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    ethereum?: ethers.providers.ExternalProvider;
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

// Network configuration
const networkConfig = {
  chainId: 1337,
  name: 'Ganache Local',
  rpcUrl: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'http://127.0.0.1:7545'
};

export function Web3Provider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [paymentContract, setPaymentContract] = useState<ethers.Contract | null>(null);
  const [usdtContract, setUsdtContract] = useState<ethers.Contract | null>(null);
  const [account, setAccount] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [balance, setBalance] = useState('0');

  const setupNetwork = async () => {
    try {
      await window.ethereum?.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${networkConfig.chainId.toString(16)}` }],
      });
      return true;
    } catch (switchError: { code: number }) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum?.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${networkConfig.chainId.toString(16)}`,
                chainName: networkConfig.name,
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: [networkConfig.rpcUrl],
                blockExplorerUrls: null,
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

  const getProvider = () => {
    if (window.ethereum) {
      // For MetaMask/Web3 browser
      return new ethers.providers.Web3Provider(window.ethereum, {
        chainId: networkConfig.chainId,
        name: networkConfig.name,
        ensAddress: null // Explicitly disable ENS
      });
    } else {
      // Fallback to JSON-RPC provider
      return new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl, {
        chainId: networkConfig.chainId,
        name: networkConfig.name,
        ensAddress: null // Explicitly disable ENS
      });
    }
  };

  const setupContracts = (signer: ethers.Signer) => {
    try {
      const payment = new ethers.Contract(
        process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS!,
        PaymentContractABI,
        signer
      );
      const usdt = new ethers.Contract(
        process.env.NEXT_PUBLIC_USDT_CONTRACT_ADDRESS!,
        MockUSDTABI,
        signer
      );
      setPaymentContract(payment);
      setUsdtContract(usdt);
    } catch (error) {
      console.error('Error setting up contracts:', error);
    }
  };

  const updateBalance = async (address: string, provider: ethers.providers.Web3Provider) => {
    try {
      const balance = await provider.getBalance(address);
      setBalance(ethers.utils.formatEther(balance));
    } catch (error) {
      console.error('Error updating balance:', error);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const web3Provider = getProvider();
      setProvider(web3Provider);

      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          if (web3Provider instanceof ethers.providers.Web3Provider) {
            updateBalance(accounts[0], web3Provider);
          }
        } else {
          setAccount('');
          setIsConnected(false);
          setBalance('0');
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

      return () => {
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
      };
    }
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error('Please install MetaMask');
      return;
    }

    try {
      const networkConfigured = await setupNetwork();
      if (!networkConfigured) {
        toast.error('Failed to configure network');
        return;
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length > 0) {
        const web3Provider = getProvider();
        const web3Signer = web3Provider.getSigner();

        setProvider(web3Provider);
        setSigner(web3Signer);
        setAccount(accounts[0]);
        setIsConnected(true);

        if (process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS && process.env.NEXT_PUBLIC_USDT_CONTRACT_ADDRESS) {
          setupContracts(web3Signer);
        }

        if (web3Provider instanceof ethers.providers.Web3Provider) {
          await updateBalance(accounts[0], web3Provider);
        }
        toast.success('Wallet connected successfully!');
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast.error('Failed to connect wallet');
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