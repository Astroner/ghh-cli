import { AddressInfo } from "net";
import { randomBytes } from "crypto";

import * as express from "express";
import { createWingRouter } from "./create-wing-router";
import { HooksManager } from "./hooks-manager";

const app = express();

const token = process.env.TOKEN ?? randomBytes(32).toString("hex");

app.use("*", (req, res, next) => {
    if (req.headers.authorization !== token) res.status(401).send();
    else next();
});

app.get("/ping", (_, res) => res.send("pong"));

app.post("/land", (_, res) => {
    res.send();

    process.exit();
});


app.use("/wing", createWingRouter(new HooksManager()))



const server = app.listen(process.env.PORT, () => {
    const addr = server.address() as AddressInfo;

    console.log(`Starting on port ${addr.port} with PID ${process.pid}`);

    process.send &&
        process.send({
            port: addr.port,
            pid: process.pid,
            token,
        });
});
