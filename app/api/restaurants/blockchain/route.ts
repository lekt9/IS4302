import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import PaymentContractABI from '../../../contracts/PaymentContract.json';

const provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
const paymentContract = new ethers.Contract(
  process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS!,
  PaymentContractABI,
  provider
);

// New function to get all registered restaurants
async function getRegisteredRestaurants() {
  try {
    const filter = paymentContract.filters.RestaurantRegistered();
    const events = await paymentContract.queryFilter(filter);
    const registeredIds = events.map(event => event.args?.googlemap_id);
    return [...new Set(registeredIds)]; // Remove duplicates
  } catch (error) {
    console.error('Error getting registered restaurants:', error);
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const getAll = searchParams.get('getAll') === 'true';

    if (getAll) {
      // Return all registered restaurant IDs
      const registeredIds = await getRegisteredRestaurants();
      return NextResponse.json({ registeredIds });
    }

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    // Get specific restaurant data from blockchain
    const restaurantInfo = await paymentContract.restaurants(restaurantId);
    const customRatio = await paymentContract._calculateCustomRatio(restaurantId);

    return NextResponse.json({
      isRegistered: restaurantInfo.googlemap_id !== '',
      discountRate: ethers.utils.formatEther(customRatio),
      address: restaurantId
    });
  } catch (error) {
    console.error('Error in blockchain API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blockchain data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurantId, action } = body;

    if (!restaurantId || !action) {
      return NextResponse.json(
        { error: 'Restaurant ID and action are required' },
        { status: 400 }
      );
    }

    let data;
    switch (action) {
      case 'getDiscount':
        const ratio = await paymentContract._calculateCustomRatio(restaurantId);
        data = {
          discountRate: ethers.utils.formatEther(ratio)
        };
        break;

      case 'getVolume':
        // Implementation depends on your contract structure
        data = {
          volume: 0 // Placeholder
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in blockchain API:', error);
    return NextResponse.json(
      { error: 'Failed to process blockchain request' },
      { status: 500 }
    );
  }
}