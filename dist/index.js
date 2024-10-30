"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = require("dotenv");
const routes_1 = require("./routes");
const app = (0, express_1.default)();
app.use(express_1.default.json());
(0, dotenv_1.config)();
app.use("/api/v1/", routes_1.dsx_turnkey_router);
app.listen(process.env.PORT || 3002, () => {
    console.log(`🚀  Running on the ${process.env.PORT || 3002} port.`);
});
