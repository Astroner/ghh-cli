import * as fs from "fs";
import * as path from "path";

import { Router, json } from "express";
import { HooksManager } from "./hooks-manager";

import * as t from "io-ts";
import * as Either from "fp-ts/lib/Either";
import { decodeConfig } from "./decode-config";
import { HooksList } from "./hooks-list";

const CreateWingDTO = t.type({
    name: t.union([t.string, t.undefined]),
    port: t.number,
    cwd: t.string,
    config: t.string
})

const StopWingDTO = t.type({
    name: t.string
})

const DeleteWingDTO = t.type({
    name: t.string
})

const nameFromPath = (configPath: string) => {
    const filename = path.basename(configPath);

    return filename.slice(0, filename.lastIndexOf("."))
}

const asInfo = (message: string) => JSON.stringify({ type: 'info', message });
const asError = (message: string) => JSON.stringify({ type: 'error', message });

export const createWingRouter = (manager: HooksManager, list: HooksList) => {
    const router = Router();

    router.use(json());

    router.post("/start", async (req, res) => {
        const validation = CreateWingDTO.decode(req.body);
        if(Either.isLeft(validation)) return res.status(400).send("Incorrect data format");

        const data = validation.right;

        let name: string;
        if(data.name) {
            if(!manager.isNameFree(data.name) || list.has(data.name)) {
                res.write(asError(`Name ${data.name} is already in use`));
                res.end();
                return;
            }
            name = data.name;
        } else {
            name = nameFromPath(data.config);

            if(!manager.isNameFree(name) || list.has(name)) {
                let index = 1;
                while(!manager.isNameFree(`${name}-${index}`) || list.has(`${name}-${index}`)) {
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
            const logFilePath = path.resolve(process.cwd(), `${name}-logs.txt`);

            const childData = await manager.start(
                name,
                data.port,
                data.cwd,
                logFilePath,
                configValidation.right
            )
            
            console.log("NEW_WING_SPAWNED", {
                ...data,
                ...childData,
                name,
            });

            await list.add({
                name,
                pid: childData.pid,
                port: childData.port,
                cwd: data.cwd,
                logFilePath,
                configFilePath: data.config
            })

            res.write(asInfo(`Launched with PID ${childData.pid}`))
        } catch(e) {
            console.log("FAILED_TO_SPAWN", e + "");
            res.write(asError(e + ""))
        }

        res.end()
    })

    router.put("/stop", async (req, res) => {
        const validation = StopWingDTO.decode(req.body);
        if(Either.isLeft(validation)) return res.status(400).send("Incorrect data format");

        const { name } = validation.right;

        if(manager.isNameFree(name)) {
            res.write(asError(`Wing with name "${name}" doesn't exist`));
            res.end();
            return;
        }

        res.write(asInfo(`Landing wing "${name}"`));

        try {
            await manager.stop(name);
            console.log("WING_LANDED", name);

            await list.setStopped(name);

            res.write(asInfo(`Landed successfully`));
        } catch(e) {
            res.write(asError(`Failed to land the wing: \n${e}`));
        }

        res.end();
    })

    router.delete("/delete", async (req, res) => {
        const validation = StopWingDTO.decode(req.body);
        if(Either.isLeft(validation)) return res.status(400).send("Incorrect data format");

        const { name } = validation.right;

        const hook = list.get(name);

        if(!hook) {
            res.write(asError(`Wing with name "${name}" doesn't exist`))
            res.end();

            return;
        }

        if(hook.status === "ACTIVE") {
            res.write(asError(`Cannot remove active wing "${name}"`))
            res.end();

            return;
        }

        res.write(asInfo(`Removing wing from the list "${name}"`))

        await list.delete(name);

        res.write(asInfo(`Removed successfully`))

        res.end()
    })

    return router;
}
