import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chipShopsRouter from "./chipshops";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chipShopsRouter);

export default router;
