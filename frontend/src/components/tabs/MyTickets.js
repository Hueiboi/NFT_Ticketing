import React, { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  TabPanel,
  Text,
  VStack,
} from "@chakra-ui/react";
import { TicketQrModal } from "../TicketQrModal";

const ERROR_CODE_TX_REJECTED_BY_USER = 4001;

export function MyTickets({
  isActive,
  events,
  selectedAddress,
  pendingPurchase,
  onClearPendingPurchase,
  txBeingSent,
  setTxBeingSent,
  setTransactionError,
  dismissTransactionError,
  updateBalance,
  getEventsData,
  getSignerEventContract,
  connectWallet,
  onTxSuccess,
}) {
  const [selection, setSelection] = useState(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setSelection(null);
  }, [selectedAddress]);

  useEffect(() => {
    if (isActive === false) {
      setSelection(null);
    }
  }, [isActive]);

  async function handleConfirmPurchase() {
    if (!pendingPurchase || confirming || txBeingSent) return;

    try {
      setConfirming(true);
      dismissTransactionError();
      const contract = getSignerEventContract(pendingPurchase.contractAddress);
      const tx = await contract.buyTicket({ value: pendingPurchase.price });
      setTxBeingSent(tx.hash);

      const receipt = await tx.wait();
      if (receipt.status === 0) {
        throw new Error("Giao dịch mua vé thất bại.");
      }

      const mintLog = receipt.events?.find((ev) => ev.event === "CreateTicket");
      const mintedTokenId =
        mintLog?.args?.ticketID !== undefined
          ? mintLog.args.ticketID.toNumber()
          : undefined;

      const purchasedName = pendingPurchase.name;
      onClearPendingPurchase();
      await Promise.allSettled([updateBalance(), getEventsData()]);

      onTxSuccess?.({
        title: "Mua vé & Mint NFT thành công",
        message: "Vé điện tử ERC-721 đã được đúc và gửi vào ví của bạn.",
        eventName: purchasedName,
        tokenId: mintedTokenId,
        txHash: tx.hash,
      });
    } catch (error) {
      if (error?.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }
      setTransactionError(error);
    } finally {
      setConfirming(false);
      setTxBeingSent(undefined);
    }
  }

  const ownedEvents = (events || []).filter(
    (eventItem) => eventItem.myTickets && eventItem.myTickets.length > 0
  );
  const selectedEvent =
    selection &&
    ownedEvents.find((item) => item.contractAddress === selection.address);
  const selectedTicket = selectedEvent?.myTickets.find(
    (item) => item.ticketID === selection.ticketID && !item.isUsed
  );

  return (
    <TabPanel p={0}>
      <Box mb={8}>
        <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="700">
          Vé của tôi
        </Heading>
        <Text color="#acacac" mt={1.5} fontSize="sm">
          Xác nhận thanh toán vé đang chờ hoặc lấy mã QR động để check-in tại cổng soát vé.
        </Text>
      </Box>

      {/* Khu vực A: Vé chờ thanh toán (Bước 2) */}
      {pendingPurchase && (
        <Box
          mb={10}
          p={6}
          bg="#0c0c0c"
          border="1px solid"
          borderColor="#83c3ff"
          borderRadius="16px"
          boxShadow="0 10px 30px rgba(131, 195, 255, 0.1)"
        >
          <Flex
            direction={{ base: "column", md: "row" }}
            justify="space-between"
            align={{ base: "stretch", md: "center" }}
            gap={5}
          >
            <VStack align="start" spacing={1.5}>
              <Badge
                px={2.5}
                py={1}
                borderRadius="9999px"
                bg="rgba(131, 195, 255, 0.15)"
                color="#83c3ff"
                fontSize="xs"
                textTransform="none"
              >
                Chờ xác nhận thanh toán
              </Badge>
              <Text fontSize="xl" fontWeight="700" color="#ffffff">
                {pendingPurchase.name}{" "}
                <Text as="span" fontFamily="mono" fontSize="sm" color="#acacac">
                  ({pendingPurchase.symbol})
                </Text>
              </Text>
              <Text fontSize="sm" color="#acacac">
                Giá thanh toán:{" "}
                <Text as="span" fontFamily="mono" color="#ffffff" fontWeight="700">
                  {pendingPurchase.priceEth} ETH
                </Text>{" "}
                • Hợp đồng:{" "}
                <Text as="span" fontFamily="mono" fontSize="xs">
                  {pendingPurchase.contractAddress}
                </Text>
              </Text>
            </VStack>

            <HStack spacing={3}>
              <Button
                variant="outline"
                borderColor="#202020"
                bg="#141414"
                color="#acacac"
                borderRadius="12px"
                isDisabled={confirming || !!txBeingSent}
                _hover={{ color: "#ffffff", borderColor: "#acacac" }}
                onClick={onClearPendingPurchase}
              >
                Hủy
              </Button>
              <Button
                bg="#83c3ff"
                color="#000000"
                fontWeight="700"
                borderRadius="12px"
                px={6}
                h="44px"
                isLoading={confirming}
                loadingText="Đang Mint NFT..."
                isDisabled={!selectedAddress || !!txBeingSent}
                _hover={{ bg: "#a2d3ff" }}
                onClick={handleConfirmPurchase}
              >
                Confirm thanh toán
              </Button>
            </HStack>
          </Flex>
        </Box>
      )}

      {/* Khu vực B: Danh sách Vé NFT đã sở hữu (Bước 3) */}
      {!selectedAddress ? (
        <Box
          p={10}
          bg="#0c0c0c"
          border="1px solid"
          borderColor="#202020"
          borderRadius="16px"
          textAlign="center"
        >
          <Text fontSize="lg" fontWeight="600" mb={2}>
            Kết nối ví để xem vé của bạn
          </Text>
          <Text fontSize="sm" color="#acacac" mb={6}>
            Vé NFT thuộc quyền sở hữu của ví đang kết nối sẽ hiển thị tại đây.
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
      ) : ownedEvents.length === 0 ? (
        <Box
          p={10}
          bg="#0c0c0c"
          border="1px solid"
          borderColor="#202020"
          borderRadius="16px"
          textAlign="center"
        >
          <Text color="#acacac">Bạn chưa sở hữu vé NFT nào.</Text>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {ownedEvents.map((eventItem) =>
            eventItem.myTickets.map((ticket) => (
              <Box
                key={`${eventItem.contractAddress}-${ticket.ticketID}`}
                position="relative"
                bg="#0c0c0c"
                border="1px solid"
                borderColor="#202020"
                borderRadius="16px"
                overflow="hidden"
                transition="all 250ms cubic-bezier(0.16, 1, 0.3, 1)"
                _hover={{
                  transform: "translateY(-4px)",
                  borderColor: ticket.isUsed ? "#202020" : "#83c3ff",
                }}
              >
                {/* Ticket Top Info */}
                <VStack align="stretch" spacing={3} p={5}>
                  <HStack justify="space-between" align="start">
                    <Box minW={0}>
                      <Text
                        fontSize="lg"
                        fontWeight="700"
                        color="#ffffff"
                        isTruncated
                      >
                        {eventItem.name}
                      </Text>
                      <Text fontSize="xs" fontFamily="mono" color="#acacac">
                        {eventItem.symbol}
                      </Text>
                    </Box>
                    <Badge
                      px={2.5}
                      py={1}
                      borderRadius="9999px"
                      bg={
                        ticket.isUsed
                          ? "rgba(244, 63, 94, 0.15)"
                          : "rgba(16, 185, 129, 0.15)"
                      }
                      border="1px solid"
                      borderColor={ticket.isUsed ? "#F43F5E" : "#10B981"}
                      color={ticket.isUsed ? "#F43F5E" : "#10B981"}
                      fontSize="xs"
                      textTransform="none"
                      flexShrink={0}
                    >
                      {ticket.isUsed ? "Used" : "Valid"}
                    </Badge>
                  </HStack>

                  <HStack justify="space-between" pt={1}>
                    <Text fontSize="xs" color="#acacac">
                      NFT Pass ID
                    </Text>
                    <Text
                      fontFamily="mono"
                      fontWeight="700"
                      color="#83c3ff"
                      fontSize="sm"
                    >
                      Token #{ticket.ticketID}
                    </Text>
                  </HStack>

                  <Text
                    fontSize="xs"
                    fontFamily="mono"
                    color="#acacac"
                    isTruncated
                  >
                    Contract: {eventItem.contractAddress}
                  </Text>
                </VStack>

                {/* Ticket Stub Dashed Divider + Side Notches */}
                <Box position="relative" borderTop="1px dashed" borderColor="#202020">
                  <Box
                    position="absolute"
                    top="-9px"
                    left="-9px"
                    w="18px"
                    h="18px"
                    borderRadius="9999px"
                    bg="#000000"
                    border="1px solid"
                    borderColor="#202020"
                  />
                  <Box
                    position="absolute"
                    top="-9px"
                    right="-9px"
                    w="18px"
                    h="18px"
                    borderRadius="9999px"
                    bg="#000000"
                    border="1px solid"
                    borderColor="#202020"
                  />
                </Box>

                {/* Ticket Bottom Action */}
                <Box p={5} bg="#0c0c0c">
                  <Button
                    w="full"
                    h="44px"
                    bg={ticket.isUsed ? "#141414" : "#83c3ff"}
                    color={ticket.isUsed ? "#acacac" : "#000000"}
                    fontWeight="700"
                    borderRadius="12px"
                    border={ticket.isUsed ? "1px solid #202020" : "none"}
                    isDisabled={ticket.isUsed || !!txBeingSent}
                    _hover={
                      ticket.isUsed ? undefined : { bg: "#a2d3ff" }
                    }
                    onClick={() =>
                      setSelection({
                        address: eventItem.contractAddress,
                        ticketID: ticket.ticketID,
                      })
                    }
                  >
                    {ticket.isUsed ? "Đã sử dụng" : "Lấy mã QR"}
                  </Button>
                </Box>
              </Box>
            ))
          )}
        </SimpleGrid>
      )}

      {selectedTicket && (
        <TicketQrModal
          key={`${selectedAddress}-${selection.address}-${selection.ticketID}`}
          eventItem={selectedEvent}
          ticket={selectedTicket}
          selectedAddress={selectedAddress}
          onClose={() => setSelection(null)}
        />
      )}
    </TabPanel>
  );
}
