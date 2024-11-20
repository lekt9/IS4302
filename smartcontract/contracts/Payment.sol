// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./MockUSDT.sol";

contract PaymentContract {
    using SafeERC20 for IERC20;

    IERC20 public usdtToken;
    address public owner;

    // Struct to store restaurant details with Google Map ID
    struct RestaurantInfo {
        string googlemap_id;
        uint256 customRatio;
        uint256 balance;
    }

    // Mapping to track registered restaurants and Google Map ID pairs
    mapping(address => RestaurantInfo) public restaurants;
    address[] public restaurantAddresses;

    // Base Ratio (BR), Decay Factor (DF), Minimum Ratio (MR)
    uint256 public baseRatio; // e.g., 1 * 1e18 (1.00)
    uint256 public decayFactor; // e.g., 0.5 * 1e18 (0.50)
    uint256 public minRatio; // e.g., 0.90 * 1e18 (0.90)

    // Time window for transaction volumes (e.g., 1 hour)
    uint256 public timeWindow; // In seconds, e.g., 3600 for 1 hour

    // Events for restaurant management
    event RestaurantRegistered(address indexed restaurant, string googlemap_id);
    event RestaurantRemoved(address indexed restaurant);

    event PaymentProcessed(
        address indexed user,
        address indexed restaurant,
        uint256 originalAmount,
        uint256 adjustedAmount,
        uint256 customRatio
    );

    event BalanceRedeemed(address indexed restaurant, uint256 amount);

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
            bytes(restaurants[msg.sender].googlemap_id).length != 0,
            "Restaurant not registered"
        );
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

    // Function to register a new restaurant with Google Map ID
    function registerRestaurant(string memory googlemap_id) external {
        require(msg.sender != address(0), "Invalid restaurant address");
        require(
            bytes(restaurants[msg.sender].googlemap_id).length == 0,
            "Restaurant already registered"
        );

        restaurants[msg.sender] = RestaurantInfo({
            googlemap_id: googlemap_id,
            customRatio: baseRatio,
            balance: 0
        });
        restaurantAddresses.push(msg.sender);

        emit RestaurantRegistered(msg.sender, googlemap_id);
    }

    // Function to remove a restaurant
    function removeRestaurant(address restaurant) external onlyOwner {
        require(
            bytes(restaurants[restaurant].googlemap_id).length != 0,
            "Restaurant not registered"
        );

        delete restaurants[restaurant];

        for (uint i = 0; i < restaurantAddresses.length; i++) {
            if (restaurantAddresses[i] == restaurant) {
                restaurantAddresses[i] = restaurantAddresses[
                    restaurantAddresses.length - 1
                ];
                restaurantAddresses.pop();
                break;
            }
        }

        emit RestaurantRemoved(restaurant);
    }

    // Function to get restaurants sorted by custom ratio in ascending order
    function getRestaurantsByRatio() external view returns (string[] memory) {
        uint256 length = restaurantAddresses.length;
        RestaurantInfo[] memory sortedRestaurants = new RestaurantInfo[](
            length
        );
        address[] memory sortedAddresses = new address[](length);

        for (uint i = 0; i < length; i++) {
            sortedRestaurants[i] = restaurants[restaurantAddresses[i]];
            sortedAddresses[i] = restaurantAddresses[i];
        }

        for (uint i = 0; i < length; i++) {
            for (uint j = i + 1; j < length; j++) {
                if (
                    _calculateCustomRatio(sortedAddresses[i]) >
                    _calculateCustomRatio(sortedAddresses[j])
                ) {
                    (sortedRestaurants[i], sortedRestaurants[j]) = (
                        sortedRestaurants[j],
                        sortedRestaurants[i]
                    );
                    (sortedAddresses[i], sortedAddresses[j]) = (
                        sortedAddresses[j],
                        sortedAddresses[i]
                    );
                }
            }
        }

        string[] memory results = new string[](length);
        for (uint i = 0; i < length; i++) {
            results[i] = string(
                abi.encodePacked(
                    "Restaurant Address: ",
                    toAsciiString(sortedAddresses[i]),
                    ", Google Map ID: ",
                    sortedRestaurants[i].googlemap_id,
                    ", Custom Ratio: ",
                    uintToString(_calculateCustomRatio(sortedAddresses[i]))
                )
            );
        }

        return results;
    }

    // Function to process payment
    function pay(address restaurant, uint256 usdtAmount) external {
        require(restaurant != address(0), "Invalid restaurant address");
        require(
            bytes(restaurants[restaurant].googlemap_id).length != 0,
            "Restaurant not registered"
        );
        require(usdtAmount > 0, "Amount must be greater than zero");

        _cleanupOldData(restaurantVolumes[restaurant]);
        _cleanupOldData(totalVolumes);

        uint256 customRatio = _calculateCustomRatio(restaurant);
        _updateVolumes(restaurant, usdtAmount);

        uint256 adjustedAmount = (usdtAmount * customRatio) / 1e18;
        usdtToken.safeTransferFrom(msg.sender, address(this), adjustedAmount);
        restaurants[restaurant].balance += adjustedAmount;

        emit PaymentProcessed(
            msg.sender,
            restaurant,
            usdtAmount,
            adjustedAmount,
            customRatio
        );
    }

    // Function to get the balance of a restaurant
    function balanceOf(address restaurant) external view returns (uint256) {
        require(
            bytes(restaurants[restaurant].googlemap_id).length != 0,
            "Restaurant not registered"
        );
        return restaurants[restaurant].balance;
    }

    // Function for restaurants to redeem their balance
    function redeemBalance(uint256 amount) external onlyRegisteredRestaurant {
        require(amount > 0, "Amount must be greater than zero");
        require(
            restaurants[msg.sender].balance >= amount,
            "Insufficient balance"
        );

        restaurants[msg.sender].balance -= amount;
        usdtToken.safeTransfer(msg.sender, amount);

        emit BalanceRedeemed(msg.sender, amount);
    }

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

    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }
}
