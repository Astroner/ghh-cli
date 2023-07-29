import { AddressInfo } from "net";

import * as express from "express";

const app = express();

app.get("/ping", (_, res) => res.send("pong"));

app.post("/down", (_, res) => {
    res.send();

    process.exit();
})

const server = app.listen(() => {
    const addr = server.address() as AddressInfo;

    console.log(`Starting on port ${addr.port} with PID ${process.pid}`)

    process.send && process.send(addr.port)
});