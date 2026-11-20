import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { ChakraProvider } from "@chakra-ui/react";
import { TicketQrModal } from "./TicketQrModal";
import { createTicketQr, QR_TTL_MS } from "../utils/ticketQr";

jest.mock("../utils/ticketQr", () => ({
  ...jest.requireActual("../utils/ticketQr"), createTicketQr: jest.fn(),
}));

let root;
let container;
let payload;
beforeEach(() => {
  jest.useFakeTimers();
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = jest.fn().mockImplementation(() => ({ matches: false, addListener() {}, removeListener() {} }));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  payload = { contractAddress: "0xevent", tokenId: 0, timestamp: Date.now(), signature: "0xsigned" };
  createTicketQr.mockReset().mockResolvedValue(payload);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  jest.useRealTimers();
});

async function render() {
  await act(async () => root.render(<React.StrictMode><ChakraProvider>
    <TicketQrModal eventItem={{ name: "Demo", contract: {} }} ticket={{ ticketID: 0 }} selectedAddress="0xowner" onClose={jest.fn()} />
  </ChakraProvider></React.StrictMode>));
}
const button = (label) => Array.from(document.querySelectorAll("button")).find((item) => item.textContent === label);

test("opening modal signs once in StrictMode and shows a scannable QR", async () => {
  await render();
  expect(createTicketQr).toHaveBeenCalledTimes(1);
  expect(document.querySelector("svg title").textContent).toMatch(/Vé 0/);
  expect(document.body.textContent).toMatch(/Còn 30 giây/);
});

test("expiry disables copy and refresh signs a new payload", async () => {
  await render();
  act(() => jest.advanceTimersByTime(QR_TTL_MS));
  expect(document.body.textContent).toMatch(/Mã đã hết hạn/);
  expect(button("Copy chuỗi QR").disabled).toBe(true);
  createTicketQr.mockResolvedValue({ ...payload, timestamp: Date.now(), signature: "0xnew" });
  await act(async () => button("Làm mới mã QR").click());
  expect(createTicketQr).toHaveBeenCalledTimes(2);
  expect(button("Copy chuỗi QR").disabled).toBe(false);
  expect(document.querySelector("textarea").value).toContain("0xnew");
});

test("wallet rejection offers retry without showing a QR", async () => {
  createTicketQr.mockRejectedValue({ code: 4001 });
  await render();
  expect(document.body.textContent).toMatch(/hủy yêu cầu/);
  expect(button("Ký để lấy mã QR").disabled).toBe(false);
  expect(document.querySelector("textarea")).toBeNull();
});

test("closing while waiting for a signature ignores the eventual payload", async () => {
  let finish;
  createTicketQr.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  await render();
  await act(async () => root.render(null));
  await act(async () => finish(payload));
  expect(document.querySelector("textarea")).toBeNull();
});
