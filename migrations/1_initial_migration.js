const Migrations = artifacts.require("Migrations");

module.exports = async function(deployer) {
  try {
    await deployer.deploy(Migrations);
  } catch (error) {
    console.error("Error deploying Migrations:", error);
    throw error;
  }
}; 