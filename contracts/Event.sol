// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title Factory Contract to create events
contract EventCreator {
    Event[] public events;

    event CreateEvent(address indexed creator, address indexed eventAddress);

    /**
     * @notice Create a new Event NFT ticketing contract
     * @param _numTickets Total number of tickets available
     * @param _price Price per ticket in wei
     * @param _eventName Name of the Ticket NFT collection
     * @param _eventSymbol Symbol of the Ticket NFT collection
     */
    function createEvent(
        uint256 _numTickets,
        uint256 _price,
        string memory _eventName,
        string memory _eventSymbol
    ) external returns (address newEvent) {
        Event e = new Event(
            msg.sender,
            _numTickets,
            _price,
            _eventName,
            _eventSymbol
        );
        events.push(e);

        emit CreateEvent(msg.sender, address(e));
        return address(e);
    }

    /**
     * @notice Returns all created Event contract addresses
     */
    function getEvents() external view returns (Event[] memory) {
        return events;
    }
}

/// @title Minimal Hybrid On-chain Event NFT Ticketing Contract
contract Event is ERC721 {
    enum Stages {
        Prep,
        Active,
        CheckinOpen,
        Closed
    }

    Stages public stage;

    uint256 public price;
    uint256 public numTickets;
    uint256 public numTicketsLeft;
    uint256 public totalMinted;

    address payable public owner;

    mapping(uint256 => bool) public isUsed;
    mapping(address => bool) public staff;

    event CreateTicket(
        address indexed contractAddress,
        address indexed buyer,
        uint256 indexed ticketID
    );
    event TicketUsed(
        address indexed contractAddress,
        uint256 indexed ticketID,
        address indexed ticketOwner,
        uint256 timestamp
    );
    event OwnerWithdrawMoney(address indexed owner, uint256 amount);
    event StaffUpdated(address indexed staff, bool status);
    event StageChanged(Stages newStage);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyOwnerOrStaff() {
        require(msg.sender == owner || staff[msg.sender], "Not authorized");
        _;
    }

    modifier requiredStage(Stages _stage) {
        require(stage == _stage, "Invalid event stage");
        _;
    }

    constructor(
        address _owner,
        uint256 _numTickets,
        uint256 _price,
        string memory _eventName,
        string memory _eventSymbol
    ) ERC721(_eventName, _eventSymbol) {
        require(_owner != address(0), "Invalid owner");
        require(_numTickets > 0, "Number of tickets must be > 0");

        owner = payable(_owner);
        numTickets = _numTickets;
        numTicketsLeft = _numTickets;
        price = _price;
        stage = Stages.Prep;
    }

    /**
     * @notice Purchase and mint one ticket NFT to msg.sender
     */
    function buyTicket() external payable requiredStage(Stages.Active) {
        require(numTicketsLeft > 0, "Sold out");
        require(msg.value == price, "Incorrect payment amount");

        uint256 ticketID = totalMinted;
        totalMinted++;
        numTicketsLeft--;

        _safeMint(msg.sender, ticketID);
        emit CreateTicket(address(this), msg.sender, ticketID);
    }

    /**
     * @notice Mark a ticket as used during check-in without burning the NFT
     * @param ticketID Token ID of the ticket NFT
     */
    function useTicket(
        uint256 ticketID
    ) external onlyOwnerOrStaff requiredStage(Stages.CheckinOpen) {
        require(_exists(ticketID), "Ticket does not exist");
        require(!isUsed[ticketID], "Ticket already used");

        isUsed[ticketID] = true;
        emit TicketUsed(address(this), ticketID, ownerOf(ticketID), block.timestamp);
    }

    /**
     * @notice Update the current lifecycle stage of the event
     */
    function setStage(Stages _stage) external onlyOwner {
        stage = _stage;
        emit StageChanged(_stage);
    }

    /**
     * @notice Authorize or revoke check-in staff wallet addresses
     */
    function setStaff(address _staff, bool _status) external onlyOwner {
        require(_staff != address(0), "Invalid staff address");
        staff[_staff] = _status;
        emit StaffUpdated(_staff, _status);
    }

    /**
     * @notice Withdraw collected ticket sales revenue to the event organizer
     */
    function withdrawRevenue() external onlyOwner {
        uint256 amount = address(this).balance;
        require(amount > 0, "No revenue to withdraw");

        (bool sent, ) = owner.call{value: amount}("");
        require(sent, "Withdraw failed");
        emit OwnerWithdrawMoney(owner, amount);
    }
}
