// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
// OpenZeppelin Contracts là thư viện chuẩn, được audit, giúp tiết kiệm thời gian và giảm rủi ro bảo mật
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

// Triển khai Factory Pattern
// Thay vì dồn vé vào 1 Event, contract sẽ sinh mỗi Event độc lập có địa chỉ, quỹ riêng.
/// @title Factory Contract to create events
contract EventCreator {
    // Biến storage để lưu trữ address các Event contract được tạo ra
    Event[] public events;

    // Event Log để Ethers.js lắng nghe khi có Event mới được tạo ra
    event CreateEvent(address indexed creator, address indexed eventAddress);
    /**
     * @notice Create a new Event NFT ticketing contract
     * @param _numTickets Total number of tickets available
     * @param _price Price per ticket in wei
     * @param _eventName Name of the Ticket NFT collection
     * @param _eventSymbol Symbol of the Ticket NFT collection
     */
    // Hàm tạo Event, ghi dữ liệu và tốn gas, tiêu ETH mỗi lần.
    // Các kiểu dữ liệu có kích thước động như string hoặc mảng bắt buộc phải khai báo nơi lưu trữ "memory" -> lưu tạm trên RAM để tiết kiệm gas 
    function createEvent(
        uint256 _numTickets,
        uint256 _price,
        string memory _eventName,
        string memory _eventSymbol
    ) external returns (address newEvent) { // external: chỉ có thể gọi từ bên ngoài contract, không thể gọi từ bên trong contract -> tối ưu gas
        // Tạo một Event mới, truyền vào các tham số cần thiết
        Event e = new Event(
            msg.sender,
            _numTickets,
            _price,
            _eventName,
            _eventSymbol
        );
        // Lưu địa chỉ Event mới vào mảng sau đó phát ra = emit để front-end có thể lắng nghe
        events.push(e);
        emit CreateEvent(msg.sender, address(e));
        return address(e);
    }

    /**
     * @notice Returns all created Event contract addresses
     */
    // Hàm lấy danh sách event, không tốn gas vì chỉ đọc dữ liệu từ storage, không thay đổi trạng thái blockchain
    function getEvents() external view returns (Event[] memory) { // view là cam kết chỉ đọc dữ liệu, không thay đổi trạng thái blockchain
        return events;
    }
}

/// @title Minimal Hybrid On-chain Event NFT Ticketing Contract
// Kế thừa ERC721 để tạo ra NFT Ticket
contract Event is ERC721 { 
    // Enum các giai đoạn của sự kiện
    enum Stages {
        Prep,
        Active,
        CheckinOpen,
        Closed
    }

    // Biến giai đoạn hiện tại của sự kiện, mặc định là Prep
    Stages public stage;

    uint256 public price;
    uint256 public numTickets;
    uint256 public numTicketsLeft;
    uint256 public totalMinted;

    address payable public owner;

    // Ánh xạ để đánh dấu vé đã được sử dụng hay chưa, tránh việc sử dụng lại vé
    mapping(uint256 => bool) public isUsed;
    // Ánh xạ đúng địa chỉ ví của nhân viên check-in để xác thực quyền sử dụng vé
    mapping(address => bool) public staff;
    
    // Các event log để front-end có thể lắng nghe và cập nhật trạng thái
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

    // Các modifier (~ middleware) để kiểm tra quyền hạn của người gọi hàm và trạng thái của sự kiện
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

    // Hàm khởi tạo contract Event, được gọi khi tạo một Event mới từ EventCreator
    // Khởi tạo các thông tin cơ bản của sự kiện như số lượng vé, giá vé, tên và ký hiệu của NFT Ticket 
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

    // 2 hàm cốt lõi của Event contract: mua vé và check-in sử dụng vé
    /**
     * @notice Purchase and mint one ticket NFT to msg.sender
     */
    // payable: cho phép hàm nhận ETH từ người gọi, msg.value sẽ chứa số lượng ETH được gửi kèm theo giao dịch
    function buyTicket() external payable requiredStage(Stages.Active) {
        require(numTicketsLeft > 0, "Sold out");
        require(msg.value == price, "Incorrect payment amount");

        // mint NFT ticket với ID là tổng số vé đã bán ra, sau đó tăng tổng số vé đã bán và giảm số vé còn lại
        uint256 ticketID = totalMinted;
        totalMinted++;
        numTicketsLeft--;

        // Gọi hàm _safeMint của ERC721 để mint NFT ticket cho người mua
        // đồng thời phát ra event CreateTicket để front-end có thể lắng nghe
        _safeMint(msg.sender, ticketID);
        emit CreateTicket(address(this), msg.sender, ticketID);
    }

    /**
     * @notice Mark a ticket as used during check-in without burning the NFT
     * @param ticketID Token ID of the ticket NFT
     */
    // Hàm check-in sử dụng vé, chỉ có chủ sở hữu sự kiện hoặc nhân viên check-in mới được phép gọi
    function useTicket(
        uint256 ticketID
    ) external onlyOwnerOrStaff requiredStage(Stages.CheckinOpen) {
        require(_exists(ticketID), "Ticket does not exist");
        require(!isUsed[ticketID], "Ticket already used");

        // Đánh dấu vé đã được sử dụng để tránh việc sử dụng lại
        // Phát ra event TicketUsed để front-end có thể lắng nghe và cập nhật trạng thái
        isUsed[ticketID] = true;
        emit TicketUsed(address(this), ticketID, ownerOf(ticketID), block.timestamp);
    }

    // 3 hàm quản lý sự kiện, doanh thu
    /**
     * @notice Update the current lifecycle stage of the event
     */
    // Chỉ người tổ chức mới có thể thay đổi stage của sự kiện
    // phát ra event StageChanged để front-end có thể lắng nghe
    function setStage(Stages _stage) external onlyOwner {
        stage = _stage;
        emit StageChanged(_stage);
    }

    /**
     * @notice Authorize or revoke check-in staff wallet addresses
     */
    // Chỉ người tổ chức mới có thể thêm hoặc xóa nhân viên check-in
    function setStaff(address _staff, bool _status) external onlyOwner {
        require(_staff != address(0), "Invalid staff address");
        staff[_staff] = _status;
        emit StaffUpdated(_staff, _status);
    }

    /**
     * @notice Withdraw collected ticket sales revenue to the event organizer
     */
    // Chỉ người tổ chức mới có thể rút doanh thu từ việc bán vé
    function withdrawRevenue() external onlyOwner {
        uint256 amount = address(this).balance;
        require(amount > 0, "No revenue to withdraw");

        (bool sent, ) = owner.call{value: amount}("");
        require(sent, "Withdraw failed");
        emit OwnerWithdrawMoney(owner, amount);
    }
}
