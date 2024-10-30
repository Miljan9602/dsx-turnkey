import {dsx_turnkey_controller} from "../controllers/dsx_turnkey_controller";

import express from "express";

const dsx_turnkey_router = express.Router();

dsx_turnkey_router.post("/suborg", dsx_turnkey_controller);

export {dsx_turnkey_router};
