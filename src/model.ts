export type OperationConfigs = {
    launch: null;
    land: null;
    start: {
        name?: string;
        port: number;
        configPath: string;
    };
    stop: {
        name: string;
    };
    ls: null;
    logs: {
        name: string,
        lines?: number
    },
    help: {
        operation?: string;
    };
    status: null;
    clean: null;
    remove: {
        name: string;
    };
    restart: {
        name: string,
        port?: number
    }
};

export type OperationName = keyof OperationConfigs;

type OperationConfigPairs = {
    [K in keyof OperationConfigs]: {
        name: K;
        config: OperationConfigs[K];
    };
};

export type Operation = OperationConfigPairs[keyof OperationConfigPairs];
