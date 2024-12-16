import Express from "express";
import cors from "cors";
import morgan from "morgan";
import "dotenv/config";
import colors from "colors";
import authRouter from "./Routes/Auth.js";
import emailRouter from "./Routes/Email.js";
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

app.use("/nylas/email", emailRouter);

// Route to initialize authentication
app.use("/nylas/auth", authRouter);

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  console.log("Home Route".blue);
  res.send("Hello World");
});

app.use("/oauth", authRouter);

app.listen(PORT, () => {
  console.log("Server is running on port 3000".green.bold);
});
