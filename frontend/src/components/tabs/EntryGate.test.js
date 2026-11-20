import { EntryGate } from "./EntryGate";
import { verifyTicketQr } from "../../utils/ticketQr";

jest.mock("../QrScanner", () => ({ QrScanner: () => null }));
jest.mock("../../utils/ticketQr", () => ({
  ...jest.requireActual("../../utils/ticketQr"), verifyTicketQr: jest.fn(),
}));

let gate;
let contract;
let receipt;
beforeEach(() => {
  receipt = jest.fn().mockResolvedValue({ status: 1 });
  contract = { useTicket: jest.fn().mockResolvedValue({ hash: "0xtransaction", wait: receipt }) };
  gate = new EntryGate({
    state: { selectedAddress: "0xstaff", events: [{ contractAddress: "0xevent", stage: 2, name: "Demo", contract }] },
    setState: jest.fn(), dismissTransactionError: jest.fn(),
    updateBalance: jest.fn().mockResolvedValue(), getEventsData: jest.fn().mockResolvedValue(),
  });
  gate.setState = (next) => { gate.state = { ...gate.state, ...next }; };
  gate.componentDidMount();
  verifyTicketQr.mockReset().mockResolvedValue({ tokenId: 0, timestamp: Date.now() });
});

test("invalid QR never calls useTicket", async () => {
  verifyTicketQr.mockRejectedValue(new Error("QR đã hết hạn"));
  await gate.checkIn("invalid");
  expect(contract.useTicket).not.toHaveBeenCalled();
  expect(gate.state.error).toMatch(/hết hạn/);
  expect(gate.state.busy).toBe(false);
});

test("duplicate scan callbacks submit only one transaction", async () => {
  await Promise.all([gate.checkIn("payload"), gate.checkIn("payload")]);
  expect(contract.useTicket).toHaveBeenCalledTimes(1);
  expect(contract.useTicket).toHaveBeenCalledWith(0);
  expect(receipt).toHaveBeenCalledTimes(1);
  expect(gate.state.success.txHash).toBe("0xtransaction");
  expect(gate.state.scanning).toBe(false);
});

test("success appears only after the receipt confirms", async () => {
  let confirm;
  let reachedReceipt;
  const waiting = new Promise((resolve) => { reachedReceipt = resolve; });
  receipt.mockImplementation(() => new Promise((resolve) => { confirm = resolve; reachedReceipt(); }));
  const pending = gate.checkIn("payload");
  await waiting;
  expect(gate.state.success).toBeNull();
  confirm({ status: 1 });
  await pending;
  expect(gate.state.success.tokenId).toBe(0);
});

test("wallet change while verifying prevents submitting the transaction", async () => {
  const pending = gate.checkIn("payload");
  gate.props = { ...gate.props, state: { ...gate.props.state, selectedAddress: "0xnew" } };
  gate.componentDidUpdate({ state: { selectedAddress: "0xstaff" } });
  await pending;
  expect(contract.useTicket).not.toHaveBeenCalled();
});

test("failed receipt never shows success", async () => {
  receipt.mockResolvedValue({ status: 0 });
  await gate.checkIn("payload");
  expect(gate.state.success).toBeNull();
  expect(gate.state.error).toMatch(/thất bại/);
});

test("rejected wallet request unlocks the form for retry", async () => {
  contract.useTicket.mockRejectedValue({ code: 4001 });
  await gate.checkIn("payload");
  expect(gate.state.error).toMatch(/hủy/);
  expect(gate.state.busy).toBe(false);
  expect(gate.processing).toBe(false);
});

test("refresh failure preserves successful transaction result", async () => {
  gate.props.getEventsData.mockRejectedValue(new Error("offline"));
  await gate.checkIn("payload");
  expect(gate.state.success.txHash).toBe("0xtransaction");
  expect(gate.state.error).toMatch(/đã thành công/);
});
