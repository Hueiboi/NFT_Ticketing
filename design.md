# UI/UX Design Specification (`design.md`)

## 1. Phong cách tổng thể (Design Concept)
- **Chủ đề:** *Minimalist Digital Ticket Pass* — Giao diện tối giản, nhiều khoảng trắng, bố cục dạng **cuống vé (Ticket Stub)** với đường cắt nét đứt (`dashed border`) ngăn cách thông tin sự kiện và khu vực thao tác/mã QR.
- **Nguyên tắc:** Không dùng hiệu ứng 3D nặng nề hay gradient lòe loẹt. Tập trung làm nổi bật thông tin cốt lõi của Web3: **Địa chỉ ví, Token ID, Trạng thái vé (`Valid`/`Used`), và Transaction Hash**.
- **Framework UI:** Tận dụng **Chakra UI** có sẵn trong `frontend/` kết hợp CSS transitions thuần (không cần cài thêm thư viện animation nặng).

---

## 2. Bảng màu 3 tông chủ đạo (Color Palette)
Chọn **nền sáng (Light Mode)** làm mặc định để mã QR đạt độ tương phản cao nhất khi quét qua webcam laptop:

1. **Màu Nền & Thẻ (Neutral Canvas):**
   - Nền trang chính: `#F8FAFC` (Slate 50 - Trắng xám dịu mắt)
   - Nền Card / Modal: `#FFFFFF` (Pure White) với viền mỏng `1px solid #E2E8F0`
   - Chữ chính: `#0F172A` (Slate 900) | Chữ phụ: `#64748B` (Slate 500)
2. **Màu Thương hiệu & Hành động chính (Primary Accent):**
   - **Electric Indigo:** `#4F46E5` (Hover: `#4338CA`)
   - Dùng cho các nút hành động chính (`Connect Wallet`, `Mua vé`, `Confirm Thanh toán`, `Làm mới mã QR`) và viền highlight khi hover vào thẻ vé.
3. **Màu Trạng thái Web3 (Semantic Status):**
   - **Emerald Mint (`#10B981`):** Vé hợp lệ (`Valid`), Check-in thành công, Giao dịch hoàn tất.
   - **Rose Coral (`#F43F5E`):** Vé đã sử dụng (`Used`), Mã QR hết hạn (`Expired`), Cảnh báo lỗi.

---

## 3. Typography & Hiển thị dữ liệu Web3
- **Font tiêu đề & nội dung:** `Inter` hoặc `Plus Jakarta Sans` (rõ ràng, hiện đại).
- **Font kỹ thuật (`Monospace`):** `JetBrains Mono` hoặc `Fira Code` — bắt buộc dùng cho:
  - Địa chỉ ví rút gọn (`0x71C...9A21`)
  - Mã vé NFT (`Token #01`)
  - Đồng hồ đếm ngược QR (`29s`)
  - Mã giao dịch (`TxHash: 0x9f8b...3e1a`)

---

## 4. Micro-Animations (Hiệu ứng chuyển động nhẹ)
Chỉ dùng các chuyển động mượt dưới `300ms` (`cubic-bezier(0.16, 1, 0.3, 1)`):

1. **Ticket Card Hover (Thẻ sự kiện & Thẻ vé):**
   - Khi di chuột vào Card: thẻ nổi nhẹ lên `transform: translateY(-4px)`, viền chuyển sang `#4F46E5`, bóng đổ nhẹ `0 10px 25px -5px rgba(79, 70, 229, 0.1)`.
2. **Dynamic QR Pulse & Countdown Bar (Bước 3 - Modal QR):**
   - Viền khung mã QR có hiệu ứng nhịp thở nhẹ (`pulse` opacity viền xanh `#4F46E5`) khi đang trong thời gian hiệu lực `30s`.
   - Phía dưới mã QR có một thanh tiến trình (`Progress Bar`) thu ngắn mượt mà từ `100%` về `0%` trong 30 giây. Khi hết giờ (`0s`), mã QR tự động mờ đi (`opacity: 0.35`, `filter: blur(2px)`) và hiện lớp phủ *"Mã đã hết hạn - Bấm làm mới"*.
3. **Check-in Scan Frame & Result Pop-up (Bước 4 & 5):**
   - Khung Camera soát vé có đường kẻ ngang màu xanh `#10B981` quét lên xuống nhẹ nhàng (`scanline` keyframes) tạo cảm giác máy quét thực thụ.
   - Pop-up báo thành công xuất hiện với hiệu ứng nảy nhẹ (`scale(0.95) -> scale(1)` trong `200ms`) kèm icon dấu tick xanh phóng to.

---

## 5. Bố cục 4 Khu vực Tối giản (Layout Structure)
- **Top Navbar (Cố định trên cùng):**
  - Trái: Tên dự án (`NFTix`) kèm chấm tròn xanh báo trạng thái mạng `Localhost:8545`.
  - Giữa: 4 tab gọn nhẹ: `1. Mua vé` | `2. Vé của tôi` | `3. Soát vé (Gate)` | `4. Ban tổ chức`.
  - Phải: Nút `Connect Wallet` (khi đã nối ví thì biến thành Pill hiển thị `0x123...abc`).
- **Card Vé chuẩn (Ticket Stub UI):**
  - Chia 2 phần ngang (hoặc dọc trên mobile) ngăn cách bởi đường đứt nét `border-dashed` và 2 hình bán nguyệt khuyết ở hai bên mép tạo hình dáng cuống vé thật.
  - Phần trái (70%): Tên sự kiện, Stage badge (`Active` / `CheckinOpen`), Giá vé (`ETH`).
  - Phần phải (30%): Số vé còn lại + Nút hành động (`Mua vé` hoặc `Lấy mã QR`).