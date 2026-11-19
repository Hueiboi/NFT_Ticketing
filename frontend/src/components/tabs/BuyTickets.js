import React from "react";
import { Heading, Button, Text, SimpleGrid, Box, TabPanel } from "@chakra-ui/react";

const ERROR_CODE_TX_REJECTED_BY_USER = 4001;
const STAGE_LABELS = ["Prep", "Active", "CheckinOpen", "Closed"];

export class BuyTickets extends React.Component {
  async buyTicket(eventItem) {
    try {
      this.props.dismissTransactionError();
      const tx = await eventItem.contract.buyTicket({ value: eventItem.price });
      this.props.setState({ txBeingSent: tx.hash });
      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }

      await this.props.updateBalance();
      await this.props.getEventsData();
    } catch (error) {
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }
      this.props.setState({ transactionError: error });
    } finally {
      this.props.setState({ txBeingSent: undefined });
    }
  }

  render() {
    const activeEvents = (this.props.state.events || []).filter((e) => e.stage === 1);

    return (
      <TabPanel mt="15px" mb="15px" align="center">
        <Heading mb="25px">Purchase Tickets</Heading>
        <SimpleGrid columns={3} spacing={8} mt="30px">
          {activeEvents.map((eventItem) => (
            <Box
              key={eventItem.contractAddress}
              borderRadius="5px"
              border="1px solid"
              borderColor="gray.200"
              p="20px"
              width="20rem"
            >
              <Text isTruncated fontWeight="bold" fontSize="xl" mb="7px">
                {eventItem.name}
              </Text>
              <Text>Symbol: {eventItem.symbol}</Text>
              <Text>Tickets Left: {eventItem.numTicketsLeft}</Text>
              <Text>Price: {eventItem.priceEth} ETH</Text>
              <Text>Stage: {STAGE_LABELS[eventItem.stage] || eventItem.stage}</Text>
              <Button
                type="button"
                color={this.props.state.darkGreen}
                backgroundColor={this.props.state.lightGreen}
                size="lg"
                mt="13px"
                isDisabled={eventItem.numTicketsLeft === 0}
                onClick={() => this.buyTicket(eventItem)}
              >
                Buy Ticket
              </Button>
            </Box>
          ))}
        </SimpleGrid>
      </TabPanel>
    );
  }
}
