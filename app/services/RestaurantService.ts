import { ethers } from 'ethers';

export type TrafficLevel = 'Low' | 'Medium' | 'High';

export interface BlockchainData {
  address: string;
  discountRate: number;
  trafficLevel: TrafficLevel;
  isRegistered: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  photos: {
    photoReference: string;
    height: number;
    width: number;
  }[];
  rating: number;
  userRatingsTotal: number;
  vicinity: string;
  priceLevel?: number;
  location: {
    lat: number;
    lng: number;
  };
  blockchainData?: BlockchainData;
}


export class RestaurantService {
  constructor(
    private paymentContract: ethers.Contract,
    private usdtContract: ethers.Contract
  ) {}

  async enhanceWithBlockchainData(restaurants: Restaurant[]): Promise<Restaurant[]> {
    return Promise.all(
      restaurants.map(async (restaurant) => {
        try {
          const isRegistered = await this.isRestaurantRegistered(restaurant.id);
          if (!isRegistered) {
            return {
              ...restaurant,
              blockchainData: {
                address: '',
                discountRate: 0,
                trafficLevel: 'Low' as TrafficLevel,
                isRegistered: false
              }
            };
          }

          const [ratio, volume] = await Promise.all([
            this.getRestaurantDiscountRatio(restaurant.id),
            this.getRestaurantVolume(restaurant.id)
          ]);

          return {
            ...restaurant,
            blockchainData: {
              address: restaurant.id,
              discountRate: this.convertRatioToDiscount(ratio),
              trafficLevel: this.calculateTrafficLevel(volume),
              isRegistered: true
            }
          };
        } catch (error) {
          console.error(`Error fetching blockchain data for restaurant ${restaurant.id}:`, error);
          return restaurant;
        }
      })
    );
  }

  async processPayment(
    contractAddress: string,
    amount: ethers.BigNumber,
    discountRate: number
  ): Promise<ethers.ContractTransaction> {
    try {
      const approvalTx = await this.usdtContract.approve(
        this.paymentContract.address,
        amount
      );
      await approvalTx.wait();

      const discountedAmount = amount.mul(100 - discountRate).div(100);

      return await this.paymentContract.processPayment(
        contractAddress,
        discountedAmount,
        {
          gasLimit: 300000
        }
      );
    } catch (error) {
      console.error('Payment processing error:', error);
      throw new Error('Failed to process payment');
    }
  }

  private async isRestaurantRegistered(contractAddress: string): Promise<boolean> {
    try {
      const restaurantInfo = await this.paymentContract.restaurants(contractAddress);
      return restaurantInfo && restaurantInfo.googlemap_id !== '';
    } catch (error) {
      console.error('Error checking restaurant registration:', error);
      return false;
    }
  }

  private async getRestaurantDiscountRatio(contractAddress: string): Promise<ethers.BigNumber> {
    try {
      return await this.paymentContract._calculateCustomRatio(contractAddress);
    } catch (error) {
      console.error('Error getting restaurant ratio:', error);
      return ethers.BigNumber.from(0);
    }
  }

  private async getRestaurantVolume(contractAddress: string): Promise<ethers.BigNumber> {
    try {
      return await this.paymentContract.getRestaurantVolume(contractAddress);
    } catch (error) {
      console.error('Error getting restaurant volume:', error);
      return ethers.BigNumber.from(0);
    }
  }

  private convertRatioToDiscount(ratio: ethers.BigNumber): number {
    return parseFloat(ethers.utils.formatEther(ratio)) * 100;
  }

  private calculateTrafficLevel(volume: ethers.BigNumber): TrafficLevel {
    const volumeNum = volume.toNumber();
    if (volumeNum < 5) return 'Low';
    if (volumeNum < 10) return 'Medium';
    return 'High';
  }

  async registerRestaurant(googleMapId: string): Promise<boolean> {
    try {
      const tx = await this.paymentContract.registerRestaurant(googleMapId);
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Error registering restaurant:', error);
      throw error;
    }
  }
}

// Create a singleton instance
let restaurantService: RestaurantService | null = null;

export const getRestaurantService = (
  paymentContract: ethers.Contract,
  usdtContract: ethers.Contract
) => {
  if (!restaurantService) {
    restaurantService = new RestaurantService(paymentContract, usdtContract);
  }
  return restaurantService;
};