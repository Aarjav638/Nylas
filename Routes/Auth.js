import { Router } from "express";
import { nylasConfig, nylasClient } from "../constants/nylas.js";
import fs from "fs";

const authRouter = Router();

authRouter.get("/", (req, res) => {
  const authUrl = nylasClient.auth.urlForOAuth2({
    clientId: nylasConfig.clientId, // Note this is *different* from your API key. Make sure to put these in environment variables
    redirectUri: nylasConfig.callbackUri, // URI you registered with Nylas in the previous step
  });

  // This is one way to redirect the user to the auth screen. Depending on your architecture you may want to pass
  // the url back to your frontend for redirection, that's up to you
  res.redirect(authUrl);
});

authRouter.get("/exchange", async (req, res) => {
  console.log("Received callback from Nylas".bgCyan.white);
  const code = req.query.code;

  if (!code) {
    res.status(400).send("No authorization code returned from Nylas");
    return;
  }

  try {
    const filePath = "data.json";
    const response = await nylasClient.auth.exchangeCodeForToken({
      clientSecret: nylasConfig.apiKey,
      clientId: nylasConfig.clientId, // Note this is *different* from your API key
      redirectUri: nylasConfig.callbackUri, // URI you registered with Nylas in the previous step
      code,
    });
    const { grantId, email } = response;
    console.log(response);

    // You'll use this grantId to make API calls to Nylas perform actions on
    // behalf of this account. Store this in a database, associated with a user
    console.log(response.grantId);
    const newObject = { grantId: grantId, email: email };
    let fileContent = fs.existsSync(filePath)
      ? fs.readFileSync(filePath, "utf8")
      : "[]";

    // Step 2: Parse the content as JSON
    let dataArray = JSON.parse(fileContent);

    if (!Array.isArray(dataArray)) {
      throw new Error("The file does not contain a valid JSON array.");
    }

    // Step 3: Append the new object
    const existingIndex = dataArray.findIndex((item) => item.email === email);

    if (existingIndex !== -1) {
      // Update the existing object
      dataArray[existingIndex] = newObject;
      console.log("Object updated successfully!");
    } else {
      // Append the new object
      dataArray.push(newObject);
      console.log("Object added successfully!");
    }

    // Step 4: Write the updated array back to the file
    fs.writeFileSync(filePath, JSON.stringify(dataArray, null, 2)); // Pretty-print JSON with 2 spaces

    // This depends on implementation. If the browser is hitting this endpoint
    // you probably want to use res.redirect('/some-successful-frontend-url')
    res.json({
      message: "OAuth2 flow completed successfully for grant ID: " + grantId,
    });
  } catch (error) {
    res.status(500).send("Failed to exchange authorization code for token");
  }
});

export default authRouter;
