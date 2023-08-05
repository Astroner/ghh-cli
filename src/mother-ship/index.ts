import { AddressInfo } from "net";
import { randomBytes } from "crypto";

import * as express from "express";
import { createWingRouter } from "./create-wing-router";
import { HooksManager } from "./hooks-manager";

const app = express();

const token = process.env.TOKEN ?? randomBytes(32).toString("hex");

const manager = new HooksManager();

process.on('SIGINT', async () => {
    try {
        await manager.stopAll();
    } catch (e) {
        console.error(`Failed to stop child processes:\n${e}`);
    }
})

app.use("*", (req, res, next) => {
    if (req.headers.authorization !== token) res.status(401).send();
    else next();
});

app.get("/ping", (_, res) => res.send("pong"));

app.post("/land", async (_, res) => {
    try {
        await manager.stopAll();
    } catch(e){
        res.status(500).send(e + "");
        
        return;
    }

    res.send();

    process.exit();
});

app.use("/wing", createWingRouter(manager))

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
