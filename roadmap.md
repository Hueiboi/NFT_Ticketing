# Roadmap & Đặc tả Kỹ thuật: Hệ thống Vé điện tử NFT (Hybrid On-chain / Off-chain)

> **Vai trò tài liệu:** Đây là **Single Source of Truth**: Mọi chỉnh sửa Smart Contract và Frontend phải tuân thủ đúng kiến trúc, hợp đồng dữ liệu (payload) và 5 bước luồng demo dưới đây.
> **Lưu ý về Repo gốc:** Codebase khởi đầu từ boilerplate `mgysel/nft-ticketing` (Hardhat + Solidity + React + Chakra UI + Ethers v5). Chúng ta **CHỈ kế thừa** cấu trúc Factory (`EventCreator` → `Event` ERC-721) và mẫu kết nối ví/contract, **lược bỏ** các tính năng không phục vụ mục tiêu chính (Secondary Market / Resale / Royalty).

---

## 1. Tinh thần & Kiến trúc cốt lõi (Hybrid On-chain / Off-chain)

* **Mục tiêu:** Xây dựng hệ thống Vé điện tử NFT **chống làm giả** (xác thực chữ ký chủ sở hữu NFT) và **chống dùng lại vé** (khóa trạng thái on-chain), ưu tiên sự rõ ràng về kiến trúc Blockchain, luồng giao dịch minh bạch và giao diện tối giản.
* **Tầng On-chain (`contracts/Event.sol` - Solidity):**
  * Chỉ lưu những dữ liệu cần tính **bất biến** và **minh bạch**:
    1. Quyền sở hữu NFT vé (`ERC-721` `ownerOf(tokenId)`).
    2. Giá vé (`price`) và số lượng vé (`numTickets`, `numTicketsLeft`).
    3. Trạng thái sử dụng vé (`mapping(uint256 => bool) public isUsed`).
  * Lược bỏ khỏi luồng UI chính: Chợ bán lại (`SecondaryMarketTickets.js`), logic `resalePrice` / `royaltyPercent` không cần thiết.
* **Tầng Off-chain (`frontend/` - React + Ethers.js v5):**
  * Xử lý toàn bộ trải nghiệm người dùng (UX), điều hướng tab, giỏ/vé chờ thanh toán.
  * Tạo **Dynamic QR Code** bằng `signer.signMessage(...)` kèm `timestamp` (hạn 30 giây).
  * Xác thực chữ ký bằng `ethers.utils.verifyMessage(...)` và kiểm tra hạn 30s ở phía client soát vé trước khi gửi giao dịch on-chain.

---

## 2. Luồng Demo Chuẩn: 5 Bước Behavior Bắt Buộc

Mọi luồng UI và Smart Contract phải đảm bảo chạy thông suốt đúng 5 bước sau:

1. **Bước 1 — Kết nối ví khi Mua vé (`BuyTickets`):**
   * User xem danh sách sự kiện đang mở bán (`stage == Active`) ngay cả khi chưa kết nối ví.
   * User bấm **"Mua vé"** → Nếu chưa nối ví, bật pop-up MetaMask (`eth_requestAccounts`) để kết nối ví (địa chỉ ví là định danh user).
2. **Bước 2 — Xác nhận thanh toán & Mint NFT (`MyTickets`):**
   * Sau khi nối ví, vé vừa chọn được đưa vào tab **"Vé của tôi"** (`MyTickets`) ở trạng thái chờ thanh toán (`pendingPurchase`).
   * User bấm **"Confirm thanh toán"** → MetaMask bật xác nhận giao dịch → Frontend gọi `eventContract.buyTicket({ value: event.price })` để Mint NFT vé (`_safeMint`) vào ví user.
3. **Bước 3 — Sinh Dynamic QR (`MyTickets`):**
   * Tại **"Vé của tôi"**, user thấy các `tokenId` đang sở hữu (kèm trạng thái `Valid` / `Used`).
   * User bấm **"Lấy mã QR"** → Gọi `signer.signMessage(message)` → Hiển thị **Dynamic QR** chứa payload JSON (`contractAddress`, `tokenId`, `timestamp`, `signature`).
   * Hiển thị bộ đếm ngược **30 giây** hết hạn, kèm nút **"Làm mới mã QR"** (tạo `timestamp` mới và ký lại) và **"Copy chuỗi QR"** (phục vụ test/demo khi không có cam).
