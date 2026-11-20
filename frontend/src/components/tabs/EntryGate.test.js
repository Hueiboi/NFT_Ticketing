import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { ChakraProvider, Tabs, TabPanels } from "@chakra-ui/react";
import { EntryGate } from "./EntryGate";
import { verifyTicketQr } from "../../utils/ticketQr";

let latestOnScan;
jest.mock("../QrScanner", () => ({
  QrScanner: ({ onScan }) => {
    latestOnScan = onScan;
    return null;
  },
}));

jest.mock("../../utils/ticketQr", () => ({
  ...jest.requireActual("../../utils/ticketQr"),
  verifyTicketQr: jest.fn(),
}));

let container;
let root;
let contract;
let receipt;
let baseProps;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = jest
    .fn()
    .mockImplementation(() => ({
      matches: false,
      addListener() {},
      removeListener() {},
    }));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  latestOnScan = null;

  receipt = jest.fn().mockResolvedValue({ status: 1 });
  contract = {
    useTicket: jest.fn().mockResolvedValue({ hash: "0xtransaction", wait: receipt }),
  };
  baseProps = {
    isActive: true,
    selectedAddress: "0xstaff",
    events: [
      { contractAddress: "0xevent", stage: 2, name: "Demo", contract },
    ],
    txBeingSent: undefined,
    setTxBeingSent: jest.fn(),
    dismissTransactionError: jest.fn(),
    updateBalance: jest.fn().mockResolvedValue(),
    getEventsData: jest.fn().mockResolvedValue(),
  };

  verifyTicketQr
    .mockReset()
    .mockResolvedValue({ tokenId: 0, timestamp: Date.now() });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function renderGate(overrides = {}) {
  const props = { ...baseProps, ...overrides };
  await act(async () => {
    root.render(
      <React.StrictMode>
        <ChakraProvider>
          <Tabs>
            <TabPanels>
              <EntryGate {...props} />
            </TabPanels>
          </Tabs>
        </ChakraProvider>
      </React.StrictMode>
    );
  });
}

function findButton(label) {
  return Array.from(document.querySelectorAll("button")).find((btn) =>
    btn.textContent.includes(label)
  );
}

async function submitRawPayload(value) {
  const textarea = container.querySelector("#gate-payload");
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  ).set;
  await act(async () => {
    nativeSetter.call(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => {
    findButton("Xác thực").closest("form").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
  });
}

test("invalid QR never calls useTicket", async () => {
  verifyTicketQr.mockRejectedValue(new Error("QR đã hết hạn"));
  await renderGate();
  await submitRawPayload("invalid");
  expect(contract.useTicket).not.toHaveBeenCalled();
  expect(container.textContent).toMatch(/hết hạn/);
  expect(findButton("Xác thực").disabled).toBe(false);
});

test("duplicate scan callbacks submit only one transaction", async () => {
  await renderGate();
  await act(async () => {
    findButton("Bật camera quét QR").click();
  });
  expect(typeof latestOnScan).toBe("function");

  await act(async () => {
    await Promise.all([latestOnScan("payload"), latestOnScan("payload")]);
  });

  expect(contract.useTicket).toHaveBeenCalledTimes(1);
  expect(contract.useTicket).toHaveBeenCalledWith(0);
  expect(receipt).toHaveBeenCalledTimes(1);
  expect(document.body.textContent).toContain("0xtransaction");
  expect(findButton("Bật camera quét QR")).toBeTruthy();
});

test("success appears only after the receipt confirms", async () => {
  let confirm;
  let reachedReceipt;
  const waiting = new Promise((resolve) => {
    reachedReceipt = resolve;
  });
  receipt.mockImplementation(
    () =>
      new Promise((resolve) => {
        confirm = resolve;
        reachedReceipt();
      })
  );

  await renderGate();
  let pending;
  await act(async () => {
    findButton("Bật camera quét QR").click();
  });
  await act(async () => {
    pending = latestOnScan("payload");
    await waiting;
  });

  expect(document.body.textContent).not.toContain("Soát vé thành công");

  await act(async () => {
    confirm({ status: 1 });
    await pending;
  });

  expect(document.body.textContent).toContain("Soát vé thành công");
  expect(document.body.textContent).toContain("Token #0");
});

test("wallet change while verifying prevents submitting the transaction", async () => {
  let resolveVerify;
  verifyTicketQr.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveVerify = resolve;
      })
  );

  await renderGate();
  await act(async () => {
    findButton("Bật camera quét QR").click();
  });

  let pending;
  act(() => {
    pending = latestOnScan("payload");
  });

  await renderGate({ selectedAddress: "0xnew" });

  await act(async () => {
    resolveVerify({ tokenId: 0, timestamp: Date.now() });
    await pending;
  });

  expect(contract.useTicket).not.toHaveBeenCalled();
});

test("failed receipt never shows success", async () => {
  receipt.mockResolvedValue({ status: 0 });
  await renderGate();
  await submitRawPayload("payload");
  expect(document.body.textContent).not.toContain("Soát vé thành công");
  expect(container.textContent).toMatch(/thất bại/);
});

test("rejected wallet request unlocks the form for retry", async () => {
  contract.useTicket.mockRejectedValue({ code: 4001 });
  await renderGate();
  await submitRawPayload("payload");
  expect(container.textContent).toMatch(/hủy/);
  expect(findButton("Xác thực").disabled).toBe(false);

  contract.useTicket.mockResolvedValue({ hash: "0xretry", wait: receipt });
  await submitRawPayload("payload");
  expect(document.body.textContent).toContain("0xretry");
});

test("refresh failure preserves successful transaction result", async () => {
  baseProps.getEventsData.mockRejectedValue(new Error("offline"));
  await renderGate();
  await submitRawPayload("payload");
  expect(document.body.textContent).toContain("0xtransaction");
  expect(container.textContent).toMatch(/đã thành công/);
});
