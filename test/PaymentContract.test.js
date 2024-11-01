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
        it("2.1 Owner should be able to register a restaurant", async () => {
            const result = await paymentContract.registerRestaurant(restaurant1, { from: owner });
            
            // Check if restaurant is registered
            expect(await paymentContract.registeredRestaurants(restaurant1)).to.be.true;
            
            // Check if event was emitted
            expectEvent(result, 'RestaurantRegistered', {
                restaurant: restaurant1
            });
        });

        it("2.2 Should not allow non-owner to register restaurant", async () => {
            await expectRevert(
                paymentContract.registerRestaurant(restaurant1, { from: user1 }),
                "Only owner can call this function"
            );
        });

        it("2.3 Should not allow registering zero address", async () => {
            await expectRevert(
                paymentContract.registerRestaurant('0x0000000000000000000000000000000000000000', { from: owner }),
                "Invalid restaurant address"
            );
        });

        it("2.4 Should not allow registering same restaurant twice", async () => {
            await paymentContract.registerRestaurant(restaurant1, { from: owner });
            await expectRevert(
                paymentContract.registerRestaurant(restaurant1, { from: owner }),
                "Restaurant already registered"
            );
        });
    });

    describe("3. Restaurant Removal", () => {
        beforeEach(async () => {
            await paymentContract.registerRestaurant(restaurant1, { from: owner });
        });

        it("3.1 Owner should be able to remove a restaurant", async () => {
            const result = await paymentContract.removeRestaurant(restaurant1, { from: owner });
            
            expect(await paymentContract.registeredRestaurants(restaurant1)).to.be.false;
            
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
            await paymentContract.registerRestaurant(restaurant1, { from: owner });
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

    describe("5. Volume Tracking and Ratio Calculation", () => {
        const paymentAmount = new BN('1000000'); // 1 USDT

        beforeEach(async () => {
            await paymentContract.registerRestaurant(restaurant1, { from: owner });
            // Transfer more USDT to user1
            await mockUSDT.transfer(user1, new BN('10000000'), { from: owner }); // 10 USDT
            // Approve a larger amount for multiple payments
            await mockUSDT.approve(paymentContract.address, new BN('100000000'), { from: user1 }); // 100 USDT approval
        });

        it("5.1 Should calculate correct ratio for first payment", async () => {
            const result = await paymentContract.pay(restaurant1, paymentAmount, { from: user1 });
            
            const event = result.logs.find(log => log.event === 'PaymentProcessed');
            expect(event.args.customRatio).to.be.bignumber.equal(BASE_RATIO);
            expect(event.args.adjustedAmount).to.be.bignumber.equal(paymentAmount);
        });

        it("5.2 Should decrease ratio with multiple payments", async () => {
            // Make multiple payments with sufficient balance
            for(let i = 0; i < 3; i++) {
                await paymentContract.pay(restaurant1, paymentAmount, { from: user1 });
            }

            const result = await paymentContract.pay(restaurant1, paymentAmount, { from: user1 });
            const event = result.logs.find(log => log.event === 'PaymentProcessed');
            
            // Ratio should be lower than BASE_RATIO but not below MIN_RATIO
            expect(event.args.customRatio)
                .to.be.bignumber.lt(BASE_RATIO)
                .and.to.be.bignumber.gte(MIN_RATIO);
        });
    });

    describe("6. Time Window Effects", () => {
        const paymentAmount = new BN('1000000'); // 1 USDT

        beforeEach(async () => {
            await paymentContract.registerRestaurant(restaurant1, { from: owner });
            // Transfer more USDT to user1
            await mockUSDT.transfer(user1, new BN('10000000'), { from: owner }); // 10 USDT
            // Approve for multiple payments
            await mockUSDT.approve(paymentContract.address, new BN('100000000'), { from: user1 }); // 100 USDT approval
        });

        it("6.1 Should reset ratio after time window", async () => {
            // Make initial payments
            await paymentContract.pay(restaurant1, paymentAmount, { from: user1 });
            await paymentContract.pay(restaurant1, paymentAmount, { from: user1 });

            // Advance time beyond time window
            await time.increase(TIME_WINDOW.add(new BN('1')));

            // Make new payment
            const result = await paymentContract.pay(restaurant1, paymentAmount, { from: user1 });
            const event = result.logs.find(log => log.event === 'PaymentProcessed');

            // After time window, ratio should be back to BASE_RATIO
            expect(event.args.customRatio).to.be.bignumber.equal(BASE_RATIO);
            expect(event.args.adjustedAmount).to.be.bignumber.equal(paymentAmount);
        });
    });
}); 