// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./MockUSDT.sol";

contract PaymentContract {
    using SafeERC20 for IERC20;

    IERC20 public usdtToken;
    address public owner;

    // Mapping to track registered restaurants
    mapping(address => bool) public registeredRestaurants;
    
    // Array to keep track of all restaurant addresses
    address[] public restaurantAddresses;

    // Base Ratio (BR), Decay Factor (DF), Minimum Ratio (MR)
    uint256 public baseRatio;    // e.g., 1 * 1e18 (1.00)
    uint256 public decayFactor;  // e.g., 0.5 * 1e18 (0.50)
    uint256 public minRatio;     // e.g., 0.90 * 1e18 (0.90)

    // Time window for transaction volumes (e.g., 1 hour)
    uint256 public timeWindow;   // In seconds, e.g., 3600 for 1 hour

    // Events for restaurant management
    event RestaurantRegistered(address indexed restaurant);
    event RestaurantRemoved(address indexed restaurant);

    event PaymentProcessed(
        address indexed user,
        address indexed restaurant,
        uint256 originalAmount,
        uint256 adjustedAmount,
        uint256 customRatio
    );

    // Add this struct definition after the events and before the constructor
    struct VolumeData {
        uint256 amount;
        uint256 timestamp;
    }

    // Add this mapping for restaurant volumes
    mapping(address => VolumeData[]) private restaurantVolumes;
    // Add this array for total volumes
    VolumeData[] private totalVolumes;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor(
        address _usdtToken,
        uint256 _baseRatio,
        uint256 _decayFactor,
        uint256 _minRatio,
        uint256 _timeWindow
    ) {
        usdtToken = IERC20(_usdtToken);
        owner = msg.sender;
        baseRatio = _baseRatio;
        decayFactor = _decayFactor;
        minRatio = _minRatio;
        timeWindow = _timeWindow;
    }

    // Function to register a new restaurant
    function registerRestaurant(address restaurant) external onlyOwner {
        require(restaurant != address(0), "Invalid restaurant address");
        require(!registeredRestaurants[restaurant], "Restaurant already registered");
        
        registeredRestaurants[restaurant] = true;
        restaurantAddresses.push(restaurant);
        
        emit RestaurantRegistered(restaurant);
    }

    // Function to remove a restaurant
    function removeRestaurant(address restaurant) external onlyOwner {
        require(registeredRestaurants[restaurant], "Restaurant not registered");
        
        registeredRestaurants[restaurant] = false;
        
        // Remove from array (find and replace with last element, then pop)
        for (uint i = 0; i < restaurantAddresses.length; i++) {
            if (restaurantAddresses[i] == restaurant) {
                restaurantAddresses[i] = restaurantAddresses[restaurantAddresses.length - 1];
                restaurantAddresses.pop();
                break;
            }
        }
        
        emit RestaurantRemoved(restaurant);
    }

    // Function to get all registered restaurants
    function getRestaurants() external view returns (address[] memory) {
        return restaurantAddresses;
    }

    // Function to process payment
    function pay(address restaurant, uint256 usdtAmount) external {
        require(restaurant != address(0), "Invalid restaurant address");
        require(registeredRestaurants[restaurant], "Restaurant not registered");
        require(usdtAmount > 0, "Amount must be greater than zero");

        // First clean up old data
        _cleanupOldData(restaurantVolumes[restaurant]);
        _cleanupOldData(totalVolumes);

        // Then calculate custom ratio based on cleaned data
        uint256 customRatio = _calculateCustomRatio(restaurant);

        // Only after ratio calculation, update volumes
        _updateVolumes(restaurant, usdtAmount);

        // Calculate adjusted amount
        uint256 adjustedAmount = (usdtAmount * customRatio) / 1e18;

        // Transfer USDT from user to restaurant
        usdtToken.safeTransferFrom(msg.sender, restaurant, adjustedAmount);

        emit PaymentProcessed(msg.sender, restaurant, usdtAmount, adjustedAmount, customRatio);
    }

    // Internal function to update transaction volumes
    function _updateVolumes(address restaurant, uint256 usdtAmount) internal {
        uint256 currentTime = block.timestamp;

        // Add restaurant volume data
        restaurantVolumes[restaurant].push(VolumeData({
            amount: usdtAmount,
            timestamp: currentTime
        }));

        // Add total volume data
        totalVolumes.push(VolumeData({
            amount: usdtAmount,
            timestamp: currentTime
        }));

        // Clean up old data outside the time window
        _cleanupOldData(restaurantVolumes[restaurant]);
        _cleanupOldData(totalVolumes);
    }

    // Internal function to clean up old volume data
    function _cleanupOldData(VolumeData[] storage volumes) internal {
        uint256 cutoffTime = block.timestamp - timeWindow;
        
        // Count how many entries to remove
        uint256 entriesToRemove = 0;
        for (uint256 i = 0; i < volumes.length; i++) {
            if (volumes[i].timestamp < cutoffTime) {
                entriesToRemove++;
            } else {
                break; // Since entries are ordered by time, we can stop here
            }
        }
        
        // Remove old entries
        if (entriesToRemove > 0) {
            if (entriesToRemove == volumes.length) {
                // If all entries are old, clear the array
                while (volumes.length > 0) {
                    volumes.pop();
                }
            } else {
                // Remove specific number of old entries
                for (uint256 i = 0; i < volumes.length - entriesToRemove; i++) {
                    volumes[i] = volumes[i + entriesToRemove];
                }
                // Reduce array length
                for (uint256 i = 0; i < entriesToRemove; i++) {
                    volumes.pop();
                }
            }
        }
    }

    // Internal function to calculate custom ratio
    function _calculateCustomRatio(address restaurant) internal view returns (uint256) {
        uint256 TT_a = _getTotalVolume(restaurantVolumes[restaurant]);
        uint256 TT_total = _getTotalVolume(totalVolumes);

        // For first payment or if there are no transactions within time window, return base ratio
        if (TT_total == 0 || TT_a == 0) {
            return baseRatio;
        }

        // Calculate relative share (scaled by 1e18)
        uint256 relativeShare = (TT_a * 1e18) / TT_total;
        
        // Calculate decay (scaled appropriately)
        uint256 decay = (relativeShare * decayFactor) / 1e18;
        
        // Calculate final ratio
        uint256 currentRatio = baseRatio;
        
        if (decay > 0) {
            uint256 reduction = (baseRatio * decay) / 1e18;
            if (reduction >= baseRatio) {
                return minRatio;
            }
            currentRatio = baseRatio - reduction;
        }

        // Ensure we don't go below minimum ratio
        return currentRatio < minRatio ? minRatio : currentRatio;
    }

    // Internal function to get total volume from an array of VolumeData
    function _getTotalVolume(VolumeData[] storage volumes) internal view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < volumes.length; i++) {
            total += volumes[i].amount;
        }
        return total;
    }
}