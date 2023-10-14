// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

import {Router} from "@hyperlane-xyz/core/contracts/Router.sol";
import {ITokenMessenger} from "@hyperlane-xyz/core/contracts/middleware/liquidity-layer/interfaces/circle/ITokenMessenger.sol";
import {AbstractCcipReadIsm} from "@hyperlane-xyz/core/contracts/isms/ccip-read/AbstractCcipReadIsm.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ICircleMessageTransmitter} from "@hyperlane-xyz/core/contracts/middleware/liquidity-layer/interfaces/circle/ICircleMessageTransmitter.sol";
import {IMailbox} from "@hyperlane-xyz/core/contracts/interfaces/IMailbox.sol";
import {Message} from "@hyperlane-xyz/core/contracts/libs/Message.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import {ILiquidityLayerAdapterV2} from "./interfaces/ILiquidityLayerAdapterV2.sol";

/**
 * @title CctpAdapter
 * @notice An adapter that allows tokens to be transferred to registered domains with CCTP.
 * @dev This adapter acts as the sender, receiver, and ISM, so it can be used as a singleton
 *   on each chain.
 */
contract CctpAdapter is
    AbstractCcipReadIsm,
    ILiquidityLayerAdapterV2,
    Router,
    ReentrancyGuard
{
    using SafeERC20 for IERC20;
    using Message for bytes;

    /**
     * @dev Emitted on `transferRemote` when a transfer message is dispatched.
     * @param destination The identifier of the destination chain.
     * @param recipient The address of the recipient on the destination chain.
     * @param amount The amount of tokens burnt on the origin chain.
     */

    event SentTransferRemote(
        uint32 indexed destination,
        bytes32 indexed recipient,
        uint256 amount
    );

    /**
     * @dev Emitted when the amount of gas required to process a CCTP transfer is updated.
     * @param oldGasAmount The old gas amount.
     * @param newGasAmount The new gas amount.
     */
    event GasAmountSet(
        uint256 indexed oldGasAmount,
        uint256 indexed newGasAmount
    );

    /**
     * @notice Emits the nonce of the Circle message when a token is bridged.
     * @param nonce The nonce of the Circle message.
     */
    event BridgedToken(uint64 nonce);

    /**
     * @notice Emitted when the Hyperlane domain to Circle domain mapping is updated.
     * @param hyperlaneDomain The Hyperlane domain.
     * @param circleDomain The Circle domain.
     */
    event DomainAdded(uint32 indexed hyperlaneDomain, uint32 circleDomain);

    uint8 private constant CCTP_MESSAGE_OFFSET = 0;
    uint8 private constant CCTP_ATTESTATION_OFFSET = 248;

    /// @notice The TokenMessenger contract.
    ITokenMessenger public tokenMessenger;

    /// @notice The token address.
    address public token;

    /// @notice The token symbol of the token.
    string public tokenSymbol;

    /// @notice The amount of gas required to process a CCTP transfer.
    uint256 public gasAmount;

    /// @notice Hyperlane domain => Circle domain.
    /// ATM, known Circle domains are Ethereum = 0, Avalanche = 1, Optimism = 2, Arbitrum = 3.
    /// Note this could result in ambiguity between the Circle domain being
    /// Ethereum or unknown.
    mapping(uint32 => uint32) public hyperlaneDomainToCircleDomain;

    /// @notice The CCTP message transmitter contract.
    ICircleMessageTransmitter public cctpMessageTransmitter;

    /// @notice The offchain URLs for getting verification data.
    string[] public offchainUrls;

    /**
     * @param _owner The new owner.
     * @param _tokenMessenger The TokenMessenger contract.
     * @param _token The token address.
     * @param _tokenSymbol The token symbol.
     * @param _gasAmount The amount of gas required to process a CCTP transfer.
     * @param _mailbox The address of the mailbox contract.
     * @param _interchainGasPaymaster The address of the interchain gas paymaster contract.
     * @param _cctpMessageTransmitter The address of the CCTP message transmitter contract.
     * @param _offchainUrls The offchain URLs.
     */
    function initialize(
        address _owner,
        address _tokenMessenger,
        address _token,
        string calldata _tokenSymbol,
        uint256 _gasAmount,
        address _mailbox,
        address _interchainGasPaymaster,
        ICircleMessageTransmitter _cctpMessageTransmitter,
        string[] memory _offchainUrls
    ) external initializer {
        __HyperlaneConnectionClient_initialize(
            _mailbox,
            _interchainGasPaymaster,
            address(this),
            _owner
        );

        tokenMessenger = ITokenMessenger(_tokenMessenger);
        token = _token;
        tokenSymbol = _tokenSymbol;
        gasAmount = _gasAmount;
        cctpMessageTransmitter = _cctpMessageTransmitter;
        offchainUrls = _offchainUrls;
    }

    /**
     * @notice Transfers `_amount` token to `_recipientAddress` on `_destinationDomain` chain.
     * @dev Send IGP amount as msg.value since this function internally calls `dispatchWithGas`.
     * @param _destinationDomain The identifier of the destination chain.
     * @param _recipientAddress The address of the recipient on the destination chain.
     * @param _amount The amount of tokens to transfer.
     * @return messageId The identifier of the dispatched message.
     */
    function transferRemote(
        uint32 _destinationDomain,
        bytes32 _recipientAddress,
        uint256 _amount
    ) external payable override nonReentrant returns (bytes32 messageId) {
        _mustHaveRemoteRouter(_destinationDomain);
        uint32 _circleDomain = hyperlaneDomainToCircleDomain[
            _destinationDomain
        ];

        bool sent = IERC20(token).transferFrom(
            msg.sender,
            address(this),
            _amount
        );
        require(sent, "Token transfer failed");
        bool approved = IERC20(token).approve(address(tokenMessenger), _amount);
        require(approved, "Token approval failed");

        uint64 _nonce = tokenMessenger.depositForBurn(
            _amount,
            _circleDomain,
            _recipientAddress,
            token
        );

        emit BridgedToken(_nonce);

        bytes memory _message = abi.encode(
            _recipientAddress, // The "user" recipient
            _amount, // The amount of the tokens sent over the bridge
            bytes32(uint256(uint160(msg.sender))),
            _nonce,
            tokenSymbol
        );

        messageId = _dispatchWithGas(
            _destinationDomain,
            _message,
            gasAmount,
            msg.value,
            msg.sender
        );

        emit SentTransferRemote(_destinationDomain, _recipientAddress, _amount);
    }

    /**
     * @notice Handles the message.
     * @dev token transfer is handled in verify function
     */
    function _handle(
        uint32, // origin
        bytes32, // sender
        bytes calldata // message
    ) internal pure override {
        // do nothing
    }

    /**
     * @notice Adds a new mapping between a Hyperlane domain and a Circle domain.
     * @param _hyperlaneDomain The Hyperlane domain.
     * @param _circleDomain The Circle domain.
     */
    function addDomain(
        uint32 _hyperlaneDomain,
        uint32 _circleDomain
    ) external onlyOwner {
        hyperlaneDomainToCircleDomain[_hyperlaneDomain] = _circleDomain;

        emit DomainAdded(_hyperlaneDomain, _circleDomain);
    }

    /**
     * @notice Sets the gas amount required to process a CCTP transfer.
     * @param _gasAmount The new gas amount.
     */
    function setGasAmount(uint256 _gasAmount) external onlyOwner {
        uint256 oldGasAmount = gasAmount;
        gasAmount = _gasAmount;

        emit GasAmountSet(oldGasAmount, _gasAmount);
    }

    /* -------------------------------------------------------------------------- */
    /*                            ISM-related code                                */
    /* -------------------------------------------------------------------------- */
    /**
     * @notice Calls `ICircleMessageTransmitter.receiveMessage(_message, _attestation)`, which verifies the attestation
     * and sends tokens to the recipient address.
     * @param _metadata ABI encoded module metadata
     * @param _message Formatted Hyperlane message (see Message.sol).
     */
    function verify(
        bytes calldata _metadata,
        bytes calldata _message
    ) external returns (bool) {
        bytes
            memory message = _metadata[CCTP_MESSAGE_OFFSET:CCTP_ATTESTATION_OFFSET];
        bytes memory metadata = _metadata[CCTP_ATTESTATION_OFFSET:_metadata
            .length];

        return cctpMessageTransmitter.receiveMessage(message, metadata);
    }

    /**
     * @notice Sets the offchain URLs.
     */
    function setOffchainUrls(string[] memory urls) external onlyOwner {
        require(urls.length > 0, "!length");
        offchainUrls = urls;
    }

    /**
     * @notice Returns the offchain URLs.
     * @return offchainUrls The offchain URLs.
     */
    function getOffchainUrls() external view returns (string[] memory) {
        return offchainUrls;
    }

    /**
     * @notice Reverts with the offchain verification info for the corresponding message.
     * @param _message The message to be verified.
     */
    function getOffchainVerifyInfo(
        bytes calldata _message
    ) external view override {
        revert OffchainLookup(
            address(this),
            offchainUrls,
            _message,
            CctpAdapter.process.selector,
            _message
        );
    }

    /**
     * @notice Processes the message.
     * @param _metadata Metadata used by the ISM to verify `_message`. 
     * @param _message Formatted Hyperlane message (see Message.sol).
     */
    function process(
        bytes calldata _metadata,
        bytes calldata _message
    ) external {
        mailbox.process(_metadata, _message);
    }
}
