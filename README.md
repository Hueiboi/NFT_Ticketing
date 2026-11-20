# NFTix — Hệ thống Vé điện tử NFT (Hybrid On-chain / Off-chain)

Hệ thống bán vé và soát vé sự kiện bằng NFT chuẩn **ERC-721** chống làm giả và chống dùng lại vé, xây dựng trên nền tảng **Hardhat + Solidity (`0.8.17`)** và **React + Chakra UI + Ethers.js v5**.

## Tài liệu chuẩn của nhóm
- [roadmap.md](./roadmap.md) — Đặc tả kiến trúc Hybrid, 5 bước Behavior chuẩn và quy ước Payload QR.
- [design.md](./design.md) — Đặc tả giao diện *Minimalist Digital Ticket Pass* (Light Mode, Ticket Stub UI, Micro-animations).

## Cấu trúc chính
- `contracts/Event.sol`: Factory `EventCreator` và contract `Event` (ERC-721) tối giản (`buyTicket`, `useTicket` với `isUsed`, `setStaff`, `setStage`, `withdrawRevenue`).
- `scripts/deploy.js`: Deploy `EventCreator` và tự động xuất ABI + địa chỉ contract sang `frontend/src/contracts/`.
- `test/Event.js`: Bộ Unit Test Hardhat cho toàn bộ luồng Factory, Mint vé, Soát vé và Rút doanh thu.
- `frontend/`: Giao diện Web3 React kết nối MetaMask.

## Hướng dẫn chạy Local
1. Cài đặt dependencies:
   ```sh
   npm install
   cd frontend && npm install
   ```
2. Chạy Unit Test Smart Contract:
   ```sh
   npx hardhat test
   ```
3. Khởi chạy node Blockchain local (Terminal 1):
   ```sh
   npx hardhat node
   ```
4. Deploy contract lên localhost (Terminal 2):
   ```sh
   npx hardhat run scripts/deploy.js --network localhost
   ```
5. Chạy Frontend (Terminal 3):
   ```sh
   cd frontend
   npm start
   ```
6. Cấu hình MetaMask kết nối mạng **Localhost 8545** (`Chain ID: 31337`). Nếu gặp lỗi `Nonce too high` sau khi restart `npx hardhat node`, vào **MetaMask → Settings → Advanced → Clear activity tab data**.

## Dynamic QR

1. Ví người mua mở **My Tickets → Lấy mã QR** và xác nhận chữ ký trên MetaMask (không tốn gas).
2. QR chứa `{ contractAddress, tokenId, timestamp, signature }`, ký đúng chuỗi `${contractAddress}:${tokenId}:${timestamp}`. Hiệu lực 30 giây tính từ lúc tạo yêu cầu ký; nếu ký quá lâu, hãy tạo lại mã. Có đếm ngược, thanh thời gian, **Làm mới mã QR** và **Copy chuỗi QR**.
3. Chuyển sự kiện sang **CheckinOpen**. Ví ban tổ chức hoặc nhân viên được cấp quyền mở **Entry Gate**, chọn sự kiện rồi bật camera hoặc dán chuỗi QR. Camera dùng HTTPS hoặc localhost và cần được cấp quyền trong trình duyệt.
4. Gate kiểm tra thời hạn, chữ ký, chủ sở hữu NFT hiện tại, trạng thái chưa dùng và quyền nhân viên trước khi yêu cầu giao dịch `useTicket`. Sau khi giao dịch được xác nhận, hiển thị thông báo thành công và transaction hash. NFT vẫn ở trong ví.

Khi demo trên cùng máy, có thể sao chép QR rồi chuyển sang ví nhân viên và dán trong 30 giây. Làm mới QR là thao tác thủ công vì mỗi mã cần một chữ ký mới. Đồng hồ hai thiết bị cần đồng bộ. Mã cũ còn hiệu lực đến hết thời hạn của chính nó; sau khi check-in, trạng thái `isUsed` chặn dùng lại.

Theo kiến trúc Hybrid hiện tại, chữ ký và thời hạn QR được kiểm tra ở frontend tại thời điểm soát vé, còn smart contract kiểm tra quyền nhân viên và khóa vé đã dùng. Thời gian chờ xác nhận MetaMask hoặc mining không kéo dài thời hạn hiển thị QR; contract không tự xác thực payload QR.

Kiểm thử frontend: chạy `npm test -- --watchAll=false --runInBand` trong `frontend/`. Build: `npm run build`.
