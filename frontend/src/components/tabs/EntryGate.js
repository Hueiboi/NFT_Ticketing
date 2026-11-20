import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Code,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  TabPanel,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { QrScanner } from "../QrScanner";
import { assertQrFresh, qrErrorMessage, verifyTicketQr } from "../../utils/ticketQr";

export function EntryGate({
  isActive,
  events,
  selectedAddress,
  txBeingSent,
  setTxBeingSent,
  dismissTransactionError,
  updateBalance,
  getEventsData,
  connectWallet,
}) {
  const [eventAddress, setEventAddress] = useState("");
  const [raw, setRaw] = useState("");
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [copiedTx, setCopiedTx] = useState(false);

  const processingRef = useRef(false);
  const mountedRef = useRef(false);
  const operationRef = useRef(0);
  const prevAddressRef = useRef(selectedAddress);
  const latestAddressRef = useRef(selectedAddress);
  latestAddressRef.current = selectedAddress;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      operationRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (prevAddressRef.current !== selectedAddress) {
      prevAddressRef.current = selectedAddress;
      operationRef.current += 1;
      setScanning(false);
      setRaw("");
      setError("");
      setSuccess(null);
    }
  }, [selectedAddress]);

  useEffect(() => {
    if (isActive === false) {
      setScanning(false);
    }
  }, [isActive]);

  const checkinEvents = (events || []).filter((item) => item.stage === 2);
  const eventItem =
    checkinEvents.find((item) => item.contractAddress === eventAddress) ||
    checkinEvents[0];

  async function checkIn(scannedRaw) {
    if (processingRef.current || txBeingSent || !eventItem) return;

    processingRef.current = true;
    const operation = ++operationRef.current;
    const activeAddress = selectedAddress;
    const isCurrent = () =>
      mountedRef.current &&
      operation === operationRef.current &&
      latestAddressRef.current === activeAddress;

    setBusy(true);
    setScanning(false);
    setError("");
    setRaw(scannedRaw);

    try {
      dismissTransactionError();
      const payload = await verifyTicketQr(
        scannedRaw,
        eventItem.contract,
        activeAddress
      );
      if (!isCurrent()) return;

      assertQrFresh(payload);
      const tx = await eventItem.contract.useTicket(payload.tokenId);
      setTxBeingSent(tx.hash);

      const receipt = await tx.wait();
      if (receipt.status === 0) {
        throw new Error("Giao dịch soát vé thất bại.");
      }

      if (isCurrent()) {
        setRaw("");
        setCopiedTx(false);
        setSuccess({
          txHash: tx.hash,
          tokenId: payload.tokenId,
          name: eventItem.name,
        });
      }

      const refreshed = await Promise.allSettled([
        updateBalance(),
        getEventsData(),
      ]);
      if (isCurrent() && refreshed.some((result) => result.status === "rejected")) {
        setError(
          "Soát vé đã thành công nhưng chưa tải lại được dữ liệu. Hãy tải lại trang."
        );
      }
    } catch (err) {
      if (isCurrent()) {
        setError(qrErrorMessage(err));
      }
    } finally {
      processingRef.current = false;
      if (mountedRef.current) {
        setBusy(false);
      }
      setTxBeingSent(undefined);
    }
  }

  async function handleCopyTxHash() {
    if (!success?.txHash) return;
    try {
      await navigator.clipboard.writeText(success.txHash);
      setCopiedTx(true);
      setTimeout(() => setCopiedTx(false), 2000);
    } catch {
      setCopiedTx(false);
    }
  }

  const disabled = busy || !!txBeingSent;

  return (
    <TabPanel p={0}>
      <Box mb={8} textAlign="center">
        <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="700">
          Soát vé (Entry Gate)
        </Heading>
        <Text color="#acacac" mt={1.5} fontSize="sm">
          Quét QR có chữ ký chủ vé để xác thực chữ ký số, đối chiếu on-chain và ghi nhận check-in.
        </Text>
      </Box>

      {!selectedAddress ? (
        <Box
          maxW="520px"
          mx="auto"
          p={8}
          bg="#0c0c0c"
          border="1px solid"
          borderColor="#202020"
          borderRadius="16px"
          textAlign="center"
        >
          <Text fontSize="lg" fontWeight="600" mb={2}>
            Kết nối ví Nhân viên / Ban tổ chức
          </Text>
          <Text fontSize="sm" color="#acacac" mb={6}>
            Chỉ ví Ban tổ chức hoặc ví Staff được cấp quyền mới có thể xác nhận vé qua cổng.
          </Text>
          <Button
            bg="#83c3ff"
            color="#000000"
            fontWeight="700"
            borderRadius="12px"
            px={6}
            _hover={{ bg: "#a2d3ff" }}
            onClick={connectWallet}
          >
            Connect Wallet
          </Button>
        </Box>
      ) : (
        <Box
          maxW="600px"
          mx="auto"
          p={6}
          bg="#0c0c0c"
          border="1px solid"
          borderColor="#202020"
          borderRadius="16px"
        >
          <VStack spacing={5} align="stretch">
            {!eventItem ? (
              <Box py={6} textAlign="center">
                <Text fontWeight="600" color="#ffffff" mb={1}>
                  Chưa có sự kiện mở soát vé (CheckinOpen)
                </Text>
                <Text fontSize="sm" color="#acacac">
                  Ban tổ chức cần chuyển stage sự kiện sang CheckinOpen trong tab Ban tổ chức.
                </Text>
              </Box>
            ) : (
              <>
                <FormControl>
                  <FormLabel htmlFor="gate-event" fontSize="sm" color="#acacac">
                    Sự kiện soát vé
                  </FormLabel>
                  <Select
                    id="gate-event"
                    value={eventItem.contractAddress}
                    isDisabled={disabled}
                    bg="#141414"
                    border="1px solid"
                    borderColor="#202020"
                    borderRadius="12px"
                    color="#ffffff"
                    _focus={{ borderColor: "#83c3ff", boxShadow: "none" }}
                    onChange={(e) => {
                      setEventAddress(e.target.value);
                      setScanning(false);
                      setRaw("");
                      setError("");
                    }}
                  >
                    {checkinEvents.map((item) => (
                      <option
                        key={item.contractAddress}
                        value={item.contractAddress}
                        style={{ backgroundColor: "#0c0c0c", color: "#ffffff" }}
                      >
                        {item.name} ({item.contractAddress.slice(0, 8)}…)
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <Text fontSize="xs" color="#acacac">
                  Dùng ví ban tổ chức hoặc nhân viên đã được cấp quyền soát vé.
                </Text>

                <Button
                  variant="outline"
                  borderColor={scanning ? "#F43F5E" : "#10B981"}
                  bg="#141414"
                  color={scanning ? "#F43F5E" : "#10B981"}
                  borderRadius="12px"
                  h="44px"
                  isDisabled={disabled}
                  _hover={{
                    bg: scanning
                      ? "rgba(244, 63, 94, 0.12)"
                      : "rgba(16, 185, 129, 0.12)",
                  }}
                  onClick={() => {
                    setScanning((prev) => !prev);
                    setError("");
                  }}
                >
                  {scanning ? "Tắt camera" : "Bật camera quét QR"}
                </Button>

                {scanning && isActive !== false && (
                  <QrScanner onScan={(value) => checkIn(value)} />
                )}

                <Box
                  as="form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    checkIn(raw);
                  }}
                >
                  <FormControl isRequired>
                    <FormLabel htmlFor="gate-payload" fontSize="sm" color="#acacac">
                      Hoặc dán chuỗi QR dự phòng
                    </FormLabel>
                    <Textarea
                      id="gate-payload"
                      value={raw}
                      isDisabled={disabled}
                      rows={5}
                      bg="#141414"
                      border="1px solid"
                      borderColor="#202020"
                      borderRadius="12px"
                      color="#ffffff"
                      fontFamily="mono"
                      fontSize="xs"
                      _focus={{ borderColor: "#83c3ff", boxShadow: "none" }}
                      placeholder='{"contractAddress":"0x...","tokenId":0,"timestamp":...,"signature":"0x..."}'
                      onChange={(e) => setRaw(e.target.value)}
                    />
                  </FormControl>
                  <Button
                    type="submit"
                    bg="#83c3ff"
                    color="#000000"
                    fontWeight="700"
                    borderRadius="12px"
                    h="46px"
                    w="full"
                    mt={4}
                    isDisabled={disabled || !raw.trim()}
                    isLoading={busy}
                    loadingText="Đang xác thực / chờ giao dịch"
                    _hover={{ bg: "#a2d3ff" }}
                  >
                    Xác thực &amp; soát vé
                  </Button>
                </Box>
              </>
            )}

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
          </VStack>
        </Box>
      )}

      {/* Check-in Success Modal (Bước 5) */}
      <Modal isOpen={!!success} onClose={() => setSuccess(null)} isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.78)" backdropFilter="blur(6px)" />
        <ModalContent
          mx={3}
          bg="#0c0c0c"
          color="#ffffff"
          border="1px solid"
          borderColor="#10B981"
          borderRadius="16px"
          boxShadow="0 20px 50px rgba(16, 185, 129, 0.18)"
        >
          <ModalHeader>
            <HStack spacing={3}>
              <Box
                w="32px"
                h="32px"
                borderRadius="9999px"
                bg="rgba(16, 185, 129, 0.15)"
                border="1px solid"
                borderColor="#10B981"
                color="#10B981"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontWeight="700"
                fontSize="sm"
              >
                ✓
              </Box>
              <Text>Soát vé thành công</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton color="#acacac" _hover={{ color: "#ffffff" }} />
          <ModalBody>
            {success && (
              <VStack align="stretch" spacing={3}>
                <Alert
                  status="success"
                  bg="#141414"
                  border="1px solid"
                  borderColor="#10B981"
                  borderRadius="12px"
                  color="#10B981"
                >
                  <AlertIcon color="#10B981" />
                  Vé đã được ghi nhận sử dụng trên blockchain.
                </Alert>
                <HStack
                  justify="space-between"
                  p={3}
                  bg="#141414"
                  border="1px solid"
                  borderColor="#202020"
                  borderRadius="12px"
                >
                  <Text fontWeight="600">{success.name}</Text>
                  <Badge
                    px={2.5}
                    py={0.5}
                    borderRadius="9999px"
                    bg="rgba(16, 185, 129, 0.15)"
                    color="#10B981"
                    fontFamily="mono"
                    textTransform="none"
                  >
                    Token #{success.tokenId}
                  </Badge>
                </HStack>
                <Text fontSize="xs" color="#acacac">
                  Transaction Hash
                </Text>
                <Code
                  p={3}
                  bg="#141414"
                  color="#83c3ff"
                  border="1px solid"
                  borderColor="#202020"
                  borderRadius="12px"
                  fontFamily="mono"
                  fontSize="xs"
                  whiteSpace="normal"
                  wordBreak="break-all"
                >
                  {success.txHash}
                </Code>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter gap={3}>
            <Button
              variant="outline"
              borderColor="#202020"
              bg="#141414"
              color="#ffffff"
              borderRadius="12px"
              _hover={{ borderColor: "#83c3ff" }}
              onClick={handleCopyTxHash}
            >
              {copiedTx ? "Đã copy TxHash" : "Copy TxHash"}
            </Button>
            <Button
              bg="#10B981"
              color="#000000"
              fontWeight="700"
              borderRadius="12px"
              _hover={{ bg: "#34D399" }}
              onClick={() => setSuccess(null)}
            >
              Đóng
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </TabPanel>
  );
}
