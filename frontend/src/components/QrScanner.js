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
    const started = Promise.resolve()
      .then(async () => {
        if (cancelled) return;
        scanner = new Html5Qrcode(id, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10 },
          (raw) => {
            if (!cancelled && !decoded) {
              decoded = true;
              callback.current(raw);
            }
          },
          () => {}
        );
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "Không mở được camera. Hãy cấp quyền camera trên HTTPS/localhost hoặc dán chuỗi QR bên dưới."
          );
        }
      });
    return () => {
      cancelled = true;
      started
        .then(async () => {
          if (scanner?.isScanning) await scanner.stop();
          scanner?.clear();
        })
        .catch(() => {
          /* Camera may already have been released by the browser. */
        });
    };
  }, [id]);

  return (
    <Box w="full">
      <Text fontSize="sm" color="#acacac" mb={2}>
        Đưa mã QR vào khung hình. Camera dừng sau khi đọc một mã.
      </Text>
      <Box
        position="relative"
        bg="#000000"
        border="1px solid"
        borderColor="#202020"
        borderRadius="12px"
        overflow="hidden"
      >
        <Box id={id} minH="220px" />
        <Box
          position="absolute"
          left="8%"
          right="8%"
          h="2px"
          bg="#10B981"
          boxShadow="0 0 14px #10B981"
          pointerEvents="none"
          sx={{
            animation: "nftixScanline 2.4s ease-in-out infinite",
          }}
        />
      </Box>
      {error && (
        <Alert
          status="error"
          mt={3}
          bg="#141414"
          border="1px solid"
          borderColor="#F43F5E"
          borderRadius="12px"
          color="#F43F5E"
        >
          <AlertIcon color="#F43F5E" />
          {error}
        </Alert>
      )}
    </Box>
  );
}
