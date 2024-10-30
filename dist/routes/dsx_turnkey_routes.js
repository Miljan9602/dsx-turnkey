"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dsx_turnkey_router = void 0;
const dsx_turnkey_controller_1 = require("../controllers/dsx_turnkey_controller");
const express_1 = __importDefault(require("express"));
const dsx_turnkey_router = express_1.default.Router();
exports.dsx_turnkey_router = dsx_turnkey_router;
dsx_turnkey_router.get("/suborg", dsx_turnkey_controller_1.dsx_turnkey_controller);
