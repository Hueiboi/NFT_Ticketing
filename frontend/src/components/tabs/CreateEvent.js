import React, { useState } from "react";
import { ethers } from "ethers";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";

const ERROR_CODE_TX_REJECTED_BY_USER = 4001;

export function CreateEvent({
  eventCreator,
  txBeingSent,
  setTxBeingSent,
  setTransactionError,
  dismissTransactionError,
  updateBalance,
  getEventsData,
  onTxSuccess,
}) {
  const [eventName, setEventName] = useState("");
  const [eventSymbol, setEventSymbol] = useState("");
  const [numTickets, setNumTickets] = useState("");
  const [price, setPrice] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!eventCreator || txBeingSent) return;

    try {
      dismissTransactionError();
      const createdName = eventName;
      const priceWei = ethers.utils.parseEther(String(price || "0"));
      const tx = await eventCreator.createEvent(
        parseInt(numTickets, 10),
        priceWei,
        createdName,
        eventSymbol
      );
      setTxBeingSent(tx.hash);
      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error("Tạo sự kiện thất bại.");
      }

      setEventName("");
      setEventSymbol("");
      setNumTickets("");
      setPrice("");

      await Promise.allSettled([updateBalance(), getEventsData()]);

      onTxSuccess?.({
        title: "Tạo sự kiện thành công",
        message: "Hợp đồng Event ERC-721 đã được deploy lên Blockchain.",
        eventName: createdName,
        txHash: tx.hash,
      });
    } catch (error) {
      if (error?.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }
      setTransactionError(error);
    } finally {
      setTxBeingSent(undefined);
    }
  }

  return (
    <Box
      p={6}
      bg="#0c0c0c"
      border="1px solid"
      borderColor="#202020"
      borderRadius="16px"
    >
      <Box mb={6}>
        <Heading fontSize="xl" fontWeight="700" color="#ffffff">
          Tạo sự kiện mới
        </Heading>
        <Text fontSize="sm" color="#acacac" mt={1}>
          Deploy một Smart Contract vé ERC-721 mới thông qua EventCreator Factory.
        </Text>
      </Box>

      <Box as="form" onSubmit={handleSubmit}>
        <VStack spacing={4} align="stretch">
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl isRequired>
              <FormLabel htmlFor="create-name" fontSize="sm" color="#acacac">
                Tên sự kiện
              </FormLabel>
              <Input
                id="create-name"
                type="text"
                placeholder="Ví dụ: NFTix Music Fest"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                bg="#141414"
                border="1px solid"
                borderColor="#202020"
                borderRadius="12px"
                h="44px"
                color="#ffffff"
                _placeholder={{ color: "#64748B" }}
                _focus={{ borderColor: "#83c3ff", boxShadow: "none" }}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel htmlFor="create-symbol" fontSize="sm" color="#acacac">
                Ký hiệu Token (Symbol)
              </FormLabel>
              <Input
                id="create-symbol"
                type="text"
                placeholder="Ví dụ: NMF"
                value={eventSymbol}
                onChange={(e) => setEventSymbol(e.target.value)}
                bg="#141414"
                border="1px solid"
                borderColor="#202020"
                borderRadius="12px"
                h="44px"
                color="#ffffff"
                fontFamily="mono"
                _placeholder={{ color: "#64748B" }}
                _focus={{ borderColor: "#83c3ff", boxShadow: "none" }}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel htmlFor="create-num-tickets" fontSize="sm" color="#acacac">
                Số lượng vé phát hành
              </FormLabel>
              <Input
                id="create-num-tickets"
                type="number"
                min="1"
                placeholder="Ví dụ: 50"
                value={numTickets}
                onChange={(e) => setNumTickets(e.target.value)}
                bg="#141414"
                border="1px solid"
                borderColor="#202020"
                borderRadius="12px"
                h="44px"
                color="#ffffff"
                fontFamily="mono"
                _placeholder={{ color: "#64748B" }}
                _focus={{ borderColor: "#83c3ff", boxShadow: "none" }}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel htmlFor="create-price" fontSize="sm" color="#acacac">
                Giá vé (ETH)
              </FormLabel>
              <Input
                id="create-price"
                type="number"
                step="any"
                min="0"
                placeholder="Ví dụ: 0.05"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                bg="#141414"
                border="1px solid"
                borderColor="#202020"
                borderRadius="12px"
                h="44px"
                color="#ffffff"
                fontFamily="mono"
                _placeholder={{ color: "#64748B" }}
                _focus={{ borderColor: "#83c3ff", boxShadow: "none" }}
              />
            </FormControl>
          </SimpleGrid>

          <Button
            type="submit"
            alignSelf={{ base: "stretch", md: "flex-start" }}
            px={8}
            h="44px"
            bg="#83c3ff"
            color="#000000"
            fontWeight="700"
            borderRadius="12px"
            isDisabled={!!txBeingSent}
            _hover={{ bg: "#a2d3ff" }}
          >
            Tạo sự kiện
          </Button>
        </VStack>
      </Box>
    </Box>
  );
}
