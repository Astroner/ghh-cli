export type OperationConfigs = {
    boot: null,
    down: null,
    start: {
        name?: string;
        configPath: string;
    };
    stop: {
        name: string;
    };
    ls: null
}

export type OperationName = keyof OperationConfigs;

type OperationConfigPairs = {
    [K in keyof OperationConfigs]: {
        name: K;
        config: OperationConfigs[K];
    }
}

export type Operation = OperationConfigPairs[keyof OperationConfigPairs];