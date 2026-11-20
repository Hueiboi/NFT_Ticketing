import React from "react";
import { Box, Button, HStack, Text } from "@chakra-ui/react";

export function TransactionErrorMessage({ message, dismiss }) {
  return (
    <Box
      p={4}
      mb={4}
      bg="#0c0c0c"
      border="1px solid"
      borderColor="#F43F5E"
      borderRadius="12px"
    >
      <HStack justify="space-between" align="start" spacing={4}>
        <Text fontSize="sm" color="#F43F5E">
          Lỗi giao dịch: {String(message || "").substring(0, 140)}
        </Text>
        <Button
          size="xs"
          variant="ghost"
          color="#acacac"
          _hover={{ color: "#ffffff", bg: "#141414" }}
          onClick={dismiss}
        >
          ✕
        </Button>
      </HStack>
    </Box>
  );
}
