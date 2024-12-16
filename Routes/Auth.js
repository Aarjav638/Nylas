import { Router } from "express";

const authRouter = Router();

authRouter.post("/exchange", (req, res) => {
    res.send("Auth Route");
    });

export default authRouter;