// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./MockUSDT.sol";

contract PaymentContract {
    using SafeERC20 for MockUSDT;

    MockUSDT public usdtToken;
    address public owner;

    // Struct to store restaurant details with Google Map ID
    struct RestaurantInfo {
        string googlemap_id;
        uint256 customRatio;
        address restaurantAddress;
    }

    // Array to store multiple restaurants
    RestaurantInfo[] public restaurants;

    // Mapping to quickly check if a restaurant address exists and get its index
    mapping(address => uint256) public restaurantIndices;
    mapping(address => bool) public isRegistered;

    // Base Ratio (BR), Decay Factor (DF), Minimum Ratio (MR), Time Window
    uint256 public baseRatio;
    uint256 public decayFactor;
    uint256 public minRatio;
    uint256 public timeWindow;

    // Mapping to track USDT balances for each restaurant
    mapping(address => uint256) public balances;

    // Events
    event RestaurantRegistered(address indexed restaurant, string googlemap_id);
    event RestaurantRemoved(address indexed restaurant);

    event PaymentProcessed(
        address indexed user,
        address indexed restaurant,
        uint256 originalAmount,
        uint256 adjustedAmount,
        uint256 customRatio
    );

    event BalanceUpdated(address indexed restaurant, uint256 newBalance);
    event Redemption(address indexed restaurant, uint256 redeemedAmount);

    struct VolumeData {
        uint256 amount;
        uint256 timestamp;
    }

    mapping(address => VolumeData[]) private restaurantVolumes;
    VolumeData[] private totalVolumes;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyRegisteredRestaurant() {
        require(
            isRegistered[msg.sender],
            "Caller is not a registered restaurant"
        );
        _;
    }

    constructor(
        address _owner,
        uint256 _baseRatio,
        uint256 _decayFactor,
        uint256 _minRatio,
        uint256 _timeWindow
    ) {
        usdtToken = new MockUSDT(); // Deploy a new MockUSDT instance
        owner = _owner;
        baseRatio = _baseRatio;
        decayFactor = _decayFactor;
        minRatio = _minRatio;
        timeWindow = _timeWindow;
    }

    // Function to get restaurant address by Google Maps ID
    function getRestaurantAddressByGoogleMapId(
        string memory googlemap_id
    ) public view returns (address) {
        for (uint i = 0; i < restaurants.length; i++) {
            if (
                keccak256(bytes(restaurants[i].googlemap_id)) ==
                keccak256(bytes(googlemap_id))
            ) {
                return restaurants[i].restaurantAddress;
            }
        }
        return address(0);
    }

    // Payment function that accepts Google Maps ID and credits balance
    function payByGoogleMapId(
        string memory googlemap_id,
        uint256 usdtAmount
    ) external {
        address restaurantAddress = getRestaurantAddressByGoogleMapId(
            googlemap_id
        );
        require(restaurantAddress != address(0), "Restaurant not found");
        pay(restaurantAddress, usdtAmount);
    }

    // Registration function for restaurants
    function registerRestaurant(string memory googlemap_id) external {
        require(msg.sender != address(0), "Invalid restaurant address");
        require(!isRegistered[msg.sender], "Restaurant already registered");
        require(
            getRestaurantAddressByGoogleMapId(googlemap_id) == address(0),
            "Google Maps ID already registered"
        );

        RestaurantInfo memory newRestaurant = RestaurantInfo({
            googlemap_id: googlemap_id,
            customRatio: baseRatio,
            restaurantAddress: msg.sender
        });

        restaurants.push(newRestaurant);
        isRegistered[msg.sender] = true;
        restaurantIndices[msg.sender] = restaurants.length - 1;

        emit RestaurantRegistered(msg.sender, googlemap_id);
    }

    // Remove a registered restaurant
    function removeRestaurant(address restaurant) external onlyOwner {
        require(isRegistered[restaurant], "Restaurant not registered");

        uint256 indexToRemove = restaurantIndices[restaurant];
        uint256 lastIndex = restaurants.length - 1;

        if (indexToRemove != lastIndex) {
            restaurants[indexToRemove] = restaurants[lastIndex];
            restaurantIndices[
                restaurants[indexToRemove].restaurantAddress
            ] = indexToRemove;
        }

        restaurants.pop();
        delete restaurantIndices[restaurant];
        isRegistered[restaurant] = false;

        emit RestaurantRemoved(restaurant);
    }

    // Get restaurants sorted by custom ratio
    function getRestaurantsByRatio() external view returns (string[] memory) {
        uint256 length = restaurants.length;
        RestaurantInfo[] memory sortedRestaurants = new RestaurantInfo[](
            length
        );

        // Copy restaurants array for sorting
        for (uint i = 0; i < length; i++) {
            sortedRestaurants[i] = restaurants[i];
        }

        // Sort restaurants by custom ratio (ascending)
        for (uint i = 0; i < length; i++) {
            for (uint j = i + 1; j < length; j++) {
                if (
                    _calculateCustomRatio(
                        sortedRestaurants[i].restaurantAddress
                    ) >
                    _calculateCustomRatio(
                        sortedRestaurants[j].restaurantAddress
                    )
                ) {
                    (sortedRestaurants[i], sortedRestaurants[j]) = (
                        sortedRestaurants[j],
                        sortedRestaurants[i]
                    );
                }
            }
        }

        string[] memory results = new string[](length);
        for (uint i = 0; i < length; i++) {
            results[i] = string(
                abi.encodePacked(
                    "Restaurant Address: ",
                    toAsciiString(sortedRestaurants[i].restaurantAddress),
                    ", Google Map ID: ",
                    sortedRestaurants[i].googlemap_id,
                    ", Custom Ratio: ",
                    uintToString(
                        _calculateCustomRatio(
                            sortedRestaurants[i].restaurantAddress
                        )
                    )
                )
            );
        }

        return results;
    }

    // Modified payment function to credit balance instead of direct transfer
    function pay(address restaurant, uint256 usdtAmount) public {
        require(restaurant != address(0), "Invalid restaurant address");
        require(isRegistered[restaurant], "Restaurant not registered");
        require(usdtAmount > 0, "Amount must be greater than zero");

        _cleanupOldData(restaurantVolumes[restaurant]);
        _cleanupOldData(totalVolumes);

        uint256 customRatio = _calculateCustomRatio(restaurant);
        _updateVolumes(restaurant, usdtAmount);

        uint256 adjustedAmount = (usdtAmount * customRatio) / 1e18;

        // Transfer USDT from sender to this contract
        usdtToken.safeTransferFrom(msg.sender, address(this), adjustedAmount);

        // Update the restaurant's balance
        balances[restaurant] += adjustedAmount;

        emit BalanceUpdated(restaurant, balances[restaurant]);

        emit PaymentProcessed(
            msg.sender,
            restaurant,
            usdtAmount,
            adjustedAmount,
            customRatio
        );
    }

    // Function for restaurants to redeem their USDT balance
    function redeem() external onlyRegisteredRestaurant {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance to redeem");

        // Reset the balance before transfer to prevent re-entrancy
        balances[msg.sender] = 0;
        emit BalanceUpdated(msg.sender, balances[msg.sender]);

        // Transfer USDT to the restaurant
        usdtToken.safeTransfer(msg.sender, amount);

        emit Redemption(msg.sender, amount);
    }

    // Internal function to update volume data
    function _updateVolumes(address restaurant, uint256 usdtAmount) internal {
        uint256 currentTime = block.timestamp;

        restaurantVolumes[restaurant].push(
            VolumeData({amount: usdtAmount, timestamp: currentTime})
        );
        totalVolumes.push(
            VolumeData({amount: usdtAmount, timestamp: currentTime})
        );

        _cleanupOldData(restaurantVolumes[restaurant]);
        _cleanupOldData(totalVolumes);
    }

    // Internal function to clean up old volume data beyond the time window
    function _cleanupOldData(VolumeData[] storage volumes) internal {
        uint256 cutoffTime = block.timestamp - timeWindow;

        uint256 entriesToRemove = 0;
        for (uint256 i = 0; i < volumes.length; i++) {
            if (volumes[i].timestamp < cutoffTime) {
                entriesToRemove++;
            } else {
                break;
            }
        }

        if (entriesToRemove > 0) {
            if (entriesToRemove == volumes.length) {
                while (volumes.length > 0) {
                    volumes.pop();
                }
            } else {
                for (uint256 i = 0; i < volumes.length - entriesToRemove; i++) {
                    volumes[i] = volumes[i + entriesToRemove];
                }
                for (uint256 i = 0; i < entriesToRemove; i++) {
                    volumes.pop();
                }
            }
        }
    }

    // Internal function to calculate custom ratio based on volumes
    function _calculateCustomRatio(
        address restaurant
    ) public view returns (uint256) {
        uint256 TT_a = _getTotalVolume(restaurantVolumes[restaurant]);
        uint256 TT_total = _getTotalVolume(totalVolumes);

        if (TT_total == 0 || TT_a == 0) {
            return baseRatio;
        }

        // Calculate relative share (scaled by 1e18)
        uint256 relativeShare = (TT_a * 1e18) / TT_total;

        // Inverse decay: smaller share = larger decay
        uint256 inverseShare = 1e18 - relativeShare;
        uint256 decay = (inverseShare * decayFactor) / 1e18;

        // Calculate current ratio
        uint256 currentRatio = baseRatio;
        if (decay > 0) {
            uint256 reduction = (baseRatio * decay) / 1e18;
            if (reduction >= baseRatio - minRatio) {
                return minRatio;
            }
            currentRatio = baseRatio - reduction;
        }

        return currentRatio < minRatio ? minRatio : currentRatio;
    }

    // Internal function to get total volume from volume data
    function _getTotalVolume(
        VolumeData[] storage volumes
    ) internal view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < volumes.length; i++) {
            total += volumes[i].amount;
        }
        return total;
    }

    // Helper function to convert uint to string
    function uintToString(uint v) internal pure returns (string memory) {
        if (v == 0) {
            return "0";
        }
        uint maxlength = 100;
        bytes memory reversed = new bytes(maxlength);
        uint i = 0;
        while (v != 0) {
            uint remainder = v % 10;
            v = v / 10;
            reversed[i++] = bytes1(uint8(48 + remainder));
        }
        bytes memory s = new bytes(i);
        for (uint j = 0; j < i; j++) {
            s[j] = reversed[i - j - 1];
        }
        string memory str = string(s);
        return str;
    }

    // Helper function to convert address to string
    function toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint(uint160(x)) / (2 ** (8 * (19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2 * i] = char(hi);
            s[2 * i + 1] = char(lo);
        }
        return string(s);
    }

    // Helper function for toAsciiString
    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }
}