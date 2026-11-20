import React, { useCallback, useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from "@chakra-ui/react";

import EventArtifact from "../contracts/Event.json";
import EventCreatorArtifact from "../contracts/EventCreator.json";
import contractAddress from "../contracts/contract-address.json";

import { TransactionErrorMessage } from "./error_handling/TransactionErrorMessage";
import { WaitingForTransactionMessage } from "./error_handling/WaitingForTransactionMessage";
import { NetworkErrorMessage } from "./error_handling/NetworkErrorMessage";
import { TxSuccessModal } from "./TxSuccessModal";

import { BuyTickets } from "./tabs/BuyTickets";
import { MyTickets } from "./tabs/MyTickets";
import { EntryGate } from "./tabs/EntryGate";
import { CreateEvent } from "./tabs/CreateEvent";
import { MyEvents } from "./tabs/MyEvents";

const HARDHAT_NETWORK_ID = "31337";
const HARDHAT_CHAIN_HEX = "0x7a69";
const LOCAL_RPC_URL = "http://127.0.0.1:8545";

function getRpcErrorMessage(error) {
  if (error?.code === 4001 || error?.code === "ACTION_REJECTED") {
    return "Bạn đã từ chối yêu cầu trên MetaMask.";
  }
  if (error?.reason) {
    return String(error.reason);
  }
  if (error?.data?.message) {
    return String(error.data.message);
  }
  if (error?.message) {
    return String(error.message);
  }
  return "Đã xảy ra lỗi không xác định.";
}

function shortenAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function Dapp() {
  const [selectedAddress, setSelectedAddress] = useState(undefined);
  const [balance, setBalance] = useState(undefined);
  const [txBeingSent, setTxBeingSent] = useState(undefined);
  const [transactionError, setTransactionError] = useState(undefined);
  const [networkError, setNetworkError] = useState(undefined);
  const [rpcConnected, setRpcConnected] = useState(false);
  const [rpcError, setRpcError] = useState("");
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [eventCreator, setEventCreator] = useState(null);
  const [pendingPurchase, setPendingPurchase] = useState(null);
  const [txSuccess, setTxSuccess] = useState(null);

  const providerRef = useRef(null);
  const eventCreatorRef = useRef(null);
  const selectedAddressRef = useRef(undefined);
  const eventsRequestIdRef = useRef(0);

  const dismissTransactionError = useCallback(() => {
    setTransactionError(undefined);
  }, []);

  const dismissNetworkError = useCallback(() => {
    setNetworkError(undefined);
  }, []);

  const updateBalance = useCallback(async (addressOverride, providerOverride) => {
    const addr = addressOverride || selectedAddressRef.current;
    const provider = providerOverride || providerRef.current;
    if (!provider || !addr) return;

    const rawBalance = await provider.getBalance(addr);
    if (selectedAddressRef.current !== addr) return;
    setBalance(Number(ethers.utils.formatEther(rawBalance)).toFixed(4));
  }, []);

  const getEventsData = useCallback(
    async (addressOverride, providerOverride, creatorOverride) => {
      const addr =
        addressOverride !== undefined
          ? addressOverride
          : selectedAddressRef.current;
      const provider = providerOverride || providerRef.current;
      const creator = creatorOverride || eventCreatorRef.current;
      if (!creator || !provider) {
        return;
      }

      const requestId = ++eventsRequestIdRef.current;
      try {
        const eventAddresses = await creator.getEvents();
        const contractRunner = addr ? provider.getSigner(0) : provider;
        const currentUser = addr ? addr.toLowerCase() : null;
        const eventsData = [];

        for (let i = 0; i < eventAddresses.length; i++) {
          const eventAddr = eventAddresses[i];
          const thisEvent = new ethers.Contract(
            eventAddr,
            EventArtifact.abi,
            contractRunner
          );

          const [
            owner,
            name,
            symbol,
            numTicketsBN,
            numTicketsLeftBN,
            totalMintedBN,
            price,
            stage,
            revenue,
          ] = await Promise.all([
            thisEvent.owner(),
            thisEvent.name(),
            thisEvent.symbol(),
            thisEvent.numTickets(),
            thisEvent.numTicketsLeft(),
            thisEvent.totalMinted(),
            thisEvent.price(),
            thisEvent.stage(),
            provider.getBalance(eventAddr),
          ]);

          const totalMinted = totalMintedBN.toNumber();
          const myTickets = [];
          const myTicketsID = [];
          let myTicketsNum = 0;

          if (currentUser) {
            const balanceBN = await thisEvent.balanceOf(addr);
            myTicketsNum = balanceBN.toNumber();

            for (let j = 0; j < totalMinted; j++) {
              try {
                const ticketOwner = await thisEvent.ownerOf(j);
                if (ticketOwner.toLowerCase() === currentUser) {
                  const used = await thisEvent.isUsed(j);
                  myTickets.push({ ticketID: j, isUsed: used });
                  myTicketsID.push(j);
                }
              } catch {
                // Skip non-existent token IDs
              }
            }
          }

          eventsData.push({
            contract: thisEvent,
            contractAddress: eventAddr,
            owner,
            name,
            symbol,
            numTickets: numTicketsBN.toNumber(),
            numTicketsLeft: numTicketsLeftBN.toNumber(),
            totalMinted,
            price,
            priceEth: ethers.utils.formatEther(price),
            stage: Number(stage),
            revenue,
            revenueEth: ethers.utils.formatEther(revenue),
            myTicketsNum,
            myTicketsID,
            myTickets,
          });
        }

        if (
          requestId === eventsRequestIdRef.current &&
          selectedAddressRef.current === addr
        ) {
          setEvents(eventsData);
          setRpcConnected(true);
          setRpcError("");
          setEventsLoading(false);
        }
      } catch (err) {
        if (requestId === eventsRequestIdRef.current) {
          setRpcConnected(false);
          setRpcError(
            "Không thể kết nối Hardhat Local (http://127.0.0.1:8545). Hãy đảm bảo đã chạy `npx hardhat node` và `scripts/deploy.js`."
          );
          setEventsLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    selectedAddressRef.current = selectedAddress;
    setEventsLoading(true);

    if (!selectedAddress) {
      const readProvider = new ethers.providers.JsonRpcProvider(LOCAL_RPC_URL);
      const readCreator = new ethers.Contract(
        contractAddress.EventCreator,
        EventCreatorArtifact.abi,
        readProvider
      );

      providerRef.current = readProvider;
      eventCreatorRef.current = readCreator;
      setEventCreator(readCreator);
      setBalance(undefined);

      getEventsData(undefined, readProvider, readCreator);

      return () => {
        eventsRequestIdRef.current += 1;
      };
    }

    const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
    const signerCreator = new ethers.Contract(
      contractAddress.EventCreator,
      EventCreatorArtifact.abi,
      web3Provider.getSigner(0)
    );

    providerRef.current = web3Provider;
    eventCreatorRef.current = signerCreator;
    setEventCreator(signerCreator);

    updateBalance(selectedAddress, web3Provider).catch(() => {});
    getEventsData(selectedAddress, web3Provider, signerCreator);

    const pollInterval = setInterval(() => {
      updateBalance(selectedAddress, web3Provider).catch(() => {});
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      eventsRequestIdRef.current += 1;
    };
  }, [selectedAddress, updateBalance, getEventsData]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) {
      return undefined;
    }

    const handleAccountsChanged = (accounts) => {
      const nextAddress = accounts && accounts[0];
      if (!nextAddress) {
        eventsRequestIdRef.current += 1;
        selectedAddressRef.current = undefined;
        setSelectedAddress(undefined);
        setBalance(undefined);
        setTxBeingSent(undefined);
        setTransactionError(undefined);
        setPendingPurchase(null);
        return;
      }
      setSelectedAddress(nextAddress);
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  async function ensureLocalNetwork() {
    const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
    if (
      (chainIdHex && chainIdHex.toLowerCase() !== HARDHAT_CHAIN_HEX) ||
      (window.ethereum.networkVersion &&
        window.ethereum.networkVersion !== HARDHAT_NETWORK_ID)
    ) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: HARDHAT_CHAIN_HEX }],
        });
      } catch (switchError) {
        if (switchError?.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: HARDHAT_CHAIN_HEX,
                chainName: "Localhost 8545",
                rpcUrls: [LOCAL_RPC_URL],
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              },
            ],
          });
        } else {
          throw switchError;
        }
      }
    }
  }

  async function connectWallet() {
    if (typeof window === "undefined" || window.ethereum === undefined) {
      setNetworkError(
        "Chưa phát hiện ví MetaMask trên trình duyệt. Hãy cài extension MetaMask (metamask.io/download) rồi tải lại trang."
      );
      return null;
    }

    try {
      setNetworkError(undefined);
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const address = accounts && accounts[0];
      if (!address) return null;

      await ensureLocalNetwork();
      setSelectedAddress(address);
      return address;
    } catch (error) {
      setNetworkError(getRpcErrorMessage(error));
      return null;
    }
  }

  function getSignerEventContract(eventAddr) {
    const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
    return new ethers.Contract(
      eventAddr,
      EventArtifact.abi,
      web3Provider.getSigner(0)
    );
  }

  function handleSelectPurchase(eventItem) {
    setPendingPurchase({
      contractAddress: eventItem.contractAddress,
      name: eventItem.name,
      symbol: eventItem.symbol,
      price: eventItem.price,
      priceEth: eventItem.priceEth,
      numTicketsLeft: eventItem.numTicketsLeft,
    });
    setActiveTab(1);
  }

  const navTabs = [
    { label: "Khám phá sự kiện" },
    { label: "Vé của tôi", hasPending: !!pendingPurchase },
    { label: "Soát vé (Gate)" },
    { label: "Ban tổ chức" },
  ];

  return (
    <Box minH="100vh" bg="#000000" color="#ffffff">
      <Tabs
        index={activeTab}
        onChange={setActiveTab}
        variant="unstyled"
        isLazy={false}
      >
        {/* Sticky OpenSea Dark Navbar */}
        <Box
          as="header"
          position="sticky"
          top={0}
          zIndex={100}
          bg="rgba(0, 0, 0, 0.85)"
          backdropFilter="blur(12px)"
          borderBottom="1px solid"
          borderColor="#202020"
        >
          <Container maxW="1240px" py={3.5}>
            <Flex
              align="center"
              justify="space-between"
              gap={4}
              wrap={{ base: "wrap", lg: "nowrap" }}
            >
              {/* Left: Brand + Local Network status */}
              <HStack spacing={3}>
                <Text
                  fontSize="xl"
                  fontWeight="700"
                  letterSpacing="-0.02em"
                  color="#ffffff"
                  cursor="pointer"
                  onClick={() => setActiveTab(0)}
                >
                  NFT
                  <Text as="span" color="#83c3ff">
                    ix
                  </Text>
                </Text>
                <HStack
                  spacing={2}
                  px={2.5}
                  py={1}
                  bg="#0c0c0c"
                  border="1px solid"
                  borderColor="#202020"
                  borderRadius="9999px"
                >
                  <Box
                    w="8px"
                    h="8px"
                    borderRadius="9999px"
                    bg={rpcConnected ? "#10B981" : "#F43F5E"}
                    boxShadow={
                      rpcConnected
                        ? "0 0 8px rgba(16, 185, 129, 0.8)"
                        : "0 0 8px rgba(244, 63, 94, 0.8)"
                    }
                  />
                  <Text fontSize="xs" fontFamily="mono" color="#acacac">
                    Localhost:8545
                  </Text>
                </HStack>
              </HStack>

              {/* Center: 4 Navigation Tabs */}
              <TabList
                gap={1}
                p={1}
                bg="#0c0c0c"
                border="1px solid"
                borderColor="#202020"
                borderRadius="12px"
                order={{ base: 3, lg: 2 }}
                w={{ base: "full", lg: "auto" }}
                overflowX="auto"
              >
                {navTabs.map((item) => (
                  <Tab
                    key={item.label}
                    px={3.5}
                    py={2}
                    fontSize="sm"
                    fontWeight="600"
                    color="#acacac"
                    borderRadius="10px"
                    whiteSpace="nowrap"
                    transition="all 250ms cubic-bezier(0.16, 1, 0.3, 1)"
                    _hover={{ color: "#ffffff", bg: "#141414" }}
                    _selected={{
                      color: "#000000",
                      bg: "#83c3ff",
                    }}
                  >
                    <HStack spacing={2}>
                      <Text>{item.label}</Text>
                      {item.hasPending && (
                        <Box
                          w="7px"
                          h="7px"
                          borderRadius="9999px"
                          bg="#10B981"
                        />
                      )}
                    </HStack>
                  </Tab>
                ))}
              </TabList>

              {/* Right: Wallet Action / Pill */}
              <Box order={{ base: 2, lg: 3 }}>
                {!selectedAddress ? (
                  <Button
                    bg="#83c3ff"
                    color="#000000"
                    fontWeight="700"
                    fontSize="sm"
                    px={5}
                    h="40px"
                    borderRadius="12px"
                    transition="all 250ms cubic-bezier(0.16, 1, 0.3, 1)"
                    _hover={{ bg: "#a2d3ff", transform: "translateY(-1px)" }}
                    onClick={connectWallet}
                  >
                    Connect Wallet
                  </Button>
                ) : (
                  <HStack
                    spacing={2.5}
                    px={3.5}
                    h="40px"
                    bg="#141414"
                    border="1px solid"
                    borderColor="#202020"
                    borderRadius="9999px"
                  >
                    <Box
                      w="8px"
                      h="8px"
                      borderRadius="9999px"
                      bg="#10B981"
                    />
                    <Text fontFamily="mono" fontSize="xs" color="#ffffff">
                      {shortenAddress(selectedAddress)}
                    </Text>
                    {balance !== undefined && (
                      <Badge
                        px={2}
                        py={0.5}
                        borderRadius="9999px"
                        bg="#0c0c0c"
                        border="1px solid"
                        borderColor="#202020"
                        color="#83c3ff"
                        fontFamily="mono"
                        fontSize="xs"
                        textTransform="none"
                      >
                        {balance} ETH
                      </Badge>
                    )}
                  </HStack>
                )}
              </Box>
            </Flex>
          </Container>
        </Box>

        {/* Main Content */}
        <Container maxW="1240px" py={8}>
          {networkError && (
            <NetworkErrorMessage
              message={networkError}
              dismiss={dismissNetworkError}
            />
          )}
          {rpcError && (
            <NetworkErrorMessage
              message={rpcError}
              dismiss={() => setRpcError("")}
            />
          )}
          {txBeingSent && (
            <WaitingForTransactionMessage txHash={txBeingSent} />
          )}
          {transactionError && (
            <TransactionErrorMessage
              message={getRpcErrorMessage(transactionError)}
              dismiss={dismissTransactionError}
            />
          )}

          <TabPanels>
            {/* Screen 1: Khám phá sự kiện */}
            <BuyTickets
              events={events}
              eventsLoading={eventsLoading}
              selectedAddress={selectedAddress}
              txBeingSent={txBeingSent}
              connectWallet={connectWallet}
              onSelectPurchase={handleSelectPurchase}
              onGoToOrganizer={() => setActiveTab(3)}
            />

            {/* Screen 2: Vé của tôi */}
            <MyTickets
              isActive={activeTab === 1}
              events={events}
              selectedAddress={selectedAddress}
              pendingPurchase={pendingPurchase}
              onClearPendingPurchase={() => setPendingPurchase(null)}
              txBeingSent={txBeingSent}
              setTxBeingSent={setTxBeingSent}
              setTransactionError={setTransactionError}
              dismissTransactionError={dismissTransactionError}
              updateBalance={updateBalance}
              getEventsData={getEventsData}
              getSignerEventContract={getSignerEventContract}
              connectWallet={connectWallet}
              onTxSuccess={setTxSuccess}
            />

            {/* Screen 3: Soát vé (Gate) */}
            <EntryGate
              isActive={activeTab === 2}
              events={events}
              selectedAddress={selectedAddress}
              txBeingSent={txBeingSent}
              setTxBeingSent={setTxBeingSent}
              dismissTransactionError={dismissTransactionError}
              updateBalance={updateBalance}
              getEventsData={getEventsData}
              connectWallet={connectWallet}
            />

            {/* Screen 4: Ban tổ chức */}
            <TabPanel p={0}>
              {!selectedAddress ? (
                <Box
                  maxW="520px"
                  mx="auto"
                  mt={8}
                  p={8}
                  bg="#0c0c0c"
                  border="1px solid"
                  borderColor="#202020"
                  borderRadius="16px"
                  textAlign="center"
                >
                  <Text fontSize="xl" fontWeight="700" mb={2}>
                    Khu vực Ban tổ chức
                  </Text>
                  <Text fontSize="sm" color="#acacac" mb={6}>
                    Kết nối ví MetaMask của bạn để tạo sự kiện mới, mở bán vé,
                    cấp quyền nhân viên soát vé và rút doanh thu.
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
                <Box>
                  <CreateEvent
                    eventCreator={eventCreator}
                    txBeingSent={txBeingSent}
                    setTxBeingSent={setTxBeingSent}
                    setTransactionError={setTransactionError}
                    dismissTransactionError={dismissTransactionError}
                    updateBalance={updateBalance}
                    getEventsData={getEventsData}
                    onTxSuccess={setTxSuccess}
                  />
                  <Box mt={10}>
                    <MyEvents
                      events={events}
                      selectedAddress={selectedAddress}
                      txBeingSent={txBeingSent}
                      setTxBeingSent={setTxBeingSent}
                      setTransactionError={setTransactionError}
                      dismissTransactionError={dismissTransactionError}
                      updateBalance={updateBalance}
                      getEventsData={getEventsData}
                      onTxSuccess={setTxSuccess}
                    />
                  </Box>
                </Box>
              )}
            </TabPanel>
          </TabPanels>
        </Container>
      </Tabs>

      <TxSuccessModal
        isOpen={!!txSuccess}
        onClose={() => setTxSuccess(null)}
        title={txSuccess?.title}
        message={txSuccess?.message}
        eventName={txSuccess?.eventName}
        tokenId={txSuccess?.tokenId}
        txHash={txSuccess?.txHash}
      />
    </Box>
  );
}
