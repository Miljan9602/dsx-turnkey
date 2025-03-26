import express from "express";
import {dsx_turnkey_router} from "./routes";
import cors from "cors";
import {config} from "dotenv";

config()

var Bugsnag = require('@bugsnag/js')
Bugsnag.start({ apiKey: '9ee2f1e3f90758708689f006322cf3c5' })

const app = express();
app.use(express.json());
app.use(cors())


app.use("/api/v1/", dsx_turnkey_router);

app.listen(process.env.PORT || 3002, () => {
    console.log(`🚀  Running on the ${process.env.PORT || 3002} port.`);
});
