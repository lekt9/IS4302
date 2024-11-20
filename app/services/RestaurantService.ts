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
          // Get restaurant address by searching through the restaurants array
          const restaurantAddress = await this.findRestaurantAddress(restaurant.id);
          const isRegistered = restaurantAddress !== ethers.constants.AddressZero;

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
            this.paymentContract._calculateCustomRatio(restaurantAddress),
            this.getRestaurantVolume(restaurantAddress)
          ]);

          return {
            ...restaurant,
            blockchainData: {
              address: restaurantAddress,
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

  private async findRestaurantAddress(googleMapId: string): Promise<string> {
    try {
      let restaurantCount = await this.paymentContract.restaurants.length;
      for (let i = 0; i < restaurantCount; i++) {
        const restaurant = await this.paymentContract.restaurants(i);
        if (restaurant.googlemap_id === googleMapId) {
          return restaurant.restaurantAddress;
        }
      }
      return ethers.constants.AddressZero;
    } catch (error) {
      console.error('Error finding restaurant address:', error);
      return ethers.constants.AddressZero;
    }
  }

  async processPayment(
    googleMapId: string,
    amount: ethers.BigNumber
  ): Promise<ethers.ContractTransaction> {
    try {
      // First get restaurant address
      const restaurantAddress = await this.findRestaurantAddress(googleMapId);
      if (restaurantAddress === ethers.constants.AddressZero) {
        throw new Error('Restaurant not found');
      }

      // Approve USDT spending
      const approvalTx = await this.usdtContract.approve(
        this.paymentContract.address,
        amount
      );
      await approvalTx.wait();
  
      // Use pay function with found address
      return await this.paymentContract.pay(
        restaurantAddress,
        amount,
        {
          gasLimit: 300000
        }
      );
    } catch (error) {
      console.error('Payment processing error:', error);
      throw new Error('Failed to process payment');
    }
  }

  private async isRestaurantRegistered(googleMapId: string): Promise<boolean> {
    try {
      const restaurantAddress = await this.findRestaurantAddress(googleMapId);
      return restaurantAddress !== ethers.constants.AddressZero;
    } catch (error) {
      console.error('Error checking restaurant registration:', error);
      return false;
    }
  }

  private async getRestaurantVolume(restaurantAddress: string): Promise<ethers.BigNumber> {
    try {
      const volumes = await this.paymentContract.restaurantVolumes(restaurantAddress);
      let total = ethers.BigNumber.from(0);
      for (const volume of volumes) {
        if (volume && volume.amount) {
          total = total.add(volume.amount);
        }
      }
      return total;
    } catch (error) {
      console.error('Error getting restaurant volume:', error);
      return ethers.BigNumber.from(0);
    }
  }

  private convertRatioToDiscount(ratio: ethers.BigNumber): number {
    // Convert ratio to percentage (e.g., 0.9 ratio = 10% discount)
    const ratioAsNumber = parseFloat(ethers.utils.formatEther(ratio));
    return (1 - ratioAsNumber) * 100;
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