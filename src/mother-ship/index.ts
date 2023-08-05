import { AddressInfo } from "net";
import { randomBytes } from "crypto";

import * as express from "express";
import { createWingRouter } from "./create-wing-router";
import { HooksManager } from "./hooks-manager";
import { HooksList } from "./hooks-list";

const app = express();

const token = process.env.TOKEN ?? randomBytes(32).toString("hex");

const manager = new HooksManager();
const list = new HooksList();

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

app.use("/wing", createWingRouter(manager, list))

app.get("/list", (_, res) => res.json(list.getAll()))

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
