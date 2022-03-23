const EthDAO = artifacts.require("EthDAO")

module.exports = function(deployer) {
  deployer.deploy(EthDAO)
}
