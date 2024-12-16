import Express from "express";
import cors from "cors";
import morgan from "morgan";
import "dotenv/config";
import colors from "colors";
import Nylas from "nylas";
import authRouter from "./Routes/Auth.js";
colors.enable();
const app = Express();
app.use(
  cors({
    origin: "*",
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(Express.json());

app.use(morgan("dev"));

const nylasConfig = {
  clientId: process.env.CLIENT_ID,
  apiKey: process.env.API_KEY,
  callbackUri: process.env.CALLBACK_URL,
  apiUri: process.env.API_URI,
};

const nylasClient = new Nylas({
  apiKey: nylasConfig.apiKey,
  apiUri: nylasConfig.apiUri
});

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  console.log("Home Route".blue);
  res.send("Hello World");
});

app.use("/oauth", authRouter);

app.listen(PORT, () => {
  console.log("Server is running on port 3000".green.bold);
});
