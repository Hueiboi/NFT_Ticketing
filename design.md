# Design System — NFTix (OpenSea Dark Aesthetic)

## 1. Tinh thần thiết kế (Visual Direction)
- **Phong cách:** Web3 Dark-mode Marketplace lấy cảm hứng từ OpenSea — nền tối sâu, thẻ nổi khối rõ ràng, điểm nhấn xanh điện tử, chuyển động mượt (`200ms - 250ms`).
- **Tập trung trải nghiệm:** Mở trang là thấy ngay lưới các **Event Card** (không bị màn hình Connect Wallet chặn cửa). Di chuột vào card nào thì nút hành động trượt lên ở card đó.

---

## 2. Design Tokens (Màu sắc, Font & Bo góc)
- **Màu nền & Bề mặt (Surfaces):**
  - Nền trang chính (`surface.base`): `#000000` (Pure Black)
  - Nền Card & Modal (`surface.raised`): `#0c0c0c` (Dark Charcoal)
  - Nền Input / Hover nhẹ (`surface.strong`): `#141414`
  - Viền thẻ (`border.subtle`): `#202020` | Viền khi hover: `#83c3ff`
- **Màu chữ (Typography Colors):**
  - Chữ chính (`text.primary`): `#ffffff`
  - Chữ phụ / Mô tả (`text.secondary`): `#acacac`
  - Điểm nhấn Web3 (`accent.primary`): `#83c3ff` (Nút bấm chính, badge, đường viền highlight)
- **Màu trạng thái (Semantic Status):**
  - Hợp lệ / Thành công (`status.success`): `#10B981` (Emerald)
  - Đã sử dụng / Hết hạn / Lỗi (`status.danger`): `#F43F5E` (Rose)
- **Font chữ:**
  - Giao diện chính: `Inter, system-ui, sans-serif` (Base: `16px`, line-height `24px`)
  - Mã kỹ thuật (`Monospace` cho Địa chỉ ví `0x...`, `Token #ID`, `TxHash`, đồng hồ `30s`): `JetBrains Mono, monospace`
- **Bo góc & Chuyển động (Radius & Motion):**
  - Card & Modal: `16px` (`radius.md`) | Nút bấm & Input: `12px` | Badge / Pill: `9999px`
  - Transition chuẩn: `all 250ms cubic-bezier(0.16, 1, 0.3, 1)`

---

## 3. Quy tắc Component cốt lõi (4 Màn hình)

### A. Navbar (Thanh điều hướng trên cùng)
- Nền `#000000` có hiệu ứng kính mờ (`backdrop-filter: blur(12px)`), viền dưới `1px solid #202020`.
- Trái: Logo `NFTix` + chấm xanh báo mạng `Localhost:8545`.
- Giữa: 4 tab tối giản (`Khám phá sự kiện` | `Vé của tôi` | `Soát vé (Gate)` | `Ban tổ chức`).
- Phải: Nút `Connect Wallet` nền `#83c3ff`, chữ đen `#000000` in đậm (khi đã nối ví biến thành badge `#141414` viền `#202020` hiển thị `0x123...abc`).

### B. Event Card — Hiệu ứng Hover chuẩn OpenSea (Tab Mua vé)
- Bố cục lưới (Grid 3 cột trên desktop), nền `#0c0c0c`, viền `1px solid #202020`, bo góc `16px`, `overflow: hidden`.
- **Trạng thái mặc định:** Hiển thị tên sự kiện (`#ffffff`), ký hiệu token (`#acacac`), badge giai đoạn (`Active`), giá vé (`ETH`) và số vé còn lại.
- **Trạng thái Hover (`:hover`):**
  - Card nổi nhẹ lên (`transform: translateY(-4px)`), viền sáng nhẹ `#83c3ff`.
  - Ở đáy card, một thanh nút hành động trượt mượt lên (`250ms`):
    - Nếu chưa nối ví: Nút **"Connect Wallet để mua"**
    - Nếu đã nối ví: Nút **"Mua vé ngay"** (chuyển thẳng sang tab `Vé của tôi` để bấm Confirm).

### C. Thẻ vé & Dynamic QR Modal (Tab Vé của tôi)
- Thẻ vé thiết kế dạng **Ticket Stub** nền `#0c0c0c`, chia đôi bằng đường nét đứt `border-dashed #202020`.
- **Quy tắc bắt buộc cho QR Code:** Trong Modal hiển thị mã QR, mã QR phải được đặt trong một khung vuông **nền trắng tinh (`#FFFFFF`) với `padding: 16px` và `border-radius: 12px`** để webcam dễ quét trên nền tối. Bên dưới là thanh đếm ngược `30s` màu `#83c3ff` và nút **"Làm mới mã QR"** / **"Copy chuỗi QR"**.

### D. Khung Soát vé & Pop-up Thành công (Entry Gate & Tx Modal)
- Khung Camera quét QR nền `#0c0c0c`, viền `#202020`, có đường laser xanh `#10B981` quét nhẹ lên xuống, bên dưới là ô input dán chuỗi QR dự phòng.
- Modal thông báo giao dịch thành công nền `#0c0c0c`, viền `#10B981`, hiển thị icon check xanh + `TxHash` dạng monospace có nút copy.