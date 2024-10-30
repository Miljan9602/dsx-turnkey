import express from "express";
import {config} from "dotenv";
import {dsx_turnkey_router} from "./routes";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors())


config();

app.use("/api/v1/", dsx_turnkey_router);

app.listen(process.env.PORT || 3002, () => {
    console.log(`🚀  Running on the ${process.env.PORT || 3002} port.`);
});
