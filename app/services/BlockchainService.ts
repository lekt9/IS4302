// import { ethers } from 'ethers';
// import PaymentContractABI from '../contracts/PaymentContract.json';

// export class BlockchainService {
//   private contract: ethers.Contract;

//   constructor(provider: ethers.providers.Provider) {
//     this.contract = new ethers.Contract(
//       process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS!,
//       PaymentContractABI,
//       provider
//     );
//   }

//   async getRegisteredRestaurants() {
//     try {
//       const restaurantsList = await this.contract.getRestaurantsByRatio();
//       const uniqueRestaurants = new Map();
      
//       for (const restaurantString of restaurantsList) {
//         const matches = restaurantString.match(/Address: (.*?), Google Map ID: (.*?), Custom Ratio: (.*?)$/);
        
//         if (matches && matches.length === 4) {
//           const [_, addressHex, googleMapId, customRatio] = matches;
//           const address = '0x' + addressHex;
          
//           try {
//             const restaurantInfo = await this.contract.restaurants(address);
            
//             if (restaurantInfo.googlemap_id !== '') {
//               uniqueRestaurants.set(googleMapId, {
//                 owner: address,
//                 googlemap_id: googleMapId,
//                 discountRate: customRatio
//               });
//             }
//           } catch (error) {
//             console.error(`Error fetching data for restaurant ${googleMapId}:`, error);
//           }
//         }
//       }
      
//       return Array.from(uniqueRestaurants.entries()).map(([id, info]) => ({
//         id,
//         contractData: info
//       }));
//     } catch (error) {
//       console.error('Error fetching from contract:', error);
//       throw error;
//     }
//   }

//   async getRestaurantInfo(address: string) {
//     try {
//       const restaurantInfo = await this.contract.restaurants(address);
//       const customRatio = await this.contract._calculateCustomRatio(address);
      
//       return {
//         isRegistered: restaurantInfo.googlemap_id !== '',
//         discountRate: ethers.utils.formatEther(customRatio),
//         address
//       };
//     } catch (error) {
//       console.error('Error fetching restaurant info:', error);
//       throw error;
//     }
//   }
// } 

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
      // Get restaurants sorted by ratio from the contract
      const restaurantsList = await this.contract.getRestaurantsByRatio();
      console.log('Raw restaurants list:', restaurantsList);
      
      const uniqueRestaurants = new Map();
      
      for (const restaurantString of restaurantsList) {
        try {
          // Parse the string returned by the contract
          const matches = restaurantString.match(/Restaurant Address: (.*?), Google Map ID: (.*?), Custom Ratio: (.*?)$/);
          
          if (matches && matches.length === 4) {
            const [_, addressHex, googleMapId, customRatio] = matches;
            
            // Ensure the address is properly formatted
            const formattedAddress = addressHex.startsWith('0x') ? addressHex : `0x${addressHex}`;
            
            if (!ethers.utils.isAddress(formattedAddress)) {
              console.error(`Invalid address format: ${formattedAddress}`);
              continue;
            }

            // Get the custom ratio for this restaurant
            const ratio = await this.contract._calculateCustomRatio(formattedAddress);
            const discountRate = parseFloat(ethers.utils.formatEther(ratio));

            uniqueRestaurants.set(googleMapId, {
              owner: formattedAddress,
              googlemap_id: googleMapId,
              discountRate: discountRate
            });
          }
        } catch (error) {
          console.error('Error processing restaurant string:', restaurantString, error);
          continue;
        }
      }
      
      // Convert to array and sort by discount rate (highest first)
      const restaurants = Array.from(uniqueRestaurants.entries())
        .map(([id, info]) => ({
          id,
          contractData: info
        }))
        .sort((a, b) => b.contractData.discountRate - a.contractData.discountRate);

      return restaurants;
    } catch (error) {
      console.error('Error fetching from contract:', error);
      return [];
    }
  }

  async getRestaurantInfo(address: string) {
    try {
      const formattedAddress = address.startsWith('0x') ? address : `0x${address}`;
      
      if (!ethers.utils.isAddress(formattedAddress)) {
        throw new Error(`Invalid address format: ${formattedAddress}`);
      }

      const customRatio = await this.contract._calculateCustomRatio(formattedAddress);
      const discountRate = ethers.utils.formatEther(customRatio);
      
      return {
        isRegistered: true, // If we can get the ratio, it's registered
        discountRate,
        address: formattedAddress
      };
    } catch (error) {
      console.error('Error fetching restaurant info:', error);
      return {
        isRegistered: false,
        discountRate: '0',
        address
      };
    }
  }
}