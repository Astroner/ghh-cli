import { ChildProcess } from "child_process";

import { createHook, GHHook, HookConfig } from "@dogonis/github-hook";

export type Hook = {
    name: string;
    hook: GHHook;
}

export class HooksManager {
    private ports = new Set<number>();
    private hooks = new Map<string, Hook>();

    isPortFree(port: number) {
        return !this.ports.has(port);
    }

    isNameFree(name: string) {
        return !this.hooks.has(name);
    }

    async start(name: string, port: number, config: HookConfig) {
        if(!this.isPortFree(port)) throw new Error(`Port ${port} is busy`);
        if(!this.isNameFree(name)) throw new Error(`Name "${name}" is already in use`);

        const hook = createHook(config);

        await hook.start(port);

        this.ports.add(port);
        this.hooks.set(name, {
            name,
            hook
        });
    }
}