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
