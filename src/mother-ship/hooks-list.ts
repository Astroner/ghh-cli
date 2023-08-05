export type HookEntry = {
    status: "ACTIVE" | "STOPPED"
    name: string;
    logFilePath: string;
    cwd: string;
    pid: number | null;
    port: number;
    configFilePath: string;
}

export class HooksList {
    private hooks = new Map<string, HookEntry>();

    has(name: string) {
        return this.hooks.has(name);
    }

    async add(entry: Omit<HookEntry, 'status'>) {
        if(this.hooks.has(entry.name)) throw new Error(`Entry with name ${entry.name} already exists`);

        this.hooks.set(entry.name, {
            ...entry,
            status: "ACTIVE"
        })
    }

    async setActive(name: string) {
        const hook = this.hooks.get(name);

        if(!hook) throw new Error(`Entry with name ${name} already exists`);

        hook.status = "ACTIVE"
    }

    async setStopped(name: string) {
        const hook = this.hooks.get(name);

        if(!hook) throw new Error(`Entry with name ${name} already exists`);

        hook.status = "STOPPED"
        hook.pid = null;
    }

    async delete(name: string) {
        this.hooks.delete(name);
    }

    get(name: string) {
        return this.hooks.get(name)
    }

    getAll() {
        return Array.from(this.hooks.values());
    }

}