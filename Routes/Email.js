import { Router } from "express";
import { RecentEmail } from "../controller/EmailController.js";

const emailRouter = Router();

emailRouter.get("/recent-emails", RecentEmail);

export default emailRouter;
