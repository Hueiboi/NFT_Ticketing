import React from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Image,
  SimpleGrid,
  Spinner,
  TabPanel,
  Text,
  VStack,
} from "@chakra-ui/react";
import { getEventCover } from "../../utils/eventCover";

export function BuyTickets({
  events,
  eventsLoading,
  selectedAddress,
  txBeingSent,
  connectWallet,
  onSelectPurchase,
  onGoToOrganizer,
}) {
  const activeEvents = (events || []).filter((e) => e.stage === 1);

  async function handleBuyClick(eventItem) {
    if (!selectedAddress) {
      const addr = await connectWallet();
      if (!addr) return;
    }
    onSelectPurchase(eventItem);
  }

  return (
    <TabPanel p={0}>
      <Flex
        justify="space-between"
        align={{ base: "start", md: "end" }}
        direction={{ base: "column", md: "row" }}
        gap={4}
        mb={8}
      >
        <Box>
          <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="700">
            Khám phá sự kiện
          </Heading>
          <Text color="#acacac" mt={1.5} fontSize="sm">
            Chọn sự kiện đang mở bán để sở hữu vé NFT ERC-721 chính chủ trên ví MetaMask.
          </Text>
        </Box>
        <Badge
          px={3}
          py={1.5}
          borderRadius="9999px"
          bg="#0c0c0c"
          border="1px solid"
          borderColor="#202020"
          color="#83c3ff"
          fontFamily="mono"
          textTransform="none"
        >
          {activeEvents.length} sự kiện đang mở bán
        </Badge>
      </Flex>

      {eventsLoading ? (
        <Flex justify="center" align="center" py={16} gap={3}>
          <Spinner color="#83c3ff" />
          <Text color="#acacac">Đang tải danh sách sự kiện từ Blockchain...</Text>
        </Flex>
      ) : activeEvents.length === 0 ? (
        <Box
          p={10}
          bg="#0c0c0c"
          border="1px solid"
          borderColor="#202020"
          borderRadius="16px"
          textAlign="center"
        >
          <Text fontSize="lg" fontWeight="600" mb={2}>
            Chưa có sự kiện nào đang mở bán (Active)
          </Text>
          <Text fontSize="sm" color="#acacac" mb={6}>
            Ban tổ chức cần tạo sự kiện mới và chuyển trạng thái sang Active trong mục Ban tổ chức.
          </Text>
          <Button
            bg="#83c3ff"
            color="#000000"
            fontWeight="700"
            borderRadius="12px"
            _hover={{ bg: "#a2d3ff" }}
            onClick={onGoToOrganizer}
          >
            Đi tới Ban tổ chức
          </Button>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {activeEvents.map((eventItem, index) => {
            const soldOut = eventItem.numTicketsLeft === 0;
            const coverSrc = getEventCover(eventItem.contractAddress, index);

            return (
              <Box
                key={eventItem.contractAddress}
                role="group"
                position="relative"
                overflow="hidden"
                bg="#0c0c0c"
                border="1px solid"
                borderColor="#202020"
                borderRadius="16px"
                transition="all 250ms cubic-bezier(0.16, 1, 0.3, 1)"
                _hover={{
                  transform: "translateY(-4px)",
                  borderColor: "#83c3ff",
                  boxShadow: "0 14px 30px rgba(131, 195, 255, 0.12)",
                }}
              >
                {/* Art Cover Banner with Zoom & Dark Gradient Overlay */}
                <Box
                  position="relative"
                  h="160px"
                  overflow="hidden"
                  bg="#141414"
                  borderBottom="1px solid"
                  borderColor="#202020"
                >
                  <Image
                    src={coverSrc}
                    alt={`${eventItem.name} cover`}
                    w="100%"
                    h="100%"
                    objectFit="cover"
                    transition="transform 300ms ease"
                    _groupHover={{ transform: "scale(1.06)" }}
                  />
                  <Box
                    position="absolute"
                    inset={0}
                    bgGradient="linear(180deg, rgba(12,12,12,0.35) 0%, rgba(12,12,12,0.95) 100%)"
                  />
                  <Flex
                    position="relative"
                    zIndex={1}
                    h="100%"
                    p={5}
                    direction="column"
                    justify="space-between"
                  >
                    <HStack justify="space-between">
                      <Badge
                        px={2.5}
                        py={1}
                        borderRadius="9999px"
                        bg="rgba(12, 12, 12, 0.78)"
                        backdropFilter="blur(6px)"
                        border="1px solid"
                        borderColor="#202020"
                        color="#ffffff"
                        fontFamily="mono"
                        fontSize="xs"
                      >
                        {eventItem.symbol}
                      </Badge>
                      <Badge
                        px={2.5}
                        py={1}
                        borderRadius="9999px"
                        bg="rgba(16, 185, 129, 0.2)"
                        backdropFilter="blur(6px)"
                        border="1px solid"
                        borderColor="#10B981"
                        color="#10B981"
                        fontSize="xs"
                        textTransform="none"
                      >
                        {soldOut ? "Sold Out" : "Active"}
                      </Badge>
                    </HStack>

                    <Text
                      fontFamily="mono"
                      fontSize="xs"
                      color="#acacac"
                      isTruncated
                    >
                      {eventItem.contractAddress}
                    </Text>
                  </Flex>
                </Box>

                {/* Card Body */}
                <VStack align="stretch" spacing={4} p={5} pb={{ base: 5, md: "76px" }}>
                  <Box>
                    <Text
                      fontSize="xl"
                      fontWeight="700"
                      color="#ffffff"
                      isTruncated
                    >
                      {eventItem.name}
                    </Text>
                    <Text fontSize="xs" color="#acacac" fontFamily="mono" mt={0.5}>
                      ERC-721 Pass • {eventItem.symbol}
                    </Text>
                  </Box>

                  <HStack
                    justify="space-between"
                    pt={3}
                    borderTop="1px solid"
                    borderColor="#202020"
                  >
                    <Box>
                      <Text fontSize="xs" color="#acacac">
                        Giá vé
                      </Text>
                      <Text
                        fontSize="lg"
                        fontWeight="700"
                        fontFamily="mono"
                        color="#ffffff"
                      >
                        {eventItem.priceEth} ETH
                      </Text>
                    </Box>
                    <Box textAlign="right">
                      <Text fontSize="xs" color="#acacac">
                        Vé còn lại
                      </Text>
                      <Text
                        fontSize="md"
                        fontWeight="600"
                        fontFamily="mono"
                        color={soldOut ? "#F43F5E" : "#83c3ff"}
                      >
                        {eventItem.numTicketsLeft}/{eventItem.numTickets}
                      </Text>
                    </Box>
                  </HStack>
                </VStack>

                {/* OpenSea Slide-up Hover Action Bar */}
                <Box
                  position={{ base: "relative", md: "absolute" }}
                  left={0}
                  right={0}
                  bottom={0}
                  px={5}
                  pb={5}
                  pt={2}
                  bg="linear-gradient(180deg, rgba(12,12,12,0) 0%, #0c0c0c 30%)"
                  transform={{ base: "translateY(0)", md: "translateY(100%)" }}
                  opacity={{ base: 1, md: 0 }}
                  transition="all 250ms cubic-bezier(0.16, 1, 0.3, 1)"
                  _groupHover={{ transform: "translateY(0)", opacity: 1 }}
                  _groupFocusWithin={{ transform: "translateY(0)", opacity: 1 }}
                >
                  <Button
                    w="full"
                    h="44px"
                    bg="#83c3ff"
                    color="#000000"
                    fontWeight="700"
                    fontSize="sm"
                    borderRadius="12px"
                    isDisabled={soldOut || !!txBeingSent}
                    _hover={{ bg: "#a2d3ff" }}
                    onClick={() => handleBuyClick(eventItem)}
                  >
                    {soldOut
                      ? "Hết vé"
                      : selectedAddress
                      ? "Mua vé ngay"
                      : "Connect Wallet để mua"}
                  </Button>
                </Box>
              </Box>
            );
          })}
        </SimpleGrid>
      )}
    </TabPanel>
  );
}
