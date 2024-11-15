const PaymentContract = artifacts.require("PaymentContract");
const MockUSDT = artifacts.require("MockUSDT");
const { BN, expectRevert, expectEvent, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

contract("PaymentContract", accounts => {
    // Define accounts for different roles
    const [owner, restaurant1, restaurant2, user1, user2] = accounts;
    
    // Initialize contract instances
    let paymentContract;
    let mockUSDT;
    
    // Constants for contract parameters (using BN for big numbers)
    const BASE_RATIO = new BN('1000000000000000000'); // 1.0 * 1e18
    const DECAY_FACTOR = new BN('500000000000000000'); // 0.5 * 1e18
    const MIN_RATIO = new BN('900000000000000000');   // 0.9 * 1e18
    const TIME_WINDOW = new BN('3600');               // 1 hour in seconds
    const INITIAL_USDT_SUPPLY = new BN('100000000'); // 100M USDT with 6 decimals

    beforeEach(async () => {
        try {
            // Deploy MockUSDT
            mockUSDT = await MockUSDT.new();
            
            // Deploy PaymentContract
            paymentContract = await PaymentContract.new(
                mockUSDT.address,
                BASE_RATIO,
                DECAY_FACTOR,
                MIN_RATIO,
                TIME_WINDOW
            );

            // Transfer some USDT to users for testing (updating amounts to be smaller)
            await mockUSDT.transfer(user1, new BN('1000000'), { from: owner }); // 1 USDT
            await mockUSDT.transfer(user2, new BN('1000000'), { from: owner }); // 1 USDT
        } catch (error) {
            console.error('Error in beforeEach:', error);
            throw error;
        }
    });

    describe("1. Contract Initialization", () => {
        it("1.1 Should initialize with correct parameters", async () => {
            expect(await paymentContract.owner()).to.equal(owner);
            expect(await paymentContract.usdtToken()).to.equal(mockUSDT.address);
            expect(await paymentContract.baseRatio()).to.be.bignumber.equal(BASE_RATIO);
            expect(await paymentContract.decayFactor()).to.be.bignumber.equal(DECAY_FACTOR);
            expect(await paymentContract.minRatio()).to.be.bignumber.equal(MIN_RATIO);
            expect(await paymentContract.timeWindow()).to.be.bignumber.equal(TIME_WINDOW);
        });
    });

    describe("2. Restaurant Registration", () => {
        it("2.1 Restaurant should be able to register itself", async () => {
            const googlemapId = "test_google_map_id";
            const result = await paymentContract.registerRestaurant(googlemapId, { from: restaurant1 });
            
            // Check if restaurant is registered
            const restaurantInfo = await paymentContract.restaurants(restaurant1);
            expect(restaurantInfo.googlemap_id).to.equal(googlemapId);
            expect(restaurantInfo.customRatio).to.be.bignumber.equal(BASE_RATIO);
            
            // Check if event was emitted
            expectEvent(result, 'RestaurantRegistered', {
                restaurant: restaurant1,
                googlemap_id: googlemapId
            });
        });

        it("2.2 Should not allow registering same restaurant twice", async () => {
            const googlemapId = "test_google_map_id";
            await paymentContract.registerRestaurant(googlemapId, { from: restaurant1 });
            await expectRevert(
                paymentContract.registerRestaurant(googlemapId, { from: restaurant1 }),
                "Restaurant already registered"
            );
        });
    });

    describe("3. Restaurant Removal", () => {
        beforeEach(async () => {
            const googlemapId = "test_google_map_id";
            await paymentContract.registerRestaurant(googlemapId, { from: restaurant1 });
        });

        it("3.1 Owner should be able to remove a restaurant", async () => {
            const result = await paymentContract.removeRestaurant(restaurant1, { from: owner });
            
            const restaurantInfo = await paymentContract.restaurants(restaurant1);
            expect(restaurantInfo.googlemap_id).to.equal(""); // Should be empty after removal
            
            expectEvent(result, 'RestaurantRemoved', {
                restaurant: restaurant1
            });
        });

        it("3.2 Should not allow non-owner to remove restaurant", async () => {
            await expectRevert(
                paymentContract.removeRestaurant(restaurant1, { from: user1 }),
                "Only owner can call this function"
            );
        });

        it("3.3 Should not allow removing non-registered restaurant", async () => {
            await expectRevert(
                paymentContract.removeRestaurant(restaurant2, { from: owner }),
                "Restaurant not registered"
            );
        });
    });

    describe("4. Payment Processing", () => {
        const paymentAmount = new BN('1000000'); // 1 USDT

        beforeEach(async () => {
            const googlemapId = "test_google_map_id";
            await paymentContract.registerRestaurant(googlemapId, { from: restaurant1 });
            // Transfer more USDT to user1 for testing
            await mockUSDT.transfer(user1, new BN('10000000'), { from: owner }); // 10 USDT
            // Approve payment contract to spend user's USDT
            await mockUSDT.approve(paymentContract.address, new BN('100000000'), { from: user1 }); // 100 USDT approval
        });

        it("4.1 Should process payment successfully", async () => {
            const initialRestaurantBalance = await mockUSDT.balanceOf(restaurant1);
            const initialUserBalance = await mockUSDT.balanceOf(user1);
            
            const result = await paymentContract.pay(restaurant1, paymentAmount, { from: user1 });
            
            const finalRestaurantBalance = await mockUSDT.balanceOf(restaurant1);
            const finalUserBalance = await mockUSDT.balanceOf(user1);
            
            // For first payment, amount should be unadjusted (baseRatio = 1.0)
            const expectedTransferAmount = paymentAmount;
            
            // Check balances
            expect(finalRestaurantBalance.sub(initialRestaurantBalance))
                .to.be.bignumber.equal(expectedTransferAmount);
            expect(initialUserBalance.sub(finalUserBalance))
                .to.be.bignumber.equal(expectedTransferAmount);
                
            // Check event
            const event = result.logs.find(log => log.event === 'PaymentProcessed');
            expect(event.args.originalAmount).to.be.bignumber.equal(paymentAmount);
            expect(event.args.adjustedAmount).to.be.bignumber.equal(expectedTransferAmount);
            expect(event.args.customRatio).to.be.bignumber.equal(BASE_RATIO);
        });

        it("4.2 Should fail payment to unregistered restaurant", async () => {
            await expectRevert(
                paymentContract.pay(restaurant2, paymentAmount, { from: user1 }),
                "Restaurant not registered"
            );
        });

        it("4.3 Should fail payment with zero amount", async () => {
            await expectRevert(
                paymentContract.pay(restaurant1, 0, { from: user1 }),
                "Amount must be greater than zero"
            );
        });

        it("4.4 Should fail payment without USDT approval", async () => {
            // Reset approval
            await mockUSDT.approve(paymentContract.address, 0, { from: user1 });
            
            await expectRevert.unspecified(
                paymentContract.pay(restaurant1, paymentAmount, { from: user1 })
            );
        });
    });

    describe("5. Get Restaurants By Ratio", () => {
        beforeEach(async () => {
            // Register two restaurants with different initial conditions
            await paymentContract.registerRestaurant("GoogleMapID_Restaurant1", { from: restaurant1 });
            await paymentContract.registerRestaurant("GoogleMapID_Restaurant2", { from: restaurant2 });
    
            // Transfer USDT to user1 and approve PaymentContract to spend
            await mockUSDT.transfer(user1, new BN('1000'), { from: owner }); // 1000 USDT
            await mockUSDT.approve(paymentContract.address, new BN('1000'), { from: user1 }); // 1000 USDT approval
    
            // Make payments to both restaurants to adjust their customRatios
            await paymentContract.pay(restaurant1, new BN('1'), { from: user1 }); // 1 USDT
            await paymentContract.pay(restaurant2, new BN('30'), { from: user1 }); // 30 USDT
        });
    
        it("5.1 Should return restaurants sorted by custom ratio in ascending order", async () => {
            const sortedRestaurants = await paymentContract.getRestaurantsByRatio();
    
            // Check the expected custom ratios
            const customRatio1 = await paymentContract._calculateCustomRatio(restaurant1);
            const customRatio2 = await paymentContract._calculateCustomRatio(restaurant2);
    
            // Construct the expected strings based on the output format
            const expectedRestaurant1 = `Restaurant Address: ${restaurant1.toLowerCase().slice(2)}, Google Map ID: GoogleMapID_Restaurant1, Custom Ratio: ${customRatio1}`;
            const expectedRestaurant2 = `Restaurant Address: ${restaurant2.toLowerCase().slice(2)}, Google Map ID: GoogleMapID_Restaurant2, Custom Ratio: ${customRatio2}`;
    
            // Check if the first restaurant in the sorted list is restaurant2
            expect(sortedRestaurants[0]).to.equal(expectedRestaurant2);

            // Check if the second restaurant in the sorted list is restaurant1
            expect(sortedRestaurants[1]).to.equal(expectedRestaurant1);
        });
    });
    
    describe("6. Multiple Restaurants and Transactions Scenario", () => {
        const [restaurant1, restaurant2, restaurant3, restaurant4] = accounts.slice(1, 5);
        const [user1, user2, user3] = accounts.slice(5, 8);
        
        beforeEach(async () => {
            // Give users some USDT for testing
            await mockUSDT.transfer(user1, new BN('10000000'), { from: owner }); // 10 USDT
            await mockUSDT.transfer(user2, new BN('10000000'), { from: owner }); // 10 USDT
            await mockUSDT.transfer(user3, new BN('10000000'), { from: owner }); // 10 USDT

            // Approve payment contract to spend users' USDT
            await mockUSDT.approve(paymentContract.address, new BN('10000000'), { from: user1 });
            await mockUSDT.approve(paymentContract.address, new BN('10000000'), { from: user2 });
            await mockUSDT.approve(paymentContract.address, new BN('10000000'), { from: user3 });

            // Register multiple restaurants
            await paymentContract.registerRestaurant("https://maps.app.goo.gl/fXir65f1jDQTkQDQ6", { from: restaurant1 });
            await paymentContract.registerRestaurant("https://maps.app.goo.gl/PA9hRDf5WaoYtvJu7", { from: restaurant2 });
            await paymentContract.registerRestaurant("https://maps.app.goo.gl/uaJ9ryRGjRrjsQqa9", { from: restaurant3 });
            await paymentContract.registerRestaurant("https://maps.app.goo.gl/AWGmMjc3UHxYgXu99", { from: restaurant4 });
        });

        it("6.1 Should process multiple transactions and affect custom ratios", async () => {
            // Initial balances
            const initialBalances = await Promise.all([
                mockUSDT.balanceOf(restaurant1),
                mockUSDT.balanceOf(restaurant2),
                mockUSDT.balanceOf(restaurant3),
                mockUSDT.balanceOf(restaurant4)
            ]);

            // First round of transactions
            await paymentContract.pay(restaurant1, new BN('1000000'), { from: user1 }); // 1 USDT
            await paymentContract.pay(restaurant2, new BN('2000000'), { from: user2 }); // 2 USDT
            await paymentContract.pay(restaurant3, new BN('3000000'), { from: user3 }); // 3 USDT

            // Wait for some time to simulate real-world scenario
            await time.increase(time.duration.minutes(30));

            // Second round of transactions
            await paymentContract.pay(restaurant1, new BN('500000'), { from: user2 }); // 0.5 USDT
            await paymentContract.pay(restaurant4, new BN('4000000'), { from: user1 }); // 4 USDT
            await paymentContract.pay(restaurant2, new BN('1500000'), { from: user3 }); // 1.5 USDT

            // Get final custom ratios
            const finalRatios = await Promise.all([
                paymentContract._calculateCustomRatio(restaurant1),
                paymentContract._calculateCustomRatio(restaurant2),
                paymentContract._calculateCustomRatio(restaurant3),
                paymentContract._calculateCustomRatio(restaurant4)
            ]);

            // Get final balances
            const finalBalances = await Promise.all([
                mockUSDT.balanceOf(restaurant1),
                mockUSDT.balanceOf(restaurant2),
                mockUSDT.balanceOf(restaurant3),
                mockUSDT.balanceOf(restaurant4)
            ]);

            // Get sorted restaurants
            const sortedRestaurants = await paymentContract.getRestaurantsByRatio();
            
            // Log the results
            console.log("\nTransaction Results:");
            console.log("Restaurant 1 (Chinese):");
            console.log(" - Final Ratio:", finalRatios[0].toString());
            console.log(" - Total Received:", finalBalances[0].sub(initialBalances[0]).toString());
            
            console.log("\nRestaurant 2 (Italian):");
            console.log(" - Final Ratio:", finalRatios[1].toString());
            console.log(" - Total Received:", finalBalances[1].sub(initialBalances[1]).toString());
            
            console.log("\nRestaurant 3 (Japanese):");
            console.log(" - Final Ratio:", finalRatios[2].toString());
            console.log(" - Total Received:", finalBalances[2].sub(initialBalances[2]).toString());
            
            console.log("\nRestaurant 4 (Thai):");
            console.log(" - Final Ratio:", finalRatios[3].toString());
            console.log(" - Total Received:", finalBalances[3].sub(initialBalances[3]).toString());
            
            console.log("\nSorted Restaurants by Ratio:");
            sortedRestaurants.forEach((restaurant, index) => {
                console.log(`${index + 1}. ${restaurant}`);
            });

            // Verify that all restaurants received payments
            for (let i = 0; i < 4; i++) {
                expect(finalBalances[i]).to.be.bignumber.gt(initialBalances[i]);
            }

            // Verify that ratios are different from base ratio due to transaction volumes
            for (let i = 0; i < 4; i++) {
                expect(finalRatios[i]).to.be.bignumber.lt(BASE_RATIO);
                expect(finalRatios[i]).to.be.bignumber.gte(MIN_RATIO);
            }
        });

    });
});
