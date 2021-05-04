module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // for more about customizing your Truffle configuration!
  build: "webpack",
  networks: {
    development: {
      host: "blockchainvoting.ddns.net",
      port: 8545,
      network_id: "*" // Match any network id
    },
    develop: {
      port: 8545
    }
  },
  compilers: {
    solc: {
      version: "0.8.4",
    },
  }
};
