import { AddressInfo } from "net";

import * as express from "express";

const app = express();

app.use("*", (req, res, next) => {
    if(req.ip !== "::1" && req.ip !== "127.0.0.1" && req.ip !== "::ffff:127.0.0.1") {
        console.log(`Request from external API: ${req.ip}`)
        res.status(404).send();
    } else {
        next();
    }
})

app.get("/ping", (_, res) => res.send("pong"));

app.post("/land", (_, res) => {
    res.send();

    process.exit();
})

const server = app.listen(() => {
    const addr = server.address() as AddressInfo;

    console.log(`Starting on port ${addr.port} with PID ${process.pid}`)

    process.send && process.send(addr.port)
});