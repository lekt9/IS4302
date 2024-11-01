# Test Cases for PaymentContract Smart Contract

To ensure that the `PaymentContract` works correctly within the system, comprehensive testing is necessary. The following test cases cover all functionalities, edge cases, and security aspects of the smart contract. These tests should be performed using a testing framework like Truffle or Hardhat, and consider using tools like Ganache for local blockchain simulation.

---

## **1. Restaurant Registration**

### **Test Case 1.1: Register a Valid Restaurant Address by the Owner**

- **Setup**: Deploy the contract; the deployer is set as the owner.
- **Action**: Owner calls `registerRestaurant` with a valid restaurant address.
- **Expected Result**:
  - The restaurant is registered (`registeredRestaurants[restaurant] == true`).
  - The restaurant address is added to `restaurantAddresses`.
  - `RestaurantRegistered` event is emitted with the correct address.

### **Test Case 1.2: Attempt to Register a Restaurant Address by a Non-Owner**

- **Action**: A non-owner account calls `registerRestaurant` with a valid address.
- **Expected Result**: Transaction reverts with the message "Only owner can call this function".

### **Test Case 1.3: Attempt to Register an Invalid Restaurant Address (Zero Address)**

- **Action**: Owner calls `registerRestaurant` with `address(0)`.
- **Expected Result**: Transaction reverts with the message "Invalid restaurant address".

### **Test Case 1.4: Attempt to Register an Already Registered Restaurant**

- **Setup**: A restaurant address is already registered.
- **Action**: Owner calls `registerRestaurant` with the same address.
- **Expected Result**: Transaction reverts with the message "Restaurant already registered".

---

## **2. Restaurant Removal**

### **Test Case 2.1: Remove a Registered Restaurant by the Owner**

- **Setup**: A restaurant is registered.
- **Action**: Owner calls `removeRestaurant` with the restaurant's address.
- **Expected Result**:
  - The restaurant is unregistered (`registeredRestaurants[restaurant] == false`).
  - The restaurant address is removed from `restaurantAddresses`.
  - `RestaurantRemoved` event is emitted with the correct address.

### **Test Case 2.2: Attempt to Remove a Restaurant by a Non-Owner**

- **Action**: A non-owner account calls `removeRestaurant` with a registered address.
- **Expected Result**: Transaction reverts with the message "Only owner can call this function".

### **Test Case 2.3: Attempt to Remove a Restaurant That Is Not Registered**

- **Action**: Owner calls `removeRestaurant` with an address that is not registered.
- **Expected Result**: Transaction reverts with the message "Restaurant not registered".

---

## **3. Payment Processing**

### **Test Case 3.1: Process a Payment to a Registered Restaurant**

- **Setup**:
  - A restaurant is registered.
  - The user has enough USDT balance.
  - The user has approved the `PaymentContract` to spend the USDT amount.
- **Action**: User calls `pay` with the restaurant's address and a valid USDT amount.
- **Expected Result**:
  - The payment is processed without errors.
  - The adjusted amount is correctly calculated and transferred to the restaurant.
  - `PaymentProcessed` event is emitted with correct parameters.

### **Test Case 3.2: Attempt to Process a Payment to an Unregistered Restaurant**

- **Action**: User calls `pay` with an unregistered restaurant address and a valid amount.
- **Expected Result**: Transaction reverts with the message "Restaurant not registered".

### **Test Case 3.3: Attempt to Process a Payment with Zero Amount**

- **Action**: User calls `pay` with a registered restaurant address and an amount of zero.
- **Expected Result**: Transaction reverts with the message "Amount must be greater than zero".

### **Test Case 3.4: Attempt to Process a Payment with an Invalid Restaurant Address (Zero Address)**

- **Action**: User calls `pay` with `address(0)` and a valid amount.
- **Expected Result**: Transaction reverts with the message "Invalid restaurant address".

### **Test Case 3.5: User Has Not Approved USDT Transfer to the Contract**

- **Action**: User calls `pay` without prior approval of USDT transfer to the `PaymentContract`.
- **Expected Result**: Transaction reverts due to ERC20 transfer failure (SafeERC20 should handle this).

---

## **4. Volume Data Updating**

### **Test Case 4.1: Volume Data Is Updated After Processing a Payment**

