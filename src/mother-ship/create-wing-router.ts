import * as fs from "fs";

import { Router, json } from "express";
import { HooksManager } from "./hooks-manager";

import * as t from "io-ts";
import * as Either from "fp-ts/lib/Either";
import { decodeConfig } from "./decode-config";

const CreateWingDTO = t.type({
    name: t.union([t.string, t.undefined]),
    port: t.number,
    cwd: t.string,
    config: t.string
})

const nameFromPath = (path: string) => {
    return "keka"
}

export const createWingRouter = (manager: HooksManager) => {
    const router = Router();

    router.use("/start", json());

    router.post("/start", (req, res) => {
        console.log("NEW_WING", req.body);
        const validation = CreateWingDTO.decode(req.body);
        if(Either.isLeft(validation)) return res.status(400).send("Incorrect data format");

        const data = validation.right;

        let name: string;
        if(data.name) {
            if(!manager.isNameFree(data.name)) {
                res.write(JSON.stringify({ type: 'error', message: `Name ${data.name} is already in use` }));
                res.end();
                return;
            }
            name = data.name;
        } else {
            name = nameFromPath(data.config);

            if(!manager.isNameFree(name)) {
                let index = 1;
                while(!manager.isNameFree(`${name}-${index}`)) {
                    console.log(index)
                    index++;
                }
                name = `${name}-${index}`;
            }
        }

        if(!manager.isPortFree(data.port)) {
            res.write(JSON.stringify({ type: 'error', message: `Port ${data.port} is already in use` }));
            res.end();
            return;
        }

        const configFile = fs.readFileSync(data.config).toString();
        const configValidation = decodeConfig(JSON.parse(configFile));
        if(Either.isLeft(configValidation)) {
            res.write(JSON.stringify({ type: 'error', message: `Config format miss-match` }));
            res.end();
            return;
        }


        res.write(JSON.stringify({ type: 'info', message: `Launching new wing:` }))
        res.write(JSON.stringify({ type: 'info', message: `  Name: ${name}` }))
        res.write(JSON.stringify({ type: 'info', message: `  Port: "${data.port}"` }))
        res.write(JSON.stringify({ type: 'info', message: `  Config: "${data.config}"` }))
        res.write(JSON.stringify({ type: 'error', message: `No hangar found` }))
        res.end()
    })

    return router;
}
