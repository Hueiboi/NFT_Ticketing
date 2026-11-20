import React, { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Code,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
} from "@chakra-ui/react";

export function TxSuccessModal({
  isOpen,
  onClose,
  title = "Giao dịch thành công",
  message,
  eventName,
  tokenId,
  txHash,
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopyTx() {
    if (!txHash) return;
    try {
      await navigator.clipboard.writeText(txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay bg="rgba(0, 0, 0, 0.78)" backdropFilter="blur(6px)" />
      <ModalContent
        mx={3}
        bg="#0c0c0c"
        color="#ffffff"
        border="1px solid"
        borderColor="#10B981"
        borderRadius="16px"
        boxShadow="0 20px 50px rgba(16, 185, 129, 0.16)"
      >
        <ModalHeader pb={2}>
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
            <Text fontSize="lg" fontWeight="700">
              {title}
            </Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton color="#acacac" _hover={{ color: "#ffffff" }} />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            {message && (
              <Text fontSize="sm" color="#acacac">
                {message}
              </Text>
            )}

            {(eventName || tokenId !== undefined) && (
              <HStack
                justify="space-between"
                p={3}
                bg="#141414"
                border="1px solid"
                borderColor="#202020"
                borderRadius="12px"
              >
                <Text fontWeight="600" color="#ffffff" isTruncated>
                  {eventName || "NFTix Ticket"}
                </Text>
                {tokenId !== undefined && tokenId !== null && (
                  <Badge
                    px={2.5}
                    py={1}
                    borderRadius="9999px"
                    bg="rgba(16, 185, 129, 0.15)"
                    color="#10B981"
                    fontFamily="mono"
                    textTransform="none"
                  >
                    Token #{tokenId}
                  </Badge>
                )}
              </HStack>
            )}

            {txHash && (
              <Box>
                <Text fontSize="xs" color="#acacac" mb={1.5} textTransform="uppercase" letterSpacing="0.06em">
                  Transaction Hash
                </Text>
                <Code
                  display="block"
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
                  {txHash}
                </Code>
              </Box>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter gap={3}>
          {txHash && (
            <Button
              variant="outline"
              borderColor="#202020"
              bg="#141414"
              color="#ffffff"
              borderRadius="12px"
              _hover={{ borderColor: "#83c3ff" }}
              onClick={handleCopyTx}
            >
              {copied ? "Đã copy TxHash" : "Copy TxHash"}
            </Button>
          )}
          <Button
            bg="#10B981"
            color="#000000"
            fontWeight="700"
            borderRadius="12px"
            _hover={{ bg: "#34D399" }}
            onClick={onClose}
          >
            Đóng
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
