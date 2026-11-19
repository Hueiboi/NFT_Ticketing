import React from "react";
import { Heading, Button, Text, Input, SimpleGrid, Box, TabPanel } from "@chakra-ui/react";

const ERROR_CODE_TX_REJECTED_BY_USER = 4001;

export class EntryGate extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ticketInputs: {},
    };
  }

  async useTicket(eventItem, ticketID) {
    try {
      this.props.dismissTransactionError();
      const tx = await eventItem.contract.useTicket(parseInt(ticketID, 10));
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
    const checkinEvents = (this.props.state.events || []).filter(
      (eventItem) => eventItem.stage === 2
    );

    return (
      <TabPanel mt="15px" mb="15px" align="center">
        <Heading mb="25px">Entry Gate</Heading>
        <SimpleGrid columns={3} spacing={8} mt="30px">
          {checkinEvents.map((eventItem) => {
            const addr = eventItem.contractAddress;

            return (
              <Box
                key={addr}
                borderRadius="5px"
                border="1px solid"
                borderColor="gray.200"
                p="20px"
                width="20rem"
              >
                <Text isTruncated fontWeight="bold" fontSize="xl" mb="7px">
                  {eventItem.name}
                </Text>
                <Text>Total Minted: {eventItem.totalMinted}</Text>
                <Box
                  borderRadius="5px"
                  border="1px solid"
                  borderColor="gray.100"
                  padding="10px"
                  mt="10px"
                >
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const ticketID = this.state.ticketInputs[addr];
                      if (ticketID === undefined || ticketID === "") return;
                      this.useTicket(eventItem, ticketID);
                    }}
                  >
                    <Input
                      isRequired
                      type="number"
                      min="0"
                      size="md"
                      placeholder="Enter Token ID"
                      value={this.state.ticketInputs[addr] || ""}
                      onChange={(e) =>
                        this.setState((prev) => ({
                          ticketInputs: { ...prev.ticketInputs, [addr]: e.target.value },
                        }))
                      }
                      mt="10px"
                      _placeholder={{ color: "gray.500" }}
                    />
                    <Button
                      type="submit"
                      color={this.props.state.darkGreen}
                      backgroundColor={this.props.state.lightGreen}
                      size="lg"
                      mt="10px"
                      width="210px"
                    >
                      Use Ticket
                    </Button>
                  </form>
                </Box>
              </Box>
            );
          })}
        </SimpleGrid>
      </TabPanel>
    );
  }
}
