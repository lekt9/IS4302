const MockUSDT = artifacts.require("MockUSDT");
const PaymentContract = artifacts.require("PaymentContract");

module.exports = async function(deployer, network, accounts) {
    // Deploy MockUSDT first
    await deployer.deploy(MockUSDT);
    const mockUSDT = await MockUSDT.deployed();

    // Constants for PaymentContract deployment
    const BASE_RATIO = web3.utils.toWei('1', 'ether');    // 1.0
    const DECAY_FACTOR = web3.utils.toWei('0.5', 'ether'); // 0.5
    const MIN_RATIO = web3.utils.toWei('0.9', 'ether');    // 0.9
    const TIME_WINDOW = 3600; // 1 hour in seconds

    // Deploy PaymentContract with MockUSDT address
    await deployer.deploy(
        PaymentContract,
        mockUSDT.address,
        BASE_RATIO,
        DECAY_FACTOR,
        MIN_RATIO,
        TIME_WINDOW
    );
}; 