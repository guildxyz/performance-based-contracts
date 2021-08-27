// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

import "witnet-ethereum-bridge/contracts/requests/WitnetRequest.sol";

// The bytecode of the YouTube request that will be sent to Witnet
contract YouTubeRequest is WitnetRequest {
  constructor () WitnetRequest(hex"0a7a08f983a38906124c123a68747470733a2f2f6170692d6d6964646c6577617265732e76657263656c2e6170702f6170692f796f75747562652f5f5f5f5f5f5f5f5f5f5f5f1a0e83187782186765766965777318731a110a0d08051209fb3ff199999999999a100322110a0d08051209fb3ff199999999999a100310c0843d186420e80728333080c8afa025") { }
}
