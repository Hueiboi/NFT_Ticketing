import { ethers } from "ethers";
import { assertQrFresh, createTicketQr, parseTicketQr, QR_TTL_MS, ticketQrMessage, verifyTicketQr } from "./ticketQr";

const wallet = new ethers.Wallet("0x" + "01".padStart(64, "0"));
const other = new ethers.Wallet("0x" + "02".padStart(64, "0"));
const address = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const now = 1800000000000;
let contract;

beforeEach(() => {
  jest.spyOn(Date, "now").mockReturnValue(now);
  contract = {
    address, signer: wallet,
    ownerOf: jest.fn().mockResolvedValue(wallet.address),
    isUsed: jest.fn().mockResolvedValue(false),
    stage: jest.fn().mockResolvedValue(2),
    owner: jest.fn().mockResolvedValue(other.address),
    staff: jest.fn().mockResolvedValue(false),
  };
});
afterEach(() => jest.restoreAllMocks());

async function signed(overrides = {}, signer = wallet) {
  const payload = { contractAddress: address, tokenId: 0, timestamp: now, ...overrides };
  payload.signature = await signer.signMessage(ticketQrMessage(payload));
  return payload;
}

test("wallet-generated QR is accepted by gate with the exact shared message", async () => {
  const payload = await createTicketQr(contract, 0, wallet.address);
  expect(ticketQrMessage(payload)).toBe(`${address}:0:${now}`);
  await expect(verifyTicketQr(JSON.stringify(payload), contract, other.address)).resolves.toEqual(payload);
  expect(contract.ownerOf).toHaveBeenCalledWith(0);
});

test("staff may check in even without owning any ticket", async () => {
  contract.staff.mockResolvedValue(true);
  await expect(verifyTicketQr(JSON.stringify(await signed()), contract, wallet.address)).resolves.toHaveProperty("tokenId", 0);
});

test.each(["", "not json", "null", "[]", "{}", "x".repeat(4097)])("rejects malformed payload %s", (raw) => {
  expect(() => parseTicketQr(raw)).toThrow();
});

test.each([
  { tokenId: -1 }, { tokenId: 0.1 }, { tokenId: "0" }, { tokenId: Number.MAX_SAFE_INTEGER + 1 },
  { timestamp: "1800000000000" }, { timestamp: 0 }, { timestamp: now + 1 },
  { contractAddress: "0x123" }, { signature: "0x123" },
])("rejects invalid fields %j", async (overrides) => {
  const payload = { ...await signed(), ...overrides };
  expect(() => parseTicketQr(JSON.stringify(payload))).toThrow();
});

test("expires exactly at 30 seconds, and accepts just before expiry", () => {
  expect(() => assertQrFresh({ timestamp: now - QR_TTL_MS + 1 })).not.toThrow();
  expect(() => assertQrFresh({ timestamp: now - QR_TTL_MS })).toThrow(/hết hạn/);
});

test("expired payload is rejected before RPC reads", async () => {
  await expect(verifyTicketQr(JSON.stringify(await signed({ timestamp: now - QR_TTL_MS })), contract, other.address)).rejects.toThrow(/hết hạn/);
  expect(contract.ownerOf).not.toHaveBeenCalled();
});

test("wrong event is rejected before RPC reads", async () => {
  const raw = JSON.stringify(await signed({ contractAddress: other.address }));
  await expect(verifyTicketQr(raw, contract, other.address)).rejects.toThrow(/không thuộc/);
  expect(contract.ownerOf).not.toHaveBeenCalled();
});

test("tampering with a signed token ID invalidates owner verification", async () => {
  const payload = { ...await signed(), tokenId: 1 };
  await expect(verifyTicketQr(JSON.stringify(payload), contract, other.address)).rejects.toThrow(/Chữ ký/);
});

test("forged signature from a different wallet is rejected", async () => {
  await expect(verifyTicketQr(JSON.stringify(await signed({}, other)), contract, other.address)).rejects.toThrow(/Chữ ký/);
});

test("previous owner's signature is rejected after transfer", async () => {
  contract.ownerOf.mockResolvedValue(other.address);
  await expect(verifyTicketQr(JSON.stringify(await signed()), contract, other.address)).rejects.toThrow(/chủ sở hữu/);
});

test.each([
  ["isUsed", true, /đã được sử dụng/],
  ["stage", 1, /chưa mở/],
])("rejects changed on-chain %s", async (method, value, message) => {
  contract[method].mockResolvedValue(value);
  await expect(verifyTicketQr(JSON.stringify(await signed()), contract, other.address)).rejects.toThrow(message);
});

test("unauthorized gate wallet is rejected", async () => {
  await expect(verifyTicketQr(JSON.stringify(await signed()), contract, wallet.address)).rejects.toThrow(/không có quyền/);
});

test("nonexistent token or failed RPC never produces a verified payload", async () => {
  contract.ownerOf.mockRejectedValue(new Error("ERC721: invalid token ID"));
  await expect(verifyTicketQr(JSON.stringify(await signed()), contract, other.address)).rejects.toThrow(/invalid token/);
});

test("rechecks expiry after slow RPC responses", async () => {
  contract.ownerOf.mockImplementation(async () => {
    Date.now.mockReturnValue(now + QR_TTL_MS);
    return wallet.address;
  });
  await expect(verifyTicketQr(JSON.stringify(await signed()), contract, other.address)).rejects.toThrow(/hết hạn/);
});

test("used ticket cannot produce a QR", async () => {
  contract.isUsed.mockResolvedValue(true);
  await expect(createTicketQr(contract, 0, wallet.address)).rejects.toThrow(/đã được sử dụng/);
});

test("wrong connected wallet cannot produce a QR", async () => {
  await expect(createTicketQr(contract, 0, other.address)).rejects.toThrow(/không sở hữu/);
});

test("slow wallet approval cannot display an already expired QR", async () => {
  contract.signer = {
    getAddress: () => wallet.getAddress(),
    signMessage: async (message) => {
      Date.now.mockReturnValue(now + QR_TTL_MS);
      return wallet.signMessage(message);
    },
  };
  await expect(createTicketQr(contract, 0, wallet.address)).rejects.toThrow(/hết hạn/);
});

test("wallet cancellation is propagated without producing a QR", async () => {
  contract.signer = { getAddress: () => wallet.getAddress(), signMessage: jest.fn().mockRejectedValue({ code: 4001 }) };
  await expect(createTicketQr(contract, 0, wallet.address)).rejects.toEqual({ code: 4001 });
});
