import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { ChakraProvider } from "@chakra-ui/react";
import { Html5Qrcode } from "html5-qrcode";
import { QrScanner } from "./QrScanner";

jest.mock("html5-qrcode", () => ({ Html5Qrcode: jest.fn(), Html5QrcodeSupportedFormats: { QR_CODE: 0 } }));

let container;
let root;
let scanner;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = jest.fn().mockImplementation(() => ({ matches: false, addListener() {}, removeListener() {} }));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  scanner = {
    isScanning: false,
    start: jest.fn().mockImplementation(async () => { scanner.isScanning = true; }),
    stop: jest.fn().mockResolvedValue(), clear: jest.fn(),
  };
  Html5Qrcode.mockReset().mockImplementation(() => scanner);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function render(onScan = jest.fn()) {
  await act(async () => root.render(<React.StrictMode><ChakraProvider><QrScanner onScan={onScan} /></ChakraProvider></React.StrictMode>));
}

test("StrictMode opens only one camera and unmount releases it", async () => {
  await render();
  expect(scanner.start).toHaveBeenCalledTimes(1);
  await act(async () => root.render(null));
  expect(scanner.stop).toHaveBeenCalledTimes(1);
  expect(scanner.clear).toHaveBeenCalledTimes(1);
});

test("only the first decoded frame is forwarded", async () => {
  const onScan = jest.fn();
  await render(onScan);
  const decoded = scanner.start.mock.calls[0][2];
  act(() => { decoded("first"); decoded("duplicate"); });
  expect(onScan).toHaveBeenCalledTimes(1);
  expect(onScan).toHaveBeenCalledWith("first");
});

test("pending camera startup is stopped even after unmount", async () => {
  let finish;
  scanner.start.mockImplementation(() => new Promise((resolve) => {
    finish = () => { scanner.isScanning = true; resolve(); };
  }));
  await render();
  await act(async () => root.render(null));
  expect(scanner.stop).not.toHaveBeenCalled();
  await act(async () => finish());
  expect(scanner.stop).toHaveBeenCalledTimes(1);
});

test("denied camera permission explains the paste fallback", async () => {
  scanner.start.mockRejectedValue(new Error("NotAllowedError"));
  await render();
  expect(container.textContent).toMatch(/dán chuỗi QR/);
});
