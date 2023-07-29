export type OperationConfigs = {
    launch: null;
    land: null;
    start: {
        name?: string;
        configPath: string;
    };
    stop: {
        name: string;
    };
    ls: null;
    help: {
        operation?: string;
    };
    status: null;
    clean: null;
};

export type OperationName = keyof OperationConfigs;

type OperationConfigPairs = {
    [K in keyof OperationConfigs]: {
        name: K;
        config: OperationConfigs[K];
    };
};

export type Operation = OperationConfigPairs[keyof OperationConfigPairs];
