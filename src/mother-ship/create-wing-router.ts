import * as fs from "fs";
import * as path from "path";

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

const nameFromPath = (configPath: string) => {
    const filename = path.basename(configPath);

    return filename.slice(0, filename.lastIndexOf("."))
}

const asInfo = (message: string) => JSON.stringify({ type: 'info', message });
const asError = (message: string) => JSON.stringify({ type: 'error', message });

export const createWingRouter = (manager: HooksManager) => {
    const router = Router();

    router.use("/start", json());

    router.post("/start", async (req, res) => {
        const validation = CreateWingDTO.decode(req.body);
        if(Either.isLeft(validation)) return res.status(400).send("Incorrect data format");

        const data = validation.right;

        let name: string;
        if(data.name) {
            if(!manager.isNameFree(data.name)) {
                res.write(asError(`Name ${data.name} is already in use`));
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
            res.write(asError(`Port ${data.port} is already in use`));
            res.end();
            return;
        }

        const configFile = fs.readFileSync(data.config).toString();
        const configValidation = decodeConfig(JSON.parse(configFile));
        if(Either.isLeft(configValidation)) {
            res.write(asError(`Config format miss-match`));
            res.end();
            return;
        }


        res.write(asInfo(`Launching new wing:`))
        res.write(asInfo(`  Name  : "${name}"`))
        res.write(asInfo(`  Port  : ${data.port}`))
        res.write(asInfo(`  Config: "${data.config}"`))

        try {
            const childData = await manager.start(
                name,
                data.port,
                data.cwd,
                path.resolve(process.cwd(), `${name}-logs.txt`),
                configValidation.right
            )
            
            console.log("NEW_WING_SPAWNED", {
                ...data,
                ...childData,
                name,
            });

            res.write(asInfo(`Launched with PID ${childData.pid}`))
        } catch(e) {
            console.log("FAILED_TO_SPAWN", e + "");
            res.write(asError(e + ""))
        }

        res.end()
    })

    router.post("/stop/:name", async (req, res) => {
        if(manager.isNameFree(req.params.name)) {
            res.write(asError(`Wing with name "${req.params.name}" doesn't exist`));
            res.end();
            return;
        }

        res.write(asInfo(`Landing wing "${req.params.name}"`));

        try {
            await manager.stop(req.params.name);
            console.log("WING_LANDED", req.params.name);
            res.write(asInfo(`Landed successfully`));
        } catch(e) {
            res.write(asError(`Failed to land the wing: \n${e}`));
        }

        res.end();
    })

    return router;
}
