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
  rating: number;
  userRatingsTotal: number;
  vicinity: string;
  priceLevel?: number;
  photos: {
    photoReference: string;
    height: number;
    width: number;
  }[];
  location: {
    lat: number;
    lng: number;
  };
  blockchainData?: {
    address: string;
    discountRate: number;
    trafficLevel: 'Low' | 'Medium' | 'High';
    isRegistered: boolean;
  };
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

  private async isRestaurantRegistered(googleMapId: string): Promise<boolean> {
    try {
      const restaurantInfo = await this.paymentContract.restaurants(googleMapId);
      return restaurantInfo.googlemap_id !== '';
    } catch (error) {
      console.error('Error checking restaurant registration:', error);
      return false;
    }
  }

  private async getRestaurantDiscountRatio(restaurantId: string): Promise<ethers.BigNumber> {
    try {
      return await this.paymentContract._calculateCustomRatio(restaurantId);
    } catch (error) {
      console.error('Error getting restaurant ratio:', error);
      return ethers.BigNumber.from(0);
    }
  }

  private async getRestaurantVolume(restaurantId: string): Promise<number> {
    try {
      // This would need to be implemented based on your contract's volume tracking
      // For now, returning a mock value
      return 0;
    } catch (error) {
      console.error('Error getting restaurant volume:', error);
      return 0;
    }
  }

  private convertRatioToDiscount(ratio: ethers.BigNumber): number {
    // Convert the ratio from contract (in wei) to a percentage
    const ratioAsNumber = parseFloat(ethers.utils.formatEther(ratio));
    // Convert to discount percentage (e.g., 0.9 ratio = 10% discount)
    return (1 - ratioAsNumber) * 100;
  }

  private calculateTrafficLevel(volume: number): TrafficLevel {
    if (volume < 10) return 'Low';
    if (volume < 30) return 'Medium';
    return 'High';
  }

  async processPayment(
    restaurantAddress: string,
    amount: string,
    onApprovalSubmitted?: () => void,
    onApprovalComplete?: () => void,
    onPaymentSubmitted?: () => void
  ): Promise<boolean> {
    try {
      // Convert amount to USDT decimals (6)
      const amountInSmallestUnit = ethers.utils.parseUnits(amount, 6);
      
      // First approve USDT spending
      onApprovalSubmitted?.();
      const approveTx = await this.usdtContract.approve(
        this.paymentContract.address,
        amountInSmallestUnit
      );
      await approveTx.wait();
      onApprovalComplete?.();

      // Then process payment
      onPaymentSubmitted?.();
      const payTx = await this.paymentContract.pay(
        restaurantAddress,
        amountInSmallestUnit
      );
      await payTx.wait();

      return true;
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
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