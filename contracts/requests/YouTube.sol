// SPDX-License-Identifier: MIT

pragma solidity 0.8.7;

import "witnet-ethereum-bridge/contracts/Request.sol";

// The bytecode of the YouTube request that will be sent to Witnet
contract YouTubeRequest is Request {
  constructor (bytes memory _query) Request(_query) {}
}