4. **Bước 4 — Soát vé bằng Camera & Ghi nhận On-chain (`EntryGate`):**
   * Nhân viên soát vé mở tab **Soát vé (`EntryGate`)**, bật **Camera laptop** (`html5-qrcode`) hoặc dùng ô **dán chuỗi QR dự phòng**.
   * Khi nhận được payload QR, hệ thống thực hiện kiểm tra theo thứ tự:
     1. **Kiểm tra thời hạn:** `Date.now() - timestamp <= 30000` (30 giây).
     2. **Giải mã chữ ký:** `ethers.utils.verifyMessage(message, signature)` ra `signerAddress`.
     3. **Đối chiếu On-chain:** `signerAddress.toLowerCase() === (await eventContract.ownerOf(tokenId)).toLowerCase()` và `await eventContract.isUsed(tokenId) === false`.
   * Nếu tất cả hợp lệ → Gọi hàm `eventContract.useTicket(tokenId)` trên Smart Contract để đổi `isUsed[tokenId] = true` (**KHÔNG** gọi `_burn(tokenId)` để giữ NFT trong ví user).
5. **Bước 5 — Pop-up Thành công kèm Transaction Hash:**
   * Sau khi `await tx.wait()` hoàn tất (cả ở Bước 2 Mint vé và Bước 4 Soát vé), hiển thị **Pop-up (Modal)** thông báo thành công kèm **Transaction Hash (`tx.hash`)**.

---

## 3. Đặc tả Kỹ thuật & Quy ước Giao diện Dữ liệu

### 3.1. Smart Contract (`contracts/Event.sol`)
* **Giữ nguyên mô hình Factory:** `EventCreator.createEvent(...)` deploy `Event` mới và `EventCreator.getEvents()` trả về danh sách địa chỉ.
* **Các thay đổi/bổ sung bắt buộc trong `contract Event`:**
  * Thêm `mapping(uint256 => bool) public isUsed;` (mặc định `false`).
  * (Khuyến nghị) Thêm `mapping(address => bool) public staff;` + `setStaff(address, bool)` để ví nhân viên soát vé có thể gọi hàm check-in ngoài ví `owner`.
  * Hàm `useTicket(uint256 ticketID) external`:
    * Yêu cầu quyền soát vé (`msg.sender == owner || staff[msg.sender]`) và `stage == Stages.CheckinOpen` (hoặc `Active`/`CheckinOpen` tùy cấu hình stage khi demo).
    * Yêu cầu `_exists(ticketID)` và `!isUsed[ticketID]`.
    * Gán `isUsed[ticketID] = true;` (không dùng `struct Ticket` nữa).
    * **Không** `_burn(ticketID)`.
    * Emit `TicketUsed(address(this), ticketID, ownerOf(ticketID), block.timestamp)`.
  * **Quy ước đơn vị tiền (ETH ↔ wei):** Contract lưu `price` theo `wei` (`uint256`). Frontend nhập giá theo ETH và convert bằng `ethers.utils.parseEther(...)`, giữ `price` dạng `BigNumber` (KHÔNG gọi `.toNumber()` để tránh overflow) và hiển thị bằng `ethers.utils.formatEther(...)`.
* **Quy trình cập nhật ABI:** Sau khi sửa `Event.sol`, bắt buộc chạy:
  ```bash
  npx hardhat compile
  npx hardhat run scripts/deploy.js --network localhost
  ```
  để `scripts/deploy.js` tự động cập nhật `frontend/src/contracts/contract-address.json`, `EventCreator.json` và `Event.json`.

### 3.2. Chuẩn Payload Dynamic QR (Contract giữa Bước 3 & Bước 4)
Cả bên tạo QR (`MyTickets`) và bên quét QR (`EntryGate`) **bắt buộc** dùng chung định dạng message và JSON dưới đây:

* **Chuỗi thông điệp dùng để ký (`signMessage` / `verifyMessage`):**
  ```text
  ${contractAddress}:${tokenId}:${timestamp}
  ```
  *(Ví dụ: `0x5FbDB2315678afecb367f032d93F642f64180aa3:0:1763519999000`)*
* **Nội dung JSON mã hóa thành QR Code:**
  ```json
  {
    "contractAddress": "0x...",
    "tokenId": 0,
    "timestamp": 1763519999000,
    "signature": "0x..."
  }
  ```

