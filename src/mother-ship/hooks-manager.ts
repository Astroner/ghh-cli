import * as fs from "fs";
import * as path from "path";
import { ChildProcess, fork } from "child_process";

import { createHook, GHHook, HookConfig } from "@dogonis/github-hook";
import * as t from "io-ts";

export type Hook = {
    name: string;
    pid: number;
    port: number;
    process: ChildProcess;
}

const childMessage = t.union([
    t.type({
        type: t.literal("STARTED"),
        pid: t.number,
        port: t.number
    }),
    t.type({
        type: t.literal("FAILURE"),
        error: t.string
    })
]);

export class HooksManager {
    private ports = new Set<number>();
    private names = new Set<string>();
    private hooks = new Map<string, Hook>();

    isPortFree(port: number) {
        return !this.ports.has(port);
    }

    isNameFree(name: string) {
        return !this.names.has(name);
    }

    async start(
        name: string, 
        port: number, 
        cwd: string, 
        logFilePath: string,
        config: HookConfig
    ) {
        if(!this.isPortFree(port)) throw new Error(`Port ${port} is busy`);
        if(!this.isNameFree(name)) throw new Error(`Name "${name}" is already in use`);

        this.ports.add(port);
        this.names.add(name);

        const logsFile = fs.openSync(logFilePath, "w+");

        const child = fork(path.resolve(__dirname, "./wing"), {
            cwd,
            env: {
                FORCE_COLOR: "1",
                PORT: port + "",
                CONFIG: JSON.stringify(config),
            },
            stdio: [
                'ignore',
                logsFile,
                logsFile,
                'ipc'
            ]
        })

        try {
            const processData = await Promise.race([
                new Promise<{ port: number, pid: number }>((resolve, reject) => {
                    child.once('message', message => {
                        const validation = childMessage.decode(message);
    
                        if(validation._tag === "Left"){
                            return reject(new Error("Failed to decode message from the wing"))
                        }
    
                        const data = validation.right;
    
                        switch(data.type) {
                            case "STARTED":
                                child.removeAllListeners();
                                return resolve({
                                    pid: data.pid,
                                    port: data.port
                                })
                            
                            case "FAILURE":
                                child.removeAllListeners();
                                reject(new Error("Failed to launch the wing:\n" + data.error));
                        }
                    })
                }),
                new Promise<{ port: number, pid: number }>((_, reject) => {
                    child.once('error', (err) => {
                        console.log(err);
                        child.removeAllListeners();
                        reject(err);
                    })
                })
            ])

            this.hooks.set(
                name,
                {
                    name,
                    process: child,
                    pid: processData.pid,
                    port: processData.port
                }
            )

            return processData;
        } catch(e) {
            this.names.delete(name);
            this.ports.delete(port);

            child.kill();

            fs.closeSync(logsFile);
            throw e;
        }
    }

    stop(name: string) {
        const hook = this.hooks.get(name);
        if(!hook) throw new Error(`No wing with name "${name}"`)

        return new Promise<void>((resolve, reject) => {
            hook.process.once('close', () => {
                this.ports.delete(hook.port);
                this.names.delete(hook.name);
                this.hooks.delete(hook.name);
                resolve();
            });
            if(!hook.process.kill()) {
                hook.process.removeAllListeners();
                console.error("FAILED_TO_KILL", {
                    ...hook,
                    process: null
                });
                reject(new Error(`Failed to kill the process with PID ${hook.pid}`));
            }
        })
    }

    async stopAll() {
        await Promise.all([
            Array.from(this.hooks.keys()).map(name => this.stop(name))
        ])
    }
}