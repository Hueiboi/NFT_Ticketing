import { ethers } from "ethers";

export const QR_TTL_MS = 30000;

// Shared by the wallet and gate. Preserve the exact signed address casing.
export function ticketQrMessage({ contractAddress, tokenId, timestamp }) {
  return `${contractAddress}:${tokenId}:${timestamp}`;
}

export function assertQrFresh(payload, now = Date.now()) {
  if (!Number.isSafeInteger(payload.timestamp) || payload.timestamp <= 0) {
    throw new Error("Thời gian trong mã QR không hợp lệ.");
  }
  if (payload.timestamp > now) {
    throw new Error("Mã QR có thời gian trong tương lai. Hãy kiểm tra đồng hồ hai thiết bị.");
  }
  if (now - payload.timestamp >= QR_TTL_MS) {
    throw new Error("Mã QR đã hết hạn. Vui lòng lấy mã QR mới.");
  }
}

export function parseTicketQr(raw) {
  let payload;
  try {
    if (typeof raw !== "string" || raw.length > 4096) throw new Error();
    payload = JSON.parse(raw);
  } catch {
    throw new Error("Chuỗi QR không phải JSON hợp lệ.");
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
      typeof payload.contractAddress !== "string" ||
      !ethers.utils.isAddress(payload.contractAddress) ||
      !Number.isSafeInteger(payload.tokenId) || payload.tokenId < 0 ||
      typeof payload.signature !== "string" ||
      !/^0x[0-9a-fA-F]{130}$/.test(payload.signature)) {
    throw new Error("Mã QR thiếu dữ liệu hoặc sai định dạng vé NFTix.");
  }
  assertQrFresh(payload);
  return payload;
}

export async function createTicketQr(contract, tokenId, selectedAddress) {
  const [owner, used, signerAddress] = await Promise.all([
    contract.ownerOf(tokenId), contract.isUsed(tokenId), contract.signer.getAddress(),
  ]);
  if (used) throw new Error("Vé đã được sử dụng, không thể tạo QR.");
  if (owner.toLowerCase() !== signerAddress.toLowerCase() ||
      signerAddress.toLowerCase() !== selectedAddress.toLowerCase()) {
    throw new Error("Ví hiện tại không sở hữu vé này.");
  }
  const payload = { contractAddress: contract.address, tokenId, timestamp: Date.now() };
  payload.signature = await contract.signer.signMessage(ticketQrMessage(payload));
  // Wallet approval can take longer than the QR lifetime.
  assertQrFresh(payload);
  if (ethers.utils.verifyMessage(ticketQrMessage(payload), payload.signature).toLowerCase() !== owner.toLowerCase()) {
    throw new Error("Ví ký đã thay đổi. Vui lòng lấy lại mã QR.");
  }
  return payload;
}

export async function verifyTicketQr(raw, contract, selectedAddress) {
  const payload = parseTicketQr(raw);
  if (payload.contractAddress.toLowerCase() !== contract.address.toLowerCase()) {
    throw new Error("Mã QR không thuộc sự kiện đã chọn.");
  }
  let signerAddress;
  try {
    signerAddress = ethers.utils.verifyMessage(ticketQrMessage(payload), payload.signature);
  } catch {
    throw new Error("Chữ ký QR không hợp lệ.");
  }
  const [owner, used, stage, organizer, isStaff] = await Promise.all([
    contract.ownerOf(payload.tokenId), contract.isUsed(payload.tokenId),
    contract.stage(), contract.owner(), contract.staff(selectedAddress),
  ]);
  if (signerAddress.toLowerCase() !== owner.toLowerCase()) {
    throw new Error("Chữ ký QR không khớp chủ sở hữu hiện tại của vé.");
  }
  if (used) throw new Error("Vé đã được sử dụng.");
  if (Number(stage) !== 2) throw new Error("Sự kiện chưa mở hoặc đã đóng soát vé.");
  if (organizer.toLowerCase() !== selectedAddress.toLowerCase() && !isStaff) {
    throw new Error("Ví hiện tại không có quyền soát vé sự kiện này.");
  }
  assertQrFresh(payload);
  return payload;
}

export function qrErrorMessage(error) {
  if (error?.code === 4001 || error?.code === "ACTION_REJECTED" || error?.error?.code === 4001) {
    return "Bạn đã hủy yêu cầu trên ví. Có thể thử lại khi sẵn sàng.";
  }
  return error?.reason || error?.data?.message || error?.message || "Không thể xử lý mã QR. Vui lòng thử lại.";
}
