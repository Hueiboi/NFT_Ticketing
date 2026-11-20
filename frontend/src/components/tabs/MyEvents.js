import React, { useState } from "react";
import { ethers } from "ethers";
import {
  Badge,
  Box,
  Button,
  Heading,
  HStack,
  Input,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";

const ERROR_CODE_TX_REJECTED_BY_USER = 4001;

const STAGES = [
  { value: 0, label: "Prep", color: "#acacac", bg: "#141414" },
  {
    value: 1,
    label: "Active",
    color: "#10B981",
    bg: "rgba(16, 185, 129, 0.15)",
  },
  {
    value: 2,
    label: "CheckinOpen",
    color: "#83c3ff",
    bg: "rgba(131, 195, 255, 0.15)",
  },
  {
    value: 3,
    label: "Closed",
    color: "#F43F5E",
    bg: "rgba(244, 63, 94, 0.15)",
  },
];

export function MyEvents({
  events,
  selectedAddress,
  txBeingSent,
  setTxBeingSent,
  setTransactionError,
  dismissTransactionError,
  updateBalance,
  getEventsData,
  onTxSuccess,
}) {
  const [staffInputs, setStaffInputs] = useState({});

  async function runContractTx(txPromise, successMeta) {
    if (txBeingSent) return;

    try {
      dismissTransactionError();
      const tx = await txPromise();
      setTxBeingSent(tx.hash);
      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error("Giao dịch thất bại.");
      }

      await Promise.allSettled([updateBalance(), getEventsData()]);

      if (successMeta) {
        onTxSuccess?.({ ...successMeta, txHash: tx.hash });
      }
    } catch (error) {
      if (error?.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }
      setTransactionError(error);
    } finally {
      setTxBeingSent(undefined);
    }
  }

  const currentUser = (selectedAddress || "").toLowerCase();
  const myEvents = (events || []).filter(
    (eventItem) => eventItem.owner.toLowerCase() === currentUser
  );

  return (
    <Box>
      <Box mb={6}>
        <Heading fontSize="xl" fontWeight="700" color="#ffffff">
          Sự kiện của tôi ({myEvents.length})
        </Heading>
        <Text fontSize="sm" color="#acacac" mt={1}>
          Chuyển trạng thái mở bán/soát vé, cấp quyền nhân viên Check-in và rút doanh thu ETH.
        </Text>
      </Box>

      {myEvents.length === 0 ? (
        <Box
          p={8}
          bg="#0c0c0c"
          border="1px solid"
          borderColor="#202020"
          borderRadius="16px"
          textAlign="center"
        >
          <Text color="#acacac" fontSize="sm">
            Ví hiện tại chưa tạo sự kiện nào. Hãy tạo sự kiện ở form phía trên.
          </Text>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          {myEvents.map((eventItem) => {
            const addr = eventItem.contractAddress;
            const stageMeta = STAGES[eventItem.stage] || STAGES[0];
            const staffAddr = (staffInputs[addr] || "").trim();
            const isValidStaffAddr = ethers.utils.isAddress(staffAddr);

            return (
              <Box
                key={addr}
                p={6}
                bg="#0c0c0c"
                border="1px solid"
                borderColor="#202020"
                borderRadius="16px"
              >
                <VStack align="stretch" spacing={5}>
                  {/* Header */}
                  <HStack justify="space-between" align="start">
                    <Box minW={0}>
                      <Text fontSize="lg" fontWeight="700" isTruncated>
                        {eventItem.name}
                      </Text>
                      <Text fontSize="xs" fontFamily="mono" color="#acacac" isTruncated>
                        {addr}
                      </Text>
                    </Box>
                    <Badge
                      px={2.5}
                      py={1}
                      borderRadius="9999px"
                      bg={stageMeta.bg}
                      border="1px solid"
                      borderColor={stageMeta.color}
                      color={stageMeta.color}
                      textTransform="none"
                    >
                      {stageMeta.label}
                    </Badge>
                  </HStack>

                  {/* Metrics */}
                  <SimpleGrid
                    columns={3}
                    spacing={3}
                    p={3}
                    bg="#141414"
                    border="1px solid"
                    borderColor="#202020"
                    borderRadius="12px"
                  >
                    <Box>
                      <Text fontSize="xs" color="#acacac">
                        Giá vé
                      </Text>
                      <Text fontFamily="mono" fontWeight="700" fontSize="sm">
                        {eventItem.priceEth} ETH
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="#acacac">
                        Còn lại
                      </Text>
                      <Text fontFamily="mono" fontWeight="700" fontSize="sm">
                        {eventItem.numTicketsLeft}/{eventItem.numTickets}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="#acacac">
                        Doanh thu
                      </Text>
                      <Text
                        fontFamily="mono"
                        fontWeight="700"
                        fontSize="sm"
                        color="#10B981"
                      >
                        {eventItem.revenueEth} ETH
                      </Text>
                    </Box>
                  </SimpleGrid>

                  {/* Stage selector */}
                  <Box>
                    <Text fontSize="xs" color="#acacac" mb={2}>
                      Chuyển giai đoạn (Stage)
                    </Text>
                    <SimpleGrid columns={{ base: 2, sm: 4 }} spacing={2}>
                      {STAGES.map((stageOpt) => {
                        const active = eventItem.stage === stageOpt.value;
                        return (
                          <Button
                            key={stageOpt.value}
                            size="sm"
                            h="36px"
                            borderRadius="10px"
                            bg={active ? "#83c3ff" : "#141414"}
                            color={active ? "#000000" : "#acacac"}
                            border="1px solid"
                            borderColor={active ? "#83c3ff" : "#202020"}
                            fontWeight={active ? "700" : "500"}
                            isDisabled={active || !!txBeingSent}
                            _hover={
                              active
                                ? undefined
                                : { borderColor: "#83c3ff", color: "#ffffff" }
                            }
                            onClick={() =>
                              runContractTx(
                                () => eventItem.contract.setStage(stageOpt.value),
                                {
                                  title: `Đã chuyển sang ${stageOpt.label}`,
                                  message: `Trạng thái sự kiện đã được cập nhật thành ${stageOpt.label}.`,
                                  eventName: eventItem.name,
                                }
                              )
                            }
                          >
                            {stageOpt.label}
                          </Button>
                        );
                      })}
                    </SimpleGrid>
                  </Box>

                  {/* Staff authorization */}
                  <Box
                    as="form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!isValidStaffAddr) return;
                      runContractTx(
                        () => eventItem.contract.setStaff(staffAddr, true),
                        {
                          title: "Cấp quyền Staff thành công",
                          message: `Ví ${staffAddr} đã được cấp quyền soát vé.`,
                          eventName: eventItem.name,
                        }
                      ).then(() =>
                        setStaffInputs((prev) => ({ ...prev, [addr]: "" }))
                      );
                    }}
                  >
                    <Text fontSize="xs" color="#acacac" mb={2}>
                      Cấp quyền nhân viên soát vé (setStaff)
                    </Text>
                    <HStack spacing={2}>
                      <Input
                        type="text"
                        size="sm"
                        h="40px"
                        placeholder="Địa chỉ ví nhân viên (0x...)"
                        value={staffInputs[addr] || ""}
                        onChange={(e) =>
                          setStaffInputs((prev) => ({
                            ...prev,
                            [addr]: e.target.value,
                          }))
                        }
                        bg="#141414"
                        border="1px solid"
                        borderColor="#202020"
                        borderRadius="12px"
                        color="#ffffff"
                        fontFamily="mono"
                        fontSize="xs"
                        _placeholder={{ color: "#64748B" }}
                        _focus={{ borderColor: "#83c3ff", boxShadow: "none" }}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        h="40px"
                        px={4}
                        flexShrink={0}
                        bg="#141414"
                        color="#83c3ff"
                        border="1px solid"
                        borderColor="#202020"
                        borderRadius="12px"
                        isDisabled={!isValidStaffAddr || !!txBeingSent}
                        _hover={{ borderColor: "#83c3ff" }}
                      >
                        Cấp quyền Staff
                      </Button>
                    </HStack>
                  </Box>

                  {/* Withdraw revenue */}
                  <Button
                    h="42px"
                    bg={eventItem.revenue.isZero() ? "#141414" : "#10B981"}
                    color={eventItem.revenue.isZero() ? "#acacac" : "#000000"}
                    fontWeight="700"
                    borderRadius="12px"
                    border={
                      eventItem.revenue.isZero() ? "1px solid #202020" : "none"
                    }
                    isDisabled={eventItem.revenue.isZero() || !!txBeingSent}
                    _hover={
                      eventItem.revenue.isZero() ? undefined : { bg: "#34D399" }
                    }
                    onClick={() =>
                      runContractTx(() => eventItem.contract.withdrawRevenue(), {
                        title: "Rút doanh thu thành công",
                        message: `${eventItem.revenueEth} ETH đã được chuyển về ví Ban tổ chức.`,
                        eventName: eventItem.name,
                      })
                    }
                  >
                    Rút doanh thu ({eventItem.revenueEth} ETH)
                  </Button>
                </VStack>
              </Box>
            );
          })}
        </SimpleGrid>
      )}
    </Box>
  );
}
