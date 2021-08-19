// SPDX-License-Identifier: MIT

pragma solidity 0.8.7;

import { ViewCountOracle } from "./ViewCountOracle.sol";

/// Monetizer using the YouTube oracle
/// @author Shronk
contract Monetizer {
  // prettier-ignore
  struct Video {
    bool            notEmpty;
    string          id;
    address         payer;
    address payable beneficiary;
    uint256         lockTime;
    uint256         viewCount;
    uint256         amount;
    ViewCountOracle oracle;
  }

  mapping(string => Video) internal videos;

  /// Deposit tokens into the contract
  /// @param _id          the ID of the YouTube video
  /// @param _beneficiary the address of the beneficiary
  /// @param _lockTime    the time to lock
  /// @param _viewCount   the viewcount that is required for the withdrawal
  // prettier-ignore
  function deposit(
    string calldata _id,
    address payable _beneficiary,
    uint256         _lockTime,
    uint256         _viewCount
  ) external payable {
    videos[_id] = Video(
      true,
      _id,
      msg.sender,
      _beneficiary,
      _lockTime * (1 seconds) + block.timestamp,
      _viewCount,
      msg.value,
      new ViewCountOracle(0x0C4be6AA667df48de54BA174bE7948875fdf152B, _id)
    );
  }

  /// Check whether the video exists
  modifier notEmpty(string calldata _id) {
    require(
      videos[_id].notEmpty, "The video doesn't exist"
    );
    _;
  }

  /// Check whether the timelock has already expired
  modifier timeLockExpired(string calldata _id) {
    require(
      videos[_id].lockTime <= block.timestamp,
      "The timelock has not expired yet"
    );
    _;
  }

  /// Check whether there is a pending update
  modifier notPending(string calldata _id) {
    require(videos[_id].oracle.pending(), "There is a pending request");
    _;
  }

  /// Withdraw tokens from the contract
  function withdraw(string calldata _id)
  external notEmpty(_id) timeLockExpired(_id) notPending(_id) {
    videos[_id].oracle.completeUpdate();

    // check whether the video has achieved the appropriate viewcount
    if (videos[_id].viewCount > videos[_id].oracle.lastViewCount()) {
      // send the tokens back to the payer
      (bool sent1, ) = videos[_id].payer.call{ value: videos[_id].amount }("");
      require(sent1, "Failed to send Ether to payer");
    } else {
      // if the requirements are fullfilled we can send the tokens to
      // the beneficiary
      (bool sent2, ) = videos[_id].beneficiary.call{
        value: videos[_id].amount
      }("");
      require(sent2, "Failed to send Ether to creator");
    }

    delete videos[_id];
  }

  function getOracleAddress(string calldata _id) external view notEmpty(_id)
  returns(address) {
    return address(videos[_id].oracle);
  }
}
