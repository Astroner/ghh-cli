import { AddressInfo } from "net";

import * as express from "express";

const app = express();

app.get("/ping", (_, res) => res.send("pong"))

const server = app.listen(() => {
    const addr = server.address() as AddressInfo;

    console.log(addr.port);

    process.send && process.send({
        port: addr.port
    })
});