- **Action**: Process a payment to a registered restaurant.
- **Expected Result**:
  - `restaurantVolumes[restaurant]` contains a new `VolumeData` entry with correct amount and timestamp.
  - `totalVolumes` contains a new `VolumeData` entry with correct amount and timestamp.

### **Test Case 4.2: Multiple Payments Accumulate Correctly Within the Time Window**

- **Action**: Process multiple payments to a restaurant within the time window.
- **Expected Result**:
  - `restaurantVolumes[restaurant]` contains all the new entries.
  - `totalVolumes` reflects all payments.
  - Total volumes are summed correctly in calculations.

---

## **5. Custom Ratio Calculation**

### **Test Case 5.1: Custom Ratio When Total Transactions Are Zero**

- **Setup**: No prior payments have been made.
- **Action**: Process a payment.
- **Expected Result**:
  - `TT_total` is zero; `relativeShare` is set to zero.
  - `decay` is zero.
  - `currentRatio` equals `baseRatio` (unless `baseRatio` is less than `minRatio`).
  - Adjusted amount is calculated using `baseRatio`.

### **Test Case 5.2: Custom Ratio When Restaurant Has No Transactions**

- **Setup**: Other restaurants have transactions, but the target restaurant has none.
- **Action**: Process a payment to the target restaurant.
- **Expected Result**:
  - `TT_a` is zero; `relativeShare` is zero.
  - `decay` is zero.
  - `currentRatio` equals `baseRatio`.
  - Adjusted amount is calculated using `baseRatio`.

### **Test Case 5.3: Custom Ratio Does Not Fall Below Minimum Ratio**

- **Setup**: Simulate high transaction volumes leading to a potential `currentRatio` below `minRatio`.
- **Action**: Process payments to the restaurant until `currentRatio` would be below `minRatio`.
- **Expected Result**:
  - `currentRatio` is not less than `minRatio`.
  - Adjusted amount is calculated using `minRatio`.

### **Test Case 5.4: Custom Ratio Decreases as Restaurant's Transaction Volume Increases**

- **Action**: Process multiple payments to the same restaurant.
- **Expected Result**:
  - `TT_a` increases with each payment.
  - `relativeShare` increases.
  - `decay` increases.
  - `currentRatio` decreases accordingly but not below `minRatio`.

### **Test Case 5.5: Custom Ratio Increases When Older Transactions Fall Outside the Time Window**

- **Setup**: Process payments to a restaurant to decrease `currentRatio`.
- **Action**: Advance blockchain time beyond `timeWindow`, process a new payment.
- **Expected Result**:
  - Old volume data is cleaned up.
  - `TT_a` decreases due to cleanup.
  - `currentRatio` increases back towards `baseRatio`.

---

## **6. Cleaning Up Old Volume Data**

### **Test Case 6.1: Old Volume Data Is Removed Correctly After Time Window Passes**

- **Action**: Process payments, advance blockchain time beyond `timeWindow`, process another payment.
- **Expected Result**:
  - Volume entries older than `timeWindow` are removed from `restaurantVolumes` and `totalVolumes`.
  - Remaining volumes are within the time window.

### **Test Case 6.2: Volume Data Integrity After Cleanup**

- **Expected Result**:
  - No residual data from old transactions.
  - Volumes are correctly summed for calculations.
  - Volume arrays maintain data consistency.

---

## **7. Security and Access Control**

### **Test Case 7.1: Only Owner Can Register or Remove Restaurants**

- **Action**: Non-owner tries to call `registerRestaurant` or `removeRestaurant`.
- **Expected Result**: Transaction reverts with "Only owner can call this function".

### **Test Case 7.2: Reentrancy Attack Prevention in `pay` Function**

- **Action**: Attempt to create a reentrancy attack during `pay` execution (e.g., via a malicious token).
- **Expected Result**:
  - `pay` function remains secure.
  - No reentrancy is possible due to the use of `SafeERC20` and no external calls before state changes.

### **Test Case 7.3: Integer Overflow and Underflow Protection**

- **Action**: Use extremely large values for payments to test for overflows.
- **Expected Result**:
  - No overflows occur due to Solidity ^0.8.17 built-in checks.
  - Calculations handle large numbers correctly.

### **Test Case 7.4: Block Timestamp Manipulation Consideration**