### 3.3. Cấu trúc Frontend (`frontend/src/`)
* **Tech stack hiện có:** React 18, Chakra UI (`@chakra-ui/react` ^2.8.1), `ethers` ^5.4.7 (lưu ý dùng cú pháp **Ethers v5**: `ethers.providers.Web3Provider`, `ethers.utils.verifyMessage`).
* **Thư viện cần cài thêm trong `frontend/`:** `qrcode.react` (render QR) và `html5-qrcode` (quét QR bằng webcam).
* **Phân chia file & trách nhiệm:**
  * `components/Dapp.js`: Quản lý kết nối MetaMask, read-only provider (`http://127.0.0.1:8545`) khi chưa nối ví, điều hướng `Tabs`, state `pendingPurchase`, state `txSuccessModal` (`{ title, txHash }`). Fix `_getEventsData()` để lọc đúng `ownerOf(j) === selectedAddress` và đọc `isUsed(j)`.
  * `components/tabs/BuyTickets.js`: Hiển thị sự kiện (`name`, `symbol`, `price`, `numTicketsLeft`, `stage`), nút **"Mua vé"** kích hoạt nối ví (Bước 1) rồi đẩy vào `pendingPurchase` và chuyển sang tab `MyTickets`.
  * `components/tabs/MyTickets.js`: Hiển thị khu vực **"Chờ thanh toán"** (nút **"Confirm thanh toán"** gọi `buyTicket({ value: price })` - Bước 2) và danh sách vé đã sở hữu kèm nút **"Lấy mã QR"** (Bước 3).
  * `components/tabs/EntryGate.js`: Bỏ điều kiện lọc `myTicketsNum > 0` để ví nhân viên soát vé dùng được; tích hợp Webcam QR Scanner + ô dán chuỗi QR dự phòng; verify `timestamp` (30s) + `verifyMessage` + `ownerOf` + `isUsed`, sau đó gọi `useTicket(tokenId)` (Bước 4) và kích hoạt Pop-up thành công (Bước 5).
  * Ẩn hoặc lược bỏ tab `SecondaryMarketTickets` khỏi giao diện chính để giữ UI tối giản.

---

## 4. Chi tiết Hành vi theo từng Màn hình (Screen-by-Screen Behavior Flow)

### Màn hình 0: Trạng thái khởi động & Navbar (Global)
- **Mặc định khi vào trang:** Mở thẳng **Tab 1 (`Khám phá sự kiện`)**, dùng `JsonRpcProvider("http://127.0.0.1:8545")` để đọc dữ liệu nên **không chặn** người dùng bằng màn hình Connect Wallet.
- **Nút `Connect Wallet` (góc phải Navbar):**
  - *Chưa nối ví:* Bấm vào sẽ yêu cầu MetaMask kết nối và tự động chuyển sang mạng `Hardhat Local` (`0x7a69` / `31337`).
  - *Đã nối ví:* Hiển thị badge địa chỉ rút gọn (`0x123...abc`) + số dư `ETH`. Nếu user đổi tài khoản trên MetaMask (`accountsChanged`), giao diện tự động cập nhật lại danh sách vé và quyền hạn ngay lập tức.

---

### Màn hình 1: Khám phá sự kiện (`BuyTickets` — Tab mặc định)
- **Hiển thị:** Lưới các Event Card (phong cách OpenSea Dark) lọc các sự kiện đang mở bán (`stage == Active`), hiển thị Tên sự kiện, Ký hiệu, Giá (`ETH`) và Số vé còn lại (`numTicketsLeft`).
- **Hành vi Hover & Click (Behavior Bước 1):**
  1. User di chuột (hover) vào một Event Card $\rightarrow$ Card nổi nhẹ lên, viền sáng `#83c3ff`, thanh nút hành động trượt từ đáy card lên.
  2. User bấm vào nút hành động trên Card:
     - *Trường hợp A (Chưa nối ví):* Bật pop-up MetaMask yêu cầu kết nối ví. Sau khi nối ví thành công, hệ thống tự động lưu sự kiện đó vào biến tạm `pendingPurchase` và chuyển sang **Tab 2 (`Vé của tôi`)**.
     - *Trường hợp B (Đã nối ví):* Lưu ngay sự kiện vào `pendingPurchase` và tự động chuyển sang **Tab 2 (`Vé của tôi`)**.

---

### Màn hình 2: Vé của tôi (`MyTickets`)
Chia làm 2 khu vực rõ ràng từ trên xuống dưới:

- **Khu vực A — Vé chờ thanh toán (Behavior Bước 2):**
  - Chỉ hiển thị khi có dữ liệu trong `pendingPurchase`.
  - Hiện thẻ tóm tắt sự kiện vừa chọn kèm nút **`Confirm thanh toán`**.
  - *Hành vi:* Bấm `Confirm thanh toán` $\rightarrow$ Gọi `eventContract.buyTicket({ value: price })` $\rightarrow$ MetaMask bật xác nhận $\rightarrow$ Chờ `tx.wait()` $\rightarrow$ Xóa `pendingPurchase`, bật **Pop-up Thành công (`TxHash`)** (Bước 5), và tự động tải lại danh sách vé bên dưới.

