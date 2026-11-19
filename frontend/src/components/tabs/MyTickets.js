import React from "react";
import { Heading, Text, SimpleGrid, Box, Badge, HStack, TabPanel } from "@chakra-ui/react";

export class MyTickets extends React.Component {
  render() {
    const ownedEvents = (this.props.state.events || []).filter(
      (eventItem) => eventItem.myTickets && eventItem.myTickets.length > 0
    );

    return (
      <TabPanel mt="15px" mb="15px" align="center">
        <Heading mb="25px">My Tickets</Heading>
        <SimpleGrid columns={3} spacing={8} mt="30px">
          {ownedEvents.map((eventItem) =>
            eventItem.myTickets.map((ticket) => (
              <Box
                key={`${eventItem.contractAddress}-${ticket.ticketID}`}
                borderRadius="5px"
                border="1px solid"
                borderColor="gray.200"
                p="20px"
                width="20rem"
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
              </Box>
            ))
          )}
        </SimpleGrid>
      </TabPanel>
    );
  }
}
