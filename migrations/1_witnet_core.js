// WARNING: DO NOT DELETE THIS FILE
// This file was auto-generated by the Witnet compiler, any manual changes will be overwritten.

const Witnet = artifacts.require("Witnet")
const WitnetParserLib = artifacts.require("WitnetParserLib")
const WitnetProxy = artifacts.require("WitnetProxy")

const addresses = {
  "ethereum.goerli": {
    "WitnetParserLib": "0x46cF0c52f7B2e76F1E95fe163B98F92413f1d5A4",
    "WitnetRequestBoard": "0xb58D05247d16b3F1BD6B59c52f7f61fFef02BeC8",
  },
  "ethereum.kovan": {
    "WitnetParserLib": "",
    "WitnetRequestBoard": "",
  },
  "ethereum.rinkeby": {
    "WitnetParserLib": "0x14b5cAC222d55Cb11CC9fE5Fbf6793177B3048F6",
    "WitnetRequestBoard": "0x6cE42a35C61ccfb42907EEE57eDF14Bb69C7fEF4",
  },
  "ethereum.mainnet": {
    "WitnetParserLib": "",
    "WitnetRequestBoard": "",
  },
  "conflux.testnet": {
    "WitnetParserLib": "0x824ae04f47C6a8C08CbfE140fbd273Eb2E275795",
    "WitnetRequestBoard": "0x8aB653B73a0e0552dDdce8c76F97c6AA826EFbD4",
  },
  "conflux.tethys": {
    "WitnetParserLib": "",
    "WitnetRequestBoard": "",
  },
  "boba.rinkeby": {
    "WitnetParserLib": "0xdF4Df677F645Fe603a883Ad3f2Db03EDFDd75F5C",
    "WitnetRequestBoard": "0xA2F4f5290F9cfD3a17Cfa82f2a2fD3E5c05d1442",
  },
  "boba.mainnet": {
    "WitnetParserLib": "",
    "WitnetRequestBoard": "",
  },
}

const artifactNames = {
  "WitnetDecoderLib": "WitnetDecoderLib",
  "WitnetParserLib": "WitnetParserLib",
  "WitnetProxy": "WitnetProxy",
  "WitnetRequestBoard": "WitnetRequestBoardTrustableDefault",
}

module.exports = async function (deployer, network, accounts) {
  network = network.split("-")[0]
  if (network in addresses) {
    WitnetParserLib.address = addresses[network]["WitnetParserLib"]
    WitnetProxy.address = addresses[network]["WitnetRequestBoard"]
  } else {
    // If we are using an unsupported network, try to deploy a mocked Witnet environment
    // This is specially convenient for testing on local networks (e.g. ganache)
    console.warn(`Network "${network}" is not officially supported by Witnet. A mock Witnet environment will be used.`)
    const WitnetDecoderLib = artifacts.require(artifactNames["WitnetDecoderLib"])
    const WitnetParserLib = artifacts.require(artifactNames["WitnetParserLib"])
    const WitnetRequestBoard = artifacts.require(artifactNames["WitnetRequestBoard"])
    const WitnetProxy = artifacts.require(artifactNames["WitnetProxy"])
    let upgradeProxy = false
    if (!WitnetDecoderLib.isDeployed()) {
      await deployer.deploy(WitnetDecoderLib)
      await deployer.link(WitnetDecoderLib, [WitnetParserLib, WitnetRequestBoard])
    }
    if (!WitnetParserLib.isDeployed()) {
      await deployer.deploy(WitnetParserLib)
      await deployer.link(WitnetParserLib, [Witnet, WitnetRequestBoard])
    }
    if (!Witnet.isDeployed()) {
      await deployer.deploy(Witnet)
    }
    if (!WitnetRequestBoard.isDeployed()) {
      await deployer.deploy(WitnetRequestBoard, true, "0x302e342e322d747275737461626c65")
      upgradeProxy = true
    }
    if (!WitnetProxy.isDeployed()) {
      await deployer.deploy(WitnetProxy)
      upgradeProxy = true
    }
    if (upgradeProxy) {
      const proxy = await WitnetProxy.deployed()
      await proxy.upgradeTo(
        WitnetRequestBoard.address,
        web3.eth.abi.encodeParameter("address[]", [accounts[0]])
      )
    }
  }
}
