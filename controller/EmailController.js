import { nylasClient } from "../constants/nylas.js";
import { getGrantId, processEmails, classifyEmails } from "../utils/helpers.js";

// Recent Email Controller

const RecentEmail = async (req, res) => {
  try {
    const grantId = await getGrantId("teamsjain@gmail.com");

    const messages = await nylasClient.messages.list({
      identifier: grantId,
      queryParams: {
        limit: 200,
        searchQueryNative: "insurance OR Coverage OR Premium_Amount",
      },
    });
    const filteredMessages = [];
    // const filteredMessages = await classifyEmails(messages);
    for (const message of messages.data) {
      filteredMessages.push(message);
    }

    if (filteredMessages.length > 0) {
      await processEmails(filteredMessages);
    }

    res.send({
      message: `${filteredMessages.length} email(s) processed successfully!`,
    });
  } catch (error) {
    console.error("Error processing emails:", error);
    res.status(500).send("An error occurred while processing emails.");
  }
};

export { RecentEmail };
