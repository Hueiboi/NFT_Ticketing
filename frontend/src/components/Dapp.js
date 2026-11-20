import React from "react";
import { ethers } from "ethers";

import EventArtifact from "../contracts/Event.json";
import EventCreatorArtifact from "../contracts/EventCreator.json";
import contractAddress from "../contracts/contract-address.json";

import { NoWalletDetected } from "./error_handling/NoWalletDetected";
import { ConnectWallet } from "./error_handling/ConnectWallet";
import { Loading } from "./error_handling/Loading";
import { TransactionErrorMessage } from "./error_handling/TransactionErrorMessage";
import { WaitingForTransactionMessage } from "./error_handling/WaitingForTransactionMessage";

import { CreateEvent } from "./tabs/CreateEvent.js";
import { BuyTickets } from "./tabs/BuyTickets.js";
import { MyTickets } from "./tabs/MyTickets.js";
import { MyEvents } from "./tabs/MyEvents.js";
import { EntryGate } from "./tabs/EntryGate.js";

import {
  Heading,
  Flex,
  Box,
  VStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
} from "@chakra-ui/react";

const HARDHAT_NETWORK_ID = "31337";

export class Dapp extends React.Component {
  constructor(props) {
    super(props);

    this.initialState = {
      selectedAddress: undefined,
      balance: undefined,
      txBeingSent: undefined,
      transactionError: undefined,
      networkError: undefined,
      formEventName: "",
      formEventSymbol: "",
      formNumTickets: "",
      formPrice: "",
      darkGreen: "#276749",
      lightGreen: "#C6F6DF",
      events: [],
      usedTicketID: "",
      activeTab: 0,
    };

    this.state = this.initialState;

    this.setState = this.setState.bind(this);
    this._dismissTransactionError = this._dismissTransactionError.bind(this);
    this._updateBalance = this._updateBalance.bind(this);
    this._getEventsData = this._getEventsData.bind(this);
    this._getRpcErrorMessage = this._getRpcErrorMessage.bind(this);
  }

  render() {
    if (window.ethereum === undefined) {
      return <NoWalletDetected />;
    }

    if (!this.state.selectedAddress) {
      return (
        <ConnectWallet
          connectWallet={() => this._connectWallet()}
          networkError={this.state.networkError}
          dismiss={() => this._dismissNetworkError()}
        />
      );
    }

    if (!this.state.balance) {
      return <Loading />;
    }

    return (
      <div className="container p-4">
        <div>
          <Flex w="90%" my="20px" ml="5%" mr="5%" direction="column">
            <nav className="navbar navbar-dark fixed-top bg-dark flex-md-nowrap p-0 shadow">
              <Heading ml={20} color="white">
                NFTix
              </Heading>
              <VStack spacing={2} alignItems="right">
                <Box className="navbar-brand pb-0 mb-0" justify="right">
                  Account: {this.state.selectedAddress.toString()}
                </Box>
                <Box className="navbar-brand pt-0 mt-0" justify="right">
                  Balance: {this.state.balance.toString()} ETH
                </Box>
              </VStack>
            </nav>

            <Box mt="90px">
              {this.state.txBeingSent && (
                <WaitingForTransactionMessage txHash={this.state.txBeingSent} />
              )}
              {this.state.transactionError && (
                <TransactionErrorMessage
                  message={this._getRpcErrorMessage(this.state.transactionError)}
                  dismiss={this._dismissTransactionError}
                />
              )}
            </Box>

            <Tabs
              index={this.state.activeTab}
              onChange={(activeTab) => this.setState({ activeTab })}
              mt="15px"
              p="20px"
              variant="soft-rounded"
              colorScheme="green"
              borderRadius="5px"
              border="1px solid"
              borderColor="gray.200"
            >
              <TabList>
                <Tab>Create Events</Tab>
                <Tab>Purchase Tickets</Tab>
                <Tab>My Tickets</Tab>
                <Tab>My Events</Tab>
                <Tab>Entry Gate</Tab>
              </TabList>
              <TabPanels>
                <CreateEvent
                  state={this.state}
                  setState={this.setState}
                  dismissTransactionError={this._dismissTransactionError}
                  eventCreator={this._eventCreator}
                  updateBalance={this._updateBalance}
                  getEventsData={this._getEventsData}
                />
                <BuyTickets
                  state={this.state}
                  setState={this.setState}
                  dismissTransactionError={this._dismissTransactionError}
                  eventCreator={this._eventCreator}
                  updateBalance={this._updateBalance}
                  getEventsData={this._getEventsData}
                />
                <MyTickets
                  isActive={this.state.activeTab === 2}
                  state={this.state}
                  setState={this.setState}
                  dismissTransactionError={this._dismissTransactionError}
                  eventCreator={this._eventCreator}
                  updateBalance={this._updateBalance}
                  getEventsData={this._getEventsData}
                />
                <MyEvents
                  state={this.state}
                  setState={this.setState}
                  dismissTransactionError={this._dismissTransactionError}
                  eventCreator={this._eventCreator}
                  updateBalance={this._updateBalance}
                  getEventsData={this._getEventsData}
                />
                <EntryGate
                  isActive={this.state.activeTab === 4}
                  state={this.state}
                  setState={this.setState}
                  dismissTransactionError={this._dismissTransactionError}
                  eventCreator={this._eventCreator}
                  updateBalance={this._updateBalance}
                  getEventsData={this._getEventsData}
                />
              </TabPanels>
            </Tabs>
          </Flex>
        </div>
      </div>
    );
  }