- **Action**: Simulate minor adjustments in `block.timestamp`.
- **Expected Result**:
  - Contract handles timestamps appropriately.
  - Minor timestamp manipulation does not significantly affect the logic.

---

## **8. Event Emission**

### **Test Case 8.1: `PaymentProcessed` Event Emitted with Correct Parameters**

- **Action**: Process a payment.
- **Expected Result**:
  - `PaymentProcessed` event is emitted.
  - Event parameters (`user`, `restaurant`, `originalAmount`, `adjustedAmount`, `customRatio`) are correct.

### **Test Case 8.2: `RestaurantRegistered` and `RestaurantRemoved` Events Emitted Correctly**

- **Action**: Register and remove a restaurant.
- **Expected Result**:
  - `RestaurantRegistered` event is emitted upon registration.
  - `RestaurantRemoved` event is emitted upon removal.
  - Event parameters are accurate.

---

## **9. Edge Cases**

### **Test Case 9.1: Process Payment When Only One Restaurant Has Transactions**

- **Action**: Process payments only to one restaurant.
- **Expected Result**:
  - `TT_total` equals `TT_a`.
  - `relativeShare` is `1e18` (scaled value for 100%).
  - `decay` reaches maximum based on `DF` and `BR`.
  - `currentRatio` adjusts accordingly but not below `minRatio`.

### **Test Case 9.2: Process Payment When Multiple Restaurants Have Transactions**

- **Action**: Process payments to multiple restaurants.
- **Expected Result**:
  - Each restaurant's `TT_a` reflects their transaction volumes.
  - `TT_total` includes all transactions.
  - `relativeShare` and `currentRatio` are calculated correctly for each.

### **Test Case 9.3: Process Payment with Maximum Possible USDT Amount**

- **Action**: Process a payment with the maximum uint256 value (if practical).
- **Expected Result**:
  - Calculations handle the large amount without errors.
  - Adjusted amount is calculated correctly.
  - Transaction succeeds or fails gracefully if limits are exceeded.

---

## **10. Gas Optimization**

### **Test Case 10.1: Gas Consumption for `pay` Function Is Acceptable**

- **Action**: Measure gas used during a `pay` transaction.
- **Expected Result**:
  - Gas consumption is within acceptable limits for Polygon network.
  - No excessive gas costs due to array operations.

### **Test Case 10.2: Gas Consumption Increases Linearly with Volume Entries**

- **Action**: Process multiple payments and observe gas usage.
- **Expected Result**:
  - Gas usage increases linearly, not exponentially, with the number of volume entries.
  - Gas costs remain manageable.

### **Test Case 10.3: Contract Behavior with Large Volume Arrays**

- **Action**: Simulate many transactions to create large volume arrays.
- **Expected Result**:
  - Contract functions correctly without running into gas limits.
  - Consider optimizing data structures if gas usage becomes too high.

---

## **11. Frontend Integration**

### **Test Case 11.1: Frontend Can Fetch Current Parameters (BR, DF, MR)**

- **Action**: Frontend calls public variables to fetch `baseRatio`, `decayFactor`, `minRatio`.
- **Expected Result**: Parameters are accessible and match the contract's state.

### **Test Case 11.2: Frontend Can Estimate Adjusted Price**

- **Action**: Frontend uses current parameters and estimates volumes to calculate the adjusted price.
- **Expected Result**:
  - Estimated price is close to the actual adjusted amount.
  - Users are provided with reasonable price expectations.

---

## **12. Data Integrity**

### **Test Case 12.1: Volume Data Arrays Remain Consistent After Multiple Payments and Cleanups**

- **Action**: Process numerous payments, including advancing time to trigger cleanups.
- **Expected Result**:
  - Volume data arrays are accurate and consistent.
  - No data corruption occurs.

---

## **13. Time Window Handling**

### **Test Case 13.1: Payments Just Inside and Just Outside the Time Window**

- **Action**:
  - Process payments at times `T`, `T + timeWindow - δ`, `T + timeWindow + δ` (where `δ` is a small delta).
- **Expected Result**:
  - Payments within `timeWindow` are included in volumes.
  - Payments outside are excluded.
  - Volume calculations reflect only the relevant transactions.

### **Test Case 13.2: Simulate Payments at Various Times**

- **Action**: Process payments at different intervals and advance time accordingly.
- **Expected Result**:
  - Volume data updates correctly with respect to the time window.
  - `currentRatio` adjusts as expected over time.

