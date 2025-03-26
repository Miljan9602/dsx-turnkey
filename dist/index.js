"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const routes_1 = require("./routes");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
var Bugsnag = require('@bugsnag/js');
Bugsnag.start({ apiKey: '9ee2f1e3f90758708689f006322cf3c5' });
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.use("/api/v1/", routes_1.dsx_turnkey_router);
app.listen(process.env.PORT || 3002, () => {
    console.log(`🚀  Running on the ${process.env.PORT || 3002} port.`);
});