  componentWillUnmount() {
    this._stopPollingData();
  }

  async _connectWallet() {
    const [selectedAddress] = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    await this._checkNetwork();
    this._initialize(selectedAddress);

    window.ethereum.on("accountsChanged", ([newAddress]) => {
      this._stopPollingData();
      if (newAddress === undefined) {
        return this._resetState();
      }

      this._initialize(newAddress);
    });
    // Discard signed QR state and contracts when the wallet changes network.
    window.ethereum.on("chainChanged", () => window.location.reload());
  }

  _initialize(userAddress) {
    this.setState({
      selectedAddress: userAddress,
      events: [],
      balance: undefined,
    }, () => {
      this._initializeEthers();
      this._startPollingData();
    });
  }

  _initializeEthers() {
    this._provider = new ethers.providers.Web3Provider(window.ethereum);

    this._eventCreator = new ethers.Contract(
      contractAddress.EventCreator,
      EventCreatorArtifact.abi,
      this._provider.getSigner(0)
    );
  }

  _startPollingData() {
    this._pollDataInterval = setInterval(() => this._updateBalance(), 1000);
    this._updateBalance();
    this._getEventsData();
  }

  _stopPollingData() {
    clearInterval(this._pollDataInterval);
    this._pollDataInterval = undefined;
  }

  async _updateBalance() {
    if (!this._provider || !this.state.selectedAddress) return;
    const balance = ethers.utils.formatEther(
      (await this._provider.getBalance(this.state.selectedAddress)).toString()
    );
    this.setState({ balance });
  }

  _dismissTransactionError() {
    this.setState({ transactionError: undefined });
  }

  _dismissNetworkError() {
    this.setState({ networkError: undefined });
  }

  _getRpcErrorMessage(error) {
    if (error && error.reason) {
      return String(error.reason);
    }
    if (error && error.data && error.data.message) {
      return String(error.data.message);
    }
    if (error && error.message) {
      return String(error.message);
    }
    return "Unknown error";
  }

  _resetState() {
    this.setState(this.initialState);
  }

  async _switchChain() {
    const chainIdHex = `0x${parseInt(HARDHAT_NETWORK_ID, 10).toString(16)}`;
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  }

  async _checkNetwork() {
    if (window.ethereum.networkVersion !== HARDHAT_NETWORK_ID) {
      await this._switchChain();
    }
  }

  async _getEventsData() {
    if (!this._eventCreator || !this._provider || !this.state.selectedAddress) {
      return;
    }

    const selectedAddress = this.state.selectedAddress;
    const eventCreator = this._eventCreator;
    const eventAddresses = await eventCreator.getEvents();
    const signer = this._provider.getSigner(0);
    const currentUser = selectedAddress.toLowerCase();
    const eventsData = [];

    for (let i = 0; i < eventAddresses.length; i++) {
      const eventAddr = eventAddresses[i];
      const thisEvent = new ethers.Contract(eventAddr, EventArtifact.abi, signer);

      const [
        owner,
        name,
        symbol,
        numTicketsBN,
        numTicketsLeftBN,
        totalMintedBN,
        price,
        stage,
        myTicketsBN,
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
        thisEvent.balanceOf(selectedAddress),
        this._provider.getBalance(eventAddr),
      ]);

      const totalMinted = totalMintedBN.toNumber();
      const myTickets = [];
      const myTicketsID = [];

      for (let j = 0; j < totalMinted; j++) {
        try {
          const ticketOwner = await thisEvent.ownerOf(j);
          if (ticketOwner.toLowerCase() === currentUser) {
            const used = await thisEvent.isUsed(j);
            myTickets.push({ ticketID: j, isUsed: used });
            myTicketsID.push(j);
          }
        } catch (err) {
          // Skip invalid or non-existent token IDs
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
        myTicketsNum: myTicketsBN.toNumber(),
        myTicketsID,
        myTickets,
      });
    }

    if (this.state.selectedAddress === selectedAddress && this._eventCreator === eventCreator) {
      this.setState({ events: eventsData });
    }
  }
}
