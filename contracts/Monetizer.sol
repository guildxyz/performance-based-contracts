// SPDX-License-Identifier: MIT

pragma solidity 0.8.7;

// Import the UsingWitnet library that enables interacting with Witnet
import "witnet-ethereum-bridge/contracts/UsingWitnet.sol";
// Import the WitnetRequest contract that enables creating requests on the spot
import "witnet-ethereum-bridge/contracts/requests/WitnetRequest.sol";

/// @title YouTube monetizer using Witnet oracles
/// @author Shronk, aesedepece
contract Monetizer is UsingWitnet {
  // prettier-ignore
  struct Video {
    bool            notEmpty;
    string          id;
    address         depositor;
    address payable beneficiary;
    uint256         lockTime;
    uint256         targetViewCount;
    uint256         amount;
    uint256         witnetQueryId;
  }

  /// Map an agreement to an ID
  mapping(string => Video) internal videos;

  /// Emits when someone is paid out
  event Paid(string id);

  /// Emits when found an error decoding request result
  event ResultError(string msg);

  error AgreementIsEmpty();
  error AgreementIsNotEmpty();
  error TimeLockHasNotExpiredYet(uint256 expectedMinimum, uint256 current);
  error ViewCountNotCheckedYet();
  error ViewCountAlreadyChecked();
  error PendingRequest();
  error TransferFailed(address addr);

  /// Check whether the video exists
  modifier notEmpty(string calldata _id) {
    if (!videos[_id].notEmpty) revert AgreementIsEmpty();
    _;
  }

  /// Check whether the beneficiary timelock has already expired
  modifier timelockExpired(string calldata _id) {
    if (videos[_id].lockTime > block.timestamp)
      revert TimeLockHasNotExpiredYet(videos[_id].lockTime, block.timestamp);
    _;
  }

  constructor(WitnetRequestBoard _wrb) UsingWitnet(_wrb) {}

  /// @notice Deposit tokens into the contract
  /// @param _id              the ID of the YouTube video
  /// @param _beneficiary     the address of the beneficiary
  /// @param _lockTime        the time to lock
  /// @param _targetViewCount the viewcount that is required for the withdrawal
  // prettier-ignore
  function deposit(
    string calldata _id,
    address payable _beneficiary,
    uint256         _lockTime,
    uint256         _targetViewCount
  ) external payable {
    // Check whether the agreement is empty or not
    if (videos[_id].notEmpty) revert AgreementIsNotEmpty();

    videos[_id] = Video(
      true,
      _id,
      msg.sender,
      _beneficiary,
      _lockTime * (1 seconds) + block.timestamp,
      _targetViewCount,
      msg.value,
      0
    );
  }

  /// @notice Send a data request to Witnet so as to get an attestation of the
  /// current viewcount of a video
  function checkViews(string calldata _id)
    external
    payable
    notEmpty(_id)
    timelockExpired(_id)
  {
    // Check whether the viewcount has been checked
    if (videos[_id].witnetQueryId > 0) revert ViewCountAlreadyChecked();

    WitnetRequest request = new WitnetRequest(
      bytes(
        abi.encodePacked(
          hex"0a7a08cc9d9f8906124c123a68747470733a2f2f6170692d6d6964646c6577617265732e76657263656c2e6170702f6170692f796f75747562652f",
          _id,
          hex"1a0e83187782186765766965777318731a110a0d08051209fb3ff199999999999a100322110a0d08051209fb3ff199999999999a100310c0843d186420e80728333080c8afa025"
        )
      )
    );

    // Keep track of the Witnet query ID
    videos[_id].witnetQueryId = _witnetPostRequest(request);
  }

  /// @notice Withdraw tokens from the contract
  function withdraw(string calldata _id)
    external
    notEmpty(_id)
    timelockExpired(_id)
  {
    // Check whether the viewcount has not been checked yet
    if (videos[_id].witnetQueryId == 0) revert ViewCountNotCheckedYet();

    if (!_witnetCheckResultAvailability(videos[_id].witnetQueryId))
      revert PendingRequest();

    Witnet.Result memory result = _witnetReadResult(videos[_id].witnetQueryId);

    if (witnet.isOk(result)) {
      // We got a valid view count!
      uint64 viewCount = witnet.asUint64(result);
      Video memory video = videos[_id];

      // check whether the video has reached the target view count
      if (viewCount >= video.targetViewCount) {
        // if the target view count was reached, we can send the tokens to the
        // beneficiary
        (bool sent, ) = video.beneficiary.call{value: video.amount}("");
        if (!sent) revert TransferFailed(video.beneficiary);
      } else {
        // send the tokens back to the payer
        (bool sent, ) = video.depositor.call{value: video.amount}("");
        if (!sent) revert TransferFailed(video.depositor);
      }

      emit Paid(_id);
      delete videos[_id];
    } else {
      string memory errorMessage;

      // Try to read the value as an error message, catch error bytes if read
      // fails
      try witnet.asErrorMessage(result) returns (
        Witnet.ErrorCodes,
        string memory e
      ) {
        errorMessage = e;
      } catch (bytes memory errorBytes) {
        errorMessage = string(errorBytes);
      }

      // The Witnet query failed. Set query ID to 0 so it can be retried using
      // `checkViews()` again
      videos[_id].witnetQueryId = 0;

      emit ResultError(errorMessage);
    }
  }
}
