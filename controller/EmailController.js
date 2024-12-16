import axios from "axios";
import { nylasClient, nylasConfig } from "../constants/nylas.js";
import { getGrantId } from "../utils/helpers.js";

const RecentEmail = async (req, res) => {
  try {
    const grantId = await getGrantId("teamsjain@gmail.com"); // This is an example, you'll have to write this
    console.log(grantId);
    const messages = await nylasClient.messages.list({
      identifier: grantId,
      queryParams: {
        limit: 50,
      },
    });
    await ExtractData();
    res.send(messages.data[2].body);
  } catch (error) {
    console.error("Error fetching emails:", error);
  }
};

const ExtractData = async (req, res) => {
  try {
    const grantId = await getGrantId("teamsjain@gmail.com"); // This is an example, you'll have to write this
    console.log(grantId);
    const response = await axios.get(
      `https://api.us.nylas.com/v3/grants/${grantId}/consolidated-shipment`,
      {
        headers: {
          Accept: "application/json, application/gzip",
          Authorization: `Bearer ${nylasConfig.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(response.data);
  } catch (error) {
    console.error("Error fetching emails:", error);
  }
};

export { RecentEmail };