---

## **14. Multiple Users and Restaurants**

### **Test Case 14.1: Multiple Users Making Payments to the Same Restaurant**

- **Action**: Different users process payments to the same restaurant.
- **Expected Result**:
  - `TT_a` for the restaurant accumulates correctly.
  - `TT_total` includes all payments.
  - Custom ratio for the restaurant adjusts based on combined volume.

### **Test Case 14.2: Multiple Users Making Payments to Different Restaurants**

- **Action**: Different users process payments to different restaurants.
- **Expected Result**:
  - Each restaurant's `TT_a` reflects its own volume.
  - `TT_total` accumulates all transactions.
  - Custom ratios are calculated individually per restaurant.

---

## **15. Token Transfer Functionality**

### **Test Case 15.1: USDT Transfer Succeeds When User Has Sufficient Balance and Allowance**

- **Action**: User approves the contract and processes a payment.
- **Expected Result**:
  - USDT is transferred from the user to the restaurant.
  - Balances update correctly.

### **Test Case 15.2: USDT Transfer Fails When User Lacks Balance**

- **Setup**: User's USDT balance is less than the payment amount.
- **Action**: User attempts to process a payment.
- **Expected Result**: Transaction reverts due to insufficient balance.

### **Test Case 15.3: USDT Transfer Fails When User Has Not Approved Enough Allowance**

- **Setup**: User approves less USDT than the payment amount.
- **Action**: User attempts to process a payment.
- **Expected Result**: Transaction reverts due to insufficient allowance.

---

## **16. Initialization**

### **Test Case 16.1: Contract Initializes Correctly with Given Parameters**

- **Action**: Deploy the contract with specified parameters.
- **Expected Result**:
  - `usdtToken` is set correctly.
  - `owner` is the deployer.
  - `baseRatio`, `decayFactor`, `minRatio`, and `timeWindow` are set correctly.

---

## **17. Fallback Functionality**

### **Test Case 17.1: Contract Does Not Accept ETH**

- **Action**: Send ETH directly to the contract address.
- **Expected Result**: Transaction reverts because the contract does not have a payable fallback function.

---

## **18. Correctness of Calculations**

### **Test Case 18.1: Verify Mathematical Correctness of Custom Ratio Calculations**

- **Action**:
  - Manually calculate expected `currentRatio` based on known volumes and parameters.
  - Process a payment and compare on-chain `customRatio`.
- **Expected Result**:
  - On-chain `customRatio` matches manual calculations.
  - Adjusted amount is correct.

---

## **19. Interaction with USDT Token Contract**

### **Test Case 19.1: Ensure `safeTransferFrom` Works Correctly with USDT**

- **Note**: USDT may not fully comply with ERC20 standards.
- **Action**: Test USDT transfers using `safeTransferFrom`.
- **Expected Result**:
  - Transfers work correctly.
  - No unexpected reverts or failures occur.

---

## **20. Testing with Mock Tokens**

### **Test Case 20.1: Use a Mock USDT Token in Testing Environment**

- **Action**: Deploy a mock USDT token contract with standard ERC20 behavior.
- **Expected Result**:
  - Testing environment accurately simulates USDT behavior.
  - Contract functions correctly with the mock token.

---

## **21. Overall System Integration**

### **Test Case 21.1: End-to-End Test from Frontend to Backend to Smart Contract**

- **Action**:
  - User selects items on the frontend.
  - Frontend estimates adjusted price.
  - User approves USDT transfer and processes payment.
  - Backend receives payment event (optional).
- **Expected Result**:
  - User successfully completes payment.
  - Adjusted amount is transferred to the restaurant.
  - Order is processed correctly.
  - Frontend displays confirmation and accurate information.

---

## **Additional Considerations**

- **Simulate High Transaction Volumes**: To test scalability, simulate a scenario with many transactions and ensure the contract remains performant.
- **Security Audits**: Consider professional security audits to identify any vulnerabilities not covered by test cases.
- **Continuous Integration**: Implement automated testing for all these cases to ensure contract reliability upon any updates.

---

By thoroughly testing these cases, you can ensure that the `PaymentContract` functions correctly, securely, and efficiently within your system, providing a reliable platform for users and restaurants on the Polygon network.