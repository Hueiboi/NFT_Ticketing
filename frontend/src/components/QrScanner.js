import React, { useEffect, useId, useRef, useState } from "react";
import { Alert, AlertIcon, Box, Text } from "@chakra-ui/react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

export function QrScanner({ onScan }) {
  const id = `qr-reader-${useId().replace(/:/g, "")}`;
  const callback = useRef(onScan);
  callback.current = onScan;
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let decoded = false;
    let scanner;
    // StrictMode's discarded effect must not open a camera.
    const started = Promise.resolve().then(async () => {
      if (cancelled) return;
      scanner = new Html5Qrcode(id, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
      await scanner.start({ facingMode: "environment" }, { fps: 10 }, (raw) => {
        if (!cancelled && !decoded) {
          decoded = true;
          callback.current(raw);
        }
      }, () => {});
    }).catch(() => {
      if (!cancelled) setError("Không mở được camera. Hãy cấp quyền camera trên HTTPS/localhost hoặc dán chuỗi QR bên dưới.");
    });
    return () => {
      cancelled = true;
      started.then(async () => {
        if (scanner?.isScanning) await scanner.stop();
        scanner?.clear();
      }).catch(() => { /* Camera may already have been released by the browser. */ });
    };
  }, [id]);

  return <Box w="full">
    <Text fontSize="sm" mb={2}>Đưa mã QR vào khung hình. Camera dừng sau khi đọc một mã.</Text>
    <Box id={id} minH="200px" border="1px solid" borderColor="green.300" borderRadius="md" overflow="hidden" />
    {error && <Alert status="error" mt={3}><AlertIcon />{error}</Alert>}
  </Box>;
}
