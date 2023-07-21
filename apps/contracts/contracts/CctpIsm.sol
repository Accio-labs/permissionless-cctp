// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {AbstractCcipReadIsm} from "@hyperlane-xyz/core/contracts/isms/ccip-read/AbstractCcipReadIsm.sol";
import {ICircleMessageTransmitter} from
    "@hyperlane-xyz/core/contracts/middleware/liquidity-layer/interfaces/circle/ICircleMessageTransmitter.sol";
import {IMailbox} from "@hyperlane-xyz/core/contracts/interfaces/IMailbox.sol";
import {Message} from "@hyperlane-xyz/core/contracts/libs/Message.sol";

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract CctpIsm is AbstractCcipReadIsm, OwnableUpgradeable {
    using Message for bytes;

    uint8 private constant CCTP_MESSAGE_OFFSET = 0;
    uint8 private constant CCTP_ATTESTATION_OFFSET = 248;

    ICircleMessageTransmitter public cctpMessageTransmitter;
    IMailbox public mailbox;
    string[] public offchainUrls;

    // Event for testing
    event TestCctpIsmVerify(bytes message, bytes metadata);

    function initialize(
        ICircleMessageTransmitter _cctpMessageTransmitter,
        IMailbox _mailbox,
        string[] memory _offchainUrls
    ) external initializer {
        cctpMessageTransmitter = _cctpMessageTransmitter;
        mailbox = _mailbox;
        offchainUrls = _offchainUrls;

        __Ownable_init();
    }

    /**
     * No-op, everything happens in the verify function
     */
    function handle(uint32, bytes32, bytes calldata _report) public {}

    /**
     * @notice Calls `ICircleMessageTransmitter.receiveMessage(_message, _attestation)`, which verifies the attestation
     * and sends tokens to the recipient address.
     * @param _metadata ABI encoded module metadata
     * @param _message Formatted Hyperlane message (see Message.sol).
     */
    // TODO: rename this to verify after testing
    function verifyReal(bytes calldata _metadata, bytes calldata _message) external returns (bool) {
        bytes memory message = _metadata[CCTP_MESSAGE_OFFSET:CCTP_ATTESTATION_OFFSET];
        bytes memory metadata = _metadata[CCTP_ATTESTATION_OFFSET:_metadata.length];

        return cctpMessageTransmitter.receiveMessage(message, metadata);
    }

    // TODO: remove this function after testing
    function verify(bytes calldata _metadata, bytes calldata _message) external returns (bool) {
        bytes memory message = _metadata[CCTP_MESSAGE_OFFSET:CCTP_ATTESTATION_OFFSET];
        bytes memory metadata = _metadata[CCTP_ATTESTATION_OFFSET:_metadata.length];

        // Just emit event for testing and do not call `cctpMessageTransmitter.receiveMessage`
        emit TestCctpIsmVerify(message, metadata);
        return true;
    }

    function setOffchainUrls(string[] memory urls) external onlyOwner {
        require(urls.length > 0, "!length");
        offchainUrls = urls;
    }

    function getOffchainUrls() external view returns (string[] memory) {
        return offchainUrls;
    }

    function getOffchainVerifyInfo(bytes calldata _message) external view override {
        revert OffchainLookup(address(this), offchainUrls, _message, CctpIsm.process.selector, _message);
    }

    function process(bytes calldata _metadata, bytes calldata _message) external {
        mailbox.process(_metadata, _message);
    }
}
