import {dsx_turnkey_controller, dsx_turnkey_test} from "../controllers/dsx_turnkey_controller";

import express from "express";

const dsx_turnkey_router = express.Router();

dsx_turnkey_router.post("/suborg", dsx_turnkey_controller);
dsx_turnkey_router.post("/test", dsx_turnkey_test);

export {dsx_turnkey_router};
