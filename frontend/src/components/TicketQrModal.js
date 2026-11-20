import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Progress,
  Spinner,
  Text,
  Textarea,
  VStack,
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
    return () => {
      cancelled = true;
      clearInterval(timer);
      request.current += 1;
    };
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
      const next = await createTicketQr(
        eventItem.contract,
        ticket.ticketID,
        selectedAddress
      );
      if (id === request.current) {
        setPayload(next);
        setNow(Date.now());
      }
    } catch (err) {
      if (id === request.current) setError(qrErrorMessage(err));
    } finally {
      signing.current = false;
      if (id === request.current) setBusy(false);
    }
  }

  generateRef.current = generate;

  const remaining = payload
    ? Math.max(0, payload.timestamp + QR_TTL_MS - now)
    : 0;
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
      setCopyStatus(
        "Không thể truy cập clipboard. Hãy chọn và sao chép chuỗi bên dưới."
      );
    }
  }

  return (
    <Modal isOpen onClose={onClose} isCentered size="md">
      <ModalOverlay bg="rgba(0, 0, 0, 0.78)" backdropFilter="blur(6px)" />
      <ModalContent
        mx={3}
        bg="#0c0c0c"
        color="#ffffff"
        border="1px solid"
        borderColor="#202020"
        borderRadius="16px"
      >
        <ModalHeader borderBottom="1px solid" borderColor="#202020">
          Mã QR vé của bạn
        </ModalHeader>
        <ModalCloseButton color="#acacac" _hover={{ color: "#ffffff" }} />
        <ModalBody pt={5}>
          <VStack spacing={4}>
            <Text fontWeight="700" fontSize="lg" color="#ffffff">
              {eventItem.name}
            </Text>
            <HStack spacing={3}>
              <Text fontFamily="mono" color="#83c3ff">
                Token #{ticket.ticketID}
              </Text>
              <Badge
                px={2.5}
                py={0.5}
                borderRadius="9999px"
                bg={
                  expired
                    ? "rgba(244, 63, 94, 0.15)"
                    : "rgba(16, 185, 129, 0.15)"
                }
                border="1px solid"
                borderColor={expired ? "#F43F5E" : "#10B981"}
                color={expired ? "#F43F5E" : "#10B981"}
                textTransform="none"
              >
                {expired ? "Expired" : "Valid"}
              </Badge>
            </HStack>
            <Text fontSize="sm" color="#acacac" textAlign="center">
              Ký bằng ví để lấy mã có hiệu lực 30 giây. Mỗi lần làm mới cần xác
              nhận chữ ký, không tốn phí gas.
            </Text>

            {error && (
              <Alert
                status="error"
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

            {busy && (
              <HStack role="status" spacing={2.5} py={2}>
                <Spinner size="sm" color="#83c3ff" />
                <Text color="#acacac" fontSize="sm">
                  Đang chờ chữ ký trên ví…
                </Text>
              </HStack>
            )}

            {payload && (
              <>
                {/* Mandatory high-contrast Pure White QR Box */}
                <Box
                  position="relative"
                  p="16px"
                  bg="#FFFFFF"
                  border="2px solid"
                  borderColor={expired ? "#F43F5E" : "#83c3ff"}
                  borderRadius="12px"
                >
                  <Box
                    opacity={expired ? 0.15 : 1}
                    filter={expired ? "blur(2px)" : "none"}
                    transition="all 250ms cubic-bezier(0.16, 1, 0.3, 1)"
                  >
                    <QRCodeSVG
                      value={raw}
                      size={260}
                      marginSize={2}
                      level="M"
                      title={`Vé ${ticket.ticketID} - ${eventItem.name}`}
                      style={{ maxWidth: "100%", height: "auto", display: "block" }}
                    />
                  </Box>
                  {expired && (
                    <Box
                      position="absolute"
                      inset={0}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      p={5}
                      textAlign="center"
                      fontWeight="700"
                      color="#000000"
                      role="status"
                    >
                      Mã đã hết hạn — Bấm làm mới
                    </Box>
                  )}
                </Box>

                <Box w="full">
                  <Text
                    textAlign="center"
                    fontFamily="mono"
                    fontSize="sm"
                    color={expired ? "#F43F5E" : "#83c3ff"}
                    mb={2}
                  >
                    Còn {Math.ceil(remaining / 1000)} giây
                  </Text>
                  <Progress
                    value={(remaining / QR_TTL_MS) * 100}
                    size="sm"
                    borderRadius="full"
                    bg="#141414"
                    sx={{
                      "& > div": {
                        bg: expired ? "#F43F5E" : "#83c3ff",
                        transition: "width 200ms linear",
                      },
                    }}
                  />
                </Box>

                <Textarea
                  aria-label="Chuỗi QR để sao chép"
                  value={raw}
                  isReadOnly
                  bg="#141414"
                  border="1px solid"
                  borderColor="#202020"
                  borderRadius="12px"
                  color="#acacac"
                  fontFamily="mono"
                  fontSize="xs"
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  onClick={copy}
                  isDisabled={expired}
                  w="full"
                  bg="#141414"
                  color="#ffffff"
                  border="1px solid"
                  borderColor="#202020"
                  borderRadius="12px"
                  _hover={{ borderColor: "#83c3ff" }}
                >
                  Copy chuỗi QR
                </Button>
                {copyStatus && (
                  <Text role="status" fontSize="sm" color="#10B981">
                    {copyStatus}
                  </Text>
                )}
              </>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter gap={3} borderTop="1px solid" borderColor="#202020">
          <Button
            variant="ghost"
            color="#acacac"
            borderRadius="12px"
            _hover={{ color: "#ffffff", bg: "#141414" }}
            onClick={onClose}
          >
            Đóng
          </Button>
          <Button
            bg="#83c3ff"
            color="#000000"
            fontWeight="700"
            borderRadius="12px"
            _hover={{ bg: "#a2d3ff" }}
            onClick={generate}
            isLoading={busy}
            loadingText="Chờ ký"
          >
            {payload ? "Làm mới mã QR" : "Ký để lấy mã QR"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
