import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import scoresRouter from "./scores";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(scoresRouter);

export default router;
