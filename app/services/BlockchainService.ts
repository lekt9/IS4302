import { ethers } from 'ethers';
import PaymentContractABI from '../contracts/PaymentContract.json';

export class BlockchainService {
  private contract: ethers.Contract;

  constructor(provider: ethers.providers.Provider) {
    this.contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS!,
      PaymentContractABI,
      provider
    );
  }

  async getRegisteredRestaurants() {
    try {
      const restaurantsList = await this.contract.getRestaurantsByRatio();
      const uniqueRestaurants = new Map();
      
      for (const restaurantString of restaurantsList) {
        const matches = restaurantString.match(/Address: (.*?), Google Map ID: (.*?), Custom Ratio: (.*?)$/);
        
        if (matches && matches.length === 4) {
          const [_, addressHex, googleMapId, customRatio] = matches;
          const address = '0x' + addressHex;
          
          try {
            const restaurantInfo = await this.contract.restaurants(address);
            
            if (restaurantInfo.googlemap_id !== '') {
              uniqueRestaurants.set(googleMapId, {
                owner: address,
                googlemap_id: googleMapId,
                discountRate: customRatio
              });
            }
          } catch (error) {
            console.error(`Error fetching data for restaurant ${googleMapId}:`, error);
          }
        }
      }
      
      return Array.from(uniqueRestaurants.entries()).map(([id, info]) => ({
        id,
        contractData: info
      }));
    } catch (error) {
      console.error('Error fetching from contract:', error);
      throw error;
    }
  }

  async getRestaurantInfo(address: string) {
    try {
      const restaurantInfo = await this.contract.restaurants(address);
      const customRatio = await this.contract._calculateCustomRatio(address);
      
      return {
        isRegistered: restaurantInfo.googlemap_id !== '',
        discountRate: ethers.utils.formatEther(customRatio),
        address
      };
    } catch (error) {
      console.error('Error fetching restaurant info:', error);
      throw error;
    }
  }
} 