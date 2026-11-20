import React from "react";
import {
  Alert, AlertIcon, Heading, Button, Text, Textarea, Select, Box, TabPanel,
  VStack, HStack, FormControl, FormLabel, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Code,
} from "@chakra-ui/react";
import { QrScanner } from "../QrScanner";
import { assertQrFresh, qrErrorMessage, verifyTicketQr } from "../../utils/ticketQr";

export class EntryGate extends React.Component {
  state = { eventAddress: "", raw: "", scanning: false, busy: false, error: "", success: null };
  processing = false;
  mounted = false;
  operation = 0;

  componentDidMount() { this.mounted = true; }
  componentWillUnmount() { this.mounted = false; this.operation += 1; }

  componentDidUpdate(prevProps) {
    if (prevProps.state.selectedAddress !== this.props.state.selectedAddress) {
      this.operation += 1;
      this.setState({ scanning: false, raw: "", error: "", success: null });
    } else if (prevProps.isActive && !this.props.isActive) {
      this.setState({ scanning: false });
    }
  }

  selectedEvent() {
    const events = (this.props.state.events || []).filter((item) => item.stage === 2);
    return events.find((item) => item.contractAddress === this.state.eventAddress) || events[0];
  }

  async checkIn(raw) {
    if (this.processing || this.props.state.txBeingSent) return;
    const eventItem = this.selectedEvent();
    if (!eventItem) return;
    this.processing = true;
    const operation = ++this.operation;
    const current = () => this.mounted && operation === this.operation;
    this.setState({ busy: true, scanning: false, error: "", raw });
    try {
      this.props.dismissTransactionError();
      const payload = await verifyTicketQr(raw, eventItem.contract, this.props.state.selectedAddress);
      if (!current()) return;
      assertQrFresh(payload);
      const tx = await eventItem.contract.useTicket(payload.tokenId);
      this.props.setState({ txBeingSent: tx.hash });
      const receipt = await tx.wait();
      if (receipt.status === 0) throw new Error("Giao dịch soát vé thất bại.");
      if (current()) this.setState({ raw: "", success: { txHash: tx.hash, tokenId: payload.tokenId, name: eventItem.name } });
      const refreshed = await Promise.allSettled([this.props.updateBalance(), this.props.getEventsData()]);
      if (current() && refreshed.some((result) => result.status === "rejected")) {
        this.setState({ error: "Soát vé đã thành công nhưng chưa tải lại được dữ liệu. Hãy tải lại trang." });
      }
    } catch (error) {
      if (current()) this.setState({ error: qrErrorMessage(error) });
    } finally {
      this.processing = false;
      if (this.mounted) this.setState({ busy: false });
      this.props.setState({ txBeingSent: undefined });
    }
  }

  render() {
    const events = (this.props.state.events || []).filter((item) => item.stage === 2);
    const eventItem = this.selectedEvent();
    const { busy, scanning, raw, error, success } = this.state;
    const disabled = busy || !!this.props.state.txBeingSent;
    return (
      <TabPanel mt="15px" mb="15px">
        <Heading mb={4} textAlign="center">Entry Gate</Heading>
        <Text color="gray.600" textAlign="center" mb={6}>Quét QR có chữ ký chủ vé để xác thực và ghi nhận soát vé.</Text>
        <VStack maxW="560px" mx="auto" spacing={5} align="stretch">
          {!eventItem ? <Text textAlign="center">Chưa có sự kiện mở soát vé (CheckinOpen).</Text> : <>
            <FormControl>
              <FormLabel htmlFor="gate-event">Sự kiện soát vé</FormLabel>
              <Select id="gate-event" value={eventItem.contractAddress} isDisabled={disabled}
                onChange={(e) => this.setState({ eventAddress: e.target.value, scanning: false, raw: "", error: "" })}>
                {events.map((item) => <option key={item.contractAddress} value={item.contractAddress}>{item.name} ({item.contractAddress.slice(0, 8)}…)</option>)}
              </Select>
            </FormControl>
            <Text fontSize="sm" color="gray.600">Dùng ví ban tổ chức hoặc nhân viên đã được cấp quyền soát vé.</Text>
            <Button colorScheme="green" variant="outline" isDisabled={disabled}
              onClick={() => this.setState({ scanning: !scanning, error: "" })}>
              {scanning ? "Tắt camera" : "Bật camera quét QR"}
            </Button>
            {scanning && this.props.isActive !== false && <QrScanner onScan={(value) => this.checkIn(value)} />}
            <Box as="form" onSubmit={(e) => { e.preventDefault(); this.checkIn(raw); }}>
              <FormControl isRequired>
                <FormLabel htmlFor="gate-payload">Hoặc dán chuỗi QR</FormLabel>
                <Textarea id="gate-payload" value={raw} isDisabled={disabled} rows={5} fontFamily="monospace" fontSize="sm"
                  placeholder='{"contractAddress":"0x...","tokenId":0,"timestamp":...,"signature":"0x..."}'
                  onChange={(e) => this.setState({ raw: e.target.value })} />
              </FormControl>
              <Button type="submit" colorScheme="purple" w="full" mt={4} isDisabled={disabled || !raw.trim()} isLoading={busy} loadingText="Đang xác thực / chờ giao dịch">
                Xác thực & soát vé
              </Button>
            </Box>
          </>}
          {error && <Alert status="error"><AlertIcon />{error}</Alert>}
        </VStack>
        <Modal isOpen={!!success} onClose={() => this.setState({ success: null })} isCentered>
          <ModalOverlay /><ModalContent mx={3}>
            <ModalHeader>Soát vé thành công</ModalHeader><ModalCloseButton />
            <ModalBody>{success && <VStack align="stretch" spacing={3}>
              <Alert status="success"><AlertIcon />Vé đã được ghi nhận sử dụng trên blockchain.</Alert>
              <HStack><Text>{success.name}</Text><Text fontFamily="monospace">Token #{success.tokenId}</Text></HStack>
              <Text>Transaction Hash</Text><Code p={3} whiteSpace="normal" wordBreak="break-all">{success.txHash}</Code>
            </VStack>}</ModalBody>
            <ModalFooter><Button onClick={() => this.setState({ success: null })}>Đóng</Button></ModalFooter>
          </ModalContent>
        </Modal>
      </TabPanel>
    );
  }
}