- **Khu vực B — Danh sách Vé NFT đã sở hữu (Behavior Bước 3):**
  - Quét các `tokenId` có `ownerOf(tokenId) == selectedAddress`, hiển thị dạng **Ticket Stub** kèm badge trạng thái đọc từ `isUsed(tokenId)`:
    - `Valid` (Màu xanh `#10B981`): Hiển thị nút **`Lấy mã QR`**.
    - `Used` (Màu đỏ `#F43F5E`): Nút bị vô hiệu hóa (`Đã sử dụng`).
  - *Hành vi khi bấm `Lấy mã QR`:*
    1. Gọi `signer.signMessage("${contractAddress}:${tokenId}:${timestamp}")` để lấy chữ ký số Off-chain.
    2. Mở **Modal Dynamic QR** (mã QR nằm trên nền vuông trắng `#FFFFFF` `padding: 16px`), bắt đầu thanh đếm ngược **30 giây**.
    3. Kèm 2 nút tiện ích: **`Làm mới mã QR`** (ký lại timestamp mới khi hết 30s) và **`Copy chuỗi QR`** (copy chuỗi JSON `{ contractAddress, tokenId, timestamp, signature }` để test nhanh).

---

### Màn hình 3: Soát vé (`EntryGate` — Behavior Bước 4 & 5)
- **Đối tượng dùng:** Ví Ban tổ chức (`owner`) hoặc Nhân viên soát vé (`staff`).
- **Hiển thị:** Khung quét Camera (`html5-qrcode` có đường laser xanh chạy dọc) + Ô input **`Dán chuỗi QR dự phòng`** ngay bên dưới.
- **Hành vi khi quét được mã QR (hoặc bấm Xác nhận chuỗi QR):**
  1. **Kiểm tra Off-chain (Chống chụp màn hình/Replay):** Parse JSON QR, kiểm tra `Date.now() - timestamp <= 35000` (còn hạn 30s). Nếu quá hạn $\rightarrow$ Báo lỗi đỏ *"Mã QR đã hết hạn, vui lòng làm mới"*.
  2. **Xác thực chữ ký số:** Dùng `ethers.utils.verifyMessage(...)` khôi phục địa chỉ người ký (`recoveredAddress`).
  3. **Đối chiếu On-chain:** Gọi `eventContract.ownerOf(tokenId)` và `eventContract.isUsed(tokenId)`:
     - Nếu `recoveredAddress !== owner` $\rightarrow$ Báo lỗi *"Chữ ký không khớp chủ sở hữu vé"*.
     - Nếu `isUsed == true` $\rightarrow$ Báo lỗi *"Cảnh báo: Vé này đã được sử dụng trước đó!"*.
  4. **Ghi nhận lên Blockchain:** Nếu hợp lệ toàn bộ $\rightarrow$ Gọi `eventContract.useTicket(tokenId)` $\rightarrow$ Chờ `tx.wait()` $\rightarrow$ Bật **Pop-up Thành công kèm `TxHash`** (Bước 5).

---

### Màn hình 4: Ban tổ chức (`MyEvents` / `CreateEvent`)
- **Tạo sự kiện mới:** Form 4 trường (`Tên sự kiện`, `Ký hiệu`, `Số lượng vé`, `Giá vé ETH`) gọi `eventCreator.createEvent(...)`.
- **Quản lý sự kiện đã tạo:** Liệt kê các sự kiện do ví hiện tại làm `owner`, cung cấp 3 thao tác quản trị:
  1. **Chuyển giai đoạn (Stage):** Nút chuyển tuần tự `Prep` $\rightarrow$ `Active` (Mở bán) $\rightarrow$ `CheckinOpen` (Mở cổng soát vé) $\rightarrow$ `Closed`.
  2. **Cấp quyền nhân viên:** Nhập địa chỉ ví nhân viên và gọi `setStaff(address, true)`.
  3. **Rút doanh thu:** Hiển thị số dư ETH đang khóa trong contract sự kiện và nút **`Rút doanh thu`** gọi `withdrawRevenue()`.

---

## 5. Checklist Chạy & Kiểm thử Local

1. Terminal 1 — Chạy node Blockchain local:
   ```bash
   npx hardhat node
   ```
2. Terminal 2 — Deploy contract lên localhost:
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```
3. Terminal 3 — Chạy Frontend:
   ```bash
   cd frontend
   npm start
   ```
4. Cấu hình MetaMask mạng `Localhost 8545` (`Chain ID: 31337`), import 2 tài khoản test từ Hardhat Node:
   * **Ví 1 (Organizer / Staff):** Tạo sự kiện (`CreateEvent`), chuyển stage sang `Active` (`1`) để bán vé, và chuyển sang `CheckinOpen` (`2`) để soát vé (`EntryGate`).
   * **Ví 2 (User):** Thực hiện trọn vẹn Bước 1 → Bước 2 → Bước 3, sau đó chuyển sang Ví 1 để quét ở Bước 4 và nhận Pop-up Transaction Hash ở Bước 5.
