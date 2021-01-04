const FirToken = artifacts.require("FirToken");

module.exports = function (deployer) {
  deployer.deploy(FirToken,  web3.utils.asciiToHex('FIR'), web3.utils.asciiToHex('FirToken'), 1000);
};