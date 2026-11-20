import React from "react";
import { Heading, Text, SimpleGrid, Box, Badge, Button, HStack, TabPanel } from "@chakra-ui/react";
import { TicketQrModal } from "../TicketQrModal";

export class MyTickets extends React.Component {
  state = { selectedTicket: null };

  componentDidUpdate(prevProps) {
    if (prevProps.state.selectedAddress !== this.props.state.selectedAddress ||
        (prevProps.isActive && !this.props.isActive)) {
      this.setState({ selectedTicket: null });
    }
  }

  render() {
    const ownedEvents = (this.props.state.events || []).filter(
      (eventItem) => eventItem.myTickets && eventItem.myTickets.length > 0
    );
    const selection = this.state.selectedTicket;
    const selectedEvent = selection && ownedEvents.find((item) => item.contractAddress === selection.address);
    const selectedTicket = selectedEvent?.myTickets.find((item) => item.ticketID === selection.ticketID && !item.isUsed);

    return (
      <TabPanel mt="15px" mb="15px" align="center">
        <Heading mb="25px">My Tickets</Heading>
        {ownedEvents.length === 0 && <Text color="gray.500">Bạn chưa sở hữu vé nào.</Text>}
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={8} mt="30px">
          {ownedEvents.map((eventItem) =>
            eventItem.myTickets.map((ticket) => (
              <Box
                key={`${eventItem.contractAddress}-${ticket.ticketID}`}
                borderRadius="5px"
                border="1px solid"
                borderColor="gray.200"
                p="20px"
                width="100%"
              >
                <Text isTruncated fontWeight="bold" fontSize="xl" mb="7px">
                  {eventItem.name} ({eventItem.symbol})
                </Text>
                <HStack justify="center" spacing={3} mb="8px">
                  <Text fontFamily="monospace">Token #{ticket.ticketID}</Text>
                  <Badge colorScheme={ticket.isUsed ? "red" : "green"}>
                    {ticket.isUsed ? "Used" : "Valid"}
                  </Badge>
                </HStack>
                <Text fontSize="xs" color="gray.500" isTruncated>
                  Contract: {eventItem.contractAddress}
                </Text>
                <Box mt={4} pt={4} borderTop="1px dashed" borderColor="gray.200">
                  <Button colorScheme="purple" isDisabled={ticket.isUsed || !!this.props.state.txBeingSent}
                    onClick={() => this.setState({ selectedTicket: { address: eventItem.contractAddress, ticketID: ticket.ticketID } })}>
                    {ticket.isUsed ? "Vé đã sử dụng" : "Lấy mã QR"}
                  </Button>
                </Box>
              </Box>
            ))
          )}
        </SimpleGrid>
        {selectedTicket && <TicketQrModal key={`${this.props.state.selectedAddress}-${selection.address}-${selection.ticketID}`}
          eventItem={selectedEvent} ticket={selectedTicket} selectedAddress={this.props.state.selectedAddress}
          onClose={() => this.setState({ selectedTicket: null })} />}
      </TabPanel>
    );
  }
}
