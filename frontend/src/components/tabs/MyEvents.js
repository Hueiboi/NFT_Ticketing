import React from "react";
import {
  Heading,
  Button,
  Text,
  Input,
  SimpleGrid,
  Box,
  Stack,
  Radio,
  RadioGroup,
  TabPanel,
} from "@chakra-ui/react";

const ERROR_CODE_TX_REJECTED_BY_USER = 4001;

export class MyEvents extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedStages: {},
      staffInputs: {},
    };
  }

  async runContractTx(txPromise) {
    try {
      this.props.dismissTransactionError();
      const tx = await txPromise();
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
    const currentUser = (this.props.state.selectedAddress || "").toLowerCase();
    const myEvents = (this.props.state.events || []).filter(
      (eventItem) => eventItem.owner.toLowerCase() === currentUser
    );

    return (
      <TabPanel mt="15px" mb="15px" align="center">
        <Heading mb="25px">My Events</Heading>
        <SimpleGrid columns={3} spacing={8} mt="30px">
          {myEvents.map((eventItem) => {
            const addr = eventItem.contractAddress;
            const currentStage =
              this.state.selectedStages[addr] !== undefined
                ? this.state.selectedStages[addr]
                : String(eventItem.stage);

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
                <Text>Revenue: {eventItem.revenueEth} ETH</Text>
                <Text>Tickets Left: {eventItem.numTicketsLeft}</Text>

                <Box
                  borderRadius="5px"
                  border="1px solid"
                  borderColor="gray.100"
                  padding="10px"
                  mt="10px"
                >
                  <RadioGroup
                    mb="10px"
                    value={currentStage}
                    onChange={(val) =>
                      this.setState((prev) => ({
                        selectedStages: { ...prev.selectedStages, [addr]: val },
                      }))
                    }
                  >
                    <Stack spacing={2} direction="column" align="start">
                      <Radio value="0">Prep</Radio>
                      <Radio value="1">Active</Radio>
                      <Radio value="2">Checkin Open</Radio>
                      <Radio value="3">Closed</Radio>
                    </Stack>
                  </RadioGroup>
                  <Button
                    type="button"
                    color={this.props.state.darkGreen}
                    backgroundColor={this.props.state.lightGreen}
                    size="md"
                    mt="10px"
                    width="210px"
                    onClick={() =>
                      this.runContractTx(() =>
                        eventItem.contract.setStage(parseInt(currentStage, 10))
                      )
                    }
                  >
                    Set Event Stage
                  </Button>
                </Box>

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
                      const staffAddr = (this.state.staffInputs[addr] || "").trim();
                      if (!staffAddr) return;
                      this.runContractTx(() => eventItem.contract.setStaff(staffAddr, true));
                    }}
                  >
                    <Input
                      isRequired
                      type="text"
                      size="sm"
                      placeholder="Staff wallet address (0x...)"
                      value={this.state.staffInputs[addr] || ""}
                      onChange={(e) =>
                        this.setState((prev) => ({
                          staffInputs: { ...prev.staffInputs, [addr]: e.target.value },
                        }))
                      }
                      mb="8px"
                    />
                    <Button
                      type="submit"
                      color={this.props.state.darkGreen}
                      backgroundColor={this.props.state.lightGreen}
                      size="md"
                      width="210px"
                    >
                      Add Check-in Staff
                    </Button>
                  </form>
                </Box>

                <Button
                  type="button"
                  color={this.props.state.darkGreen}
                  backgroundColor={this.props.state.lightGreen}
                  size="md"
                  mt="10px"
                  width="210px"
                  isDisabled={eventItem.revenue.isZero()}
                  onClick={() => this.runContractTx(() => eventItem.contract.withdrawRevenue())}
                >
                  Withdraw Revenue
                </Button>
              </Box>
            );
          })}
        </SimpleGrid>
      </TabPanel>
    );
  }
}
