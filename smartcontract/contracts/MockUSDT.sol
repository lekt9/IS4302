// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "USDT") {
        _mint(msg.sender, 100000000); // Initialize 100,000,000 USDT to the deployer
    }

    // Override the decimals function to set the number of decimals to 6
    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
} 