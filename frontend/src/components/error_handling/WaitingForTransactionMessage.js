import React from "react";
import { Box, HStack, Spinner, Text } from "@chakra-ui/react";

export function WaitingForTransactionMessage({ txHash }) {
  return (
    <Box
      p={4}
      mb={4}
      bg="#0c0c0c"
      border="1px solid"
      borderColor="#83c3ff"
      borderRadius="12px"
    >
      <HStack spacing={3}>
        <Spinner size="sm" color="#83c3ff" />
        <Text fontSize="sm" color="#ffffff">
          Đang xử lý giao dịch:{" "}
          <Text as="span" fontFamily="mono" color="#83c3ff" wordBreak="break-all">
            {txHash}
          </Text>
        </Text>
      </HStack>
    </Box>
  );
}
