import {
    dsx_turnkey_create_suborg,
    dsx_turnkey_get_backup_address, POST,
} from "../controllers/dsx_turnkey_controller";
import {turnkeyProxyHandler} from "../controllers/dsx_turnkey_proxy_controller";

import express from "express";

const dsx_turnkey_router = express.Router();

dsx_turnkey_router.post("/turnkey", POST);
dsx_turnkey_router.post("/suborg", dsx_turnkey_create_suborg);
dsx_turnkey_router.get("/suborg/:suborg_id/backup-address", dsx_turnkey_get_backup_address);
dsx_turnkey_router.post("/proxy", turnkeyProxyHandler);

export {dsx_turnkey_router};
