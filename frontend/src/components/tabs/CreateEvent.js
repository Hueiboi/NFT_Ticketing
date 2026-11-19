import React from "react";
import { ethers } from "ethers";
import { Heading, Button, Input, Stack, TabPanel } from "@chakra-ui/react";

const ERROR_CODE_TX_REJECTED_BY_USER = 4001;

export class CreateEvent extends React.Component {
  async createEvent(numTickets, priceEth, name, symbol) {
    try {
      this.props.dismissTransactionError();
      const priceWei = ethers.utils.parseEther(String(priceEth || "0"));
      const tx = await this.props.eventCreator.createEvent(
        parseInt(numTickets, 10),
        priceWei,
        name,
        symbol
      );
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
    return (
      <TabPanel mt="15px" mb="15px" align="center">
        <Stack width="600px" align="center" justify="center">
          <Heading mb="25px">Create an Event</Heading>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              this.createEvent(
                this.props.state.formNumTickets,
                this.props.state.formPrice,
                this.props.state.formEventName,
                this.props.state.formEventSymbol
              );
            }}
          >
            <Input
              isRequired
              id="name"
              type="text"
              size="md"
              placeholder="Event name"
              value={this.props.state.formEventName}
              onChange={(e) => this.props.setState({ formEventName: e.target.value })}
              mb="10px"
              _placeholder={{ color: "gray.500" }}
              w="450px"
            />
            <Input
              isRequired
              id="symbol"
              type="text"
              size="md"
              placeholder="Token symbol"
              value={this.props.state.formEventSymbol}
              onChange={(e) => this.props.setState({ formEventSymbol: e.target.value })}
              mb="10px"
              _placeholder={{ color: "gray.500" }}
              w="450px"
            />
            <Input
              isRequired
              id="numTickets"
              type="number"
              min="1"
              size="md"
              placeholder="Number of Tickets"
              value={this.props.state.formNumTickets}
              onChange={(e) => this.props.setState({ formNumTickets: e.target.value })}
              mb="10px"
              _placeholder={{ color: "gray.500" }}
              w="450px"
            />
            <Input
              isRequired
              id="price"
              type="number"
              step="any"
              min="0"
              size="md"
              placeholder="Price (ETH)"
              value={this.props.state.formPrice}
              onChange={(e) => this.props.setState({ formPrice: e.target.value })}
              mb="10px"
              _placeholder={{ color: "gray.500" }}
              w="450px"
            />
            <Button
              type="submit"
              color={this.props.state.darkGreen}
              backgroundColor={this.props.state.lightGreen}
              size="lg"
              mt="10px"
            >
              CREATE EVENT
            </Button>
          </form>
        </Stack>
      </TabPanel>
    );
  }
}
