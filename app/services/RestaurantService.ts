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
          console.log('Enhancing restaurant data for:', restaurant.id);
          const restaurantAddress = await this.findRestaurantAddress(restaurant.id);
          const isRegistered = restaurantAddress !== ethers.constants.AddressZero;

          console.log('Restaurant registration status:', {
            id: restaurant.id,
            address: restaurantAddress,
            isRegistered
          });

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

          const enhancedData = {
            ...restaurant,
            blockchainData: {
              address: restaurantAddress,
              discountRate: this.convertRatioToDiscount(ratio),
              trafficLevel: this.calculateTrafficLevel(volume),
              isRegistered: true
            }
          };

          console.log('Enhanced restaurant data:', enhancedData);
          return enhancedData;
        } catch (error) {
          console.error(`Error enhancing restaurant ${restaurant.id}:`, error);
          return restaurant;
        }
      })
    );
  }

  private async findRestaurantAddress(googleMapId: string): Promise<string> {
    try {
      console.log('Finding restaurant address for:', googleMapId);
      
      const filter = this.paymentContract.filters.RestaurantRegistered();
      const events = await this.paymentContract.queryFilter(filter);
      
      for (const event of events) {
        if (!event.args) continue;
        const restaurantAddress = event.args.restaurantAddress;
        
        // Validate the address before using it
        if (!ethers.utils.isAddress(restaurantAddress)) {
          console.warn('Invalid address found:', restaurantAddress);
          continue;
        }
        
        const restaurantData = await this.paymentContract.restaurants(restaurantAddress);
        
        if (restaurantData.googlemap_id === googleMapId) {
          return restaurantAddress;
        }
      }
      
      // If no restaurant is found, return zero address instead of throwing
      return ethers.constants.AddressZero;
      
    } catch (error) {
      console.error('Error finding restaurant address:', error);
      return ethers.constants.AddressZero; // Return zero address on error
    }
  }

  async processPayment(
    googleMapId: string,
    amount: ethers.BigNumber
  ): Promise<ethers.ContractTransaction> {
    try {
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
      console.log("Contract instance:", this.paymentContract);
      console.log("Attempting to register with ID:", googleMapId);
      
      // Check if already registered
      const isRegistered = await this.isRestaurantRegistered(googleMapId);
      if (isRegistered) {
        throw new Error('Restaurant is already registered');
      }

      // Proceed with registration
      const tx = await this.paymentContract.registerRestaurant(googleMapId, {
        gasLimit: 500000
      });
      
      console.log("Transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Registration confirmed in block:", receipt.blockNumber);
      
      // Verify registration
      const verifyRegistration = await this.isRestaurantRegistered(googleMapId);
      if (!verifyRegistration) {
        throw new Error('Registration verification failed');
      }
      
      return true;
    } catch (error) {
      console.error('Registration error details:', {
        error,
        contractAddress: this.paymentContract?.address,
        googleMapId
      });
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