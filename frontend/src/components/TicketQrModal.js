import React, { useEffect, useRef, useState } from "react";
import {
  Alert, AlertIcon, Badge, Box, Button, HStack, Modal, ModalBody,
  ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay,
  Progress, Spinner, Text, Textarea, VStack,
} from "@chakra-ui/react";
import { QRCodeSVG } from "qrcode.react";
import { createTicketQr, QR_TTL_MS, qrErrorMessage } from "../utils/ticketQr";

export function TicketQrModal({ eventItem, ticket, selectedAddress, onClose }) {
  const [payload, setPayload] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const request = useRef(0);
  const signing = useRef(false);
  const generateRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) generateRef.current();
    });
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => { cancelled = true; clearInterval(timer); request.current += 1; };
  }, []);

  async function generate() {
    if (signing.current) return;
    signing.current = true;
    const id = ++request.current;
    setBusy(true);
    setError("");
    setCopyStatus("");
    setPayload(null);
    try {
      const next = await createTicketQr(eventItem.contract, ticket.ticketID, selectedAddress);
      if (id === request.current) { setPayload(next); setNow(Date.now()); }
    } catch (err) {
      if (id === request.current) setError(qrErrorMessage(err));
    } finally {
      signing.current = false;
      if (id === request.current) setBusy(false);
    }
  }

  generateRef.current = generate;

  const remaining = payload ? Math.max(0, payload.timestamp + QR_TTL_MS - now) : 0;
  const expired = !!payload && remaining === 0;
  const raw = payload ? JSON.stringify(payload) : "";

  async function copy() {
    if (!payload || Date.now() >= payload.timestamp + QR_TTL_MS) {
      setNow(Date.now());
      return;
    }
    try {
      await navigator.clipboard.writeText(raw);
      setCopyStatus("Đã sao chép chuỗi QR.");
    } catch {
      setCopyStatus("Không thể truy cập clipboard. Hãy chọn và sao chép chuỗi bên dưới.");
    }
  }

  return (
    <Modal isOpen onClose={onClose} isCentered size="md">
      <ModalOverlay />
      <ModalContent mx={3}>
        <ModalHeader>Mã QR vé của bạn</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <Text fontWeight="bold">{eventItem.name}</Text>
            <HStack><Text fontFamily="monospace">Token #{ticket.ticketID}</Text>
              <Badge colorScheme={expired ? "red" : "green"}>{expired ? "Expired" : "Valid"}</Badge>
            </HStack>
            <Text fontSize="sm" color="gray.600" textAlign="center">
              Ký bằng ví để lấy mã có hiệu lực 30 giây. Mỗi lần làm mới cần xác nhận chữ ký, không tốn phí gas.
            </Text>
            {error && <Alert status="error"><AlertIcon />{error}</Alert>}
            {busy && <HStack role="status"><Spinner size="sm" /><Text>Đang chờ chữ ký trên ví…</Text></HStack>}
            {payload && <>
              <Box position="relative" p={2} bg="white" border="2px solid" borderColor={expired ? "red.300" : "#4F46E5"} borderRadius="xl">
                <Box opacity={expired ? 0.15 : 1} filter={expired ? "blur(2px)" : "none"}>
                  <QRCodeSVG value={raw} size={280} marginSize={4} level="M" title={`Vé ${ticket.ticketID} - ${eventItem.name}`} style={{ maxWidth: "100%", height: "auto" }} />
                </Box>
                {expired && <Box position="absolute" inset={0} display="flex" alignItems="center" justifyContent="center" p={5} textAlign="center" fontWeight="bold" role="status">Mã đã hết hạn — Bấm làm mới</Box>}
              </Box>
              <Box w="full">
                <Text textAlign="center" fontFamily="monospace" mb={2}>Còn {Math.ceil(remaining / 1000)} giây</Text>
                <Progress value={remaining / QR_TTL_MS * 100} colorScheme={expired ? "red" : "purple"} size="sm" borderRadius="full" />
              </Box>
              <Textarea aria-label="Chuỗi QR để sao chép" value={raw} isReadOnly fontFamily="monospace" fontSize="xs" onFocus={(e) => e.target.select()} />
              <Button onClick={copy} isDisabled={expired} w="full">Copy chuỗi QR</Button>
              {copyStatus && <Text role="status" fontSize="sm">{copyStatus}</Text>}
            </>}
          </VStack>
        </ModalBody>
        <ModalFooter gap={3}>
          <Button variant="ghost" onClick={onClose}>Đóng</Button>
          <Button bg="#4F46E5" color="white" _hover={{ bg: "#4338CA" }} onClick={generate} isLoading={busy} loadingText="Chờ ký">
            {payload ? "Làm mới mã QR" : "Ký để lấy mã QR"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
