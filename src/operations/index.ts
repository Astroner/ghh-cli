import { Operation, OperationConfigs } from "../model";
import { boot } from "./boot";
import { down } from "./down";
import { ls } from "./ls";
import { start } from "./start";
import { stop } from "./stop";
import { Executor } from "./types";

type Executors = {
    [K in keyof OperationConfigs]: Executor<K>
}

const executors: Executors = {
    boot,
    down,
    ls,
    start,
    stop,
}

export const runOperation = (operation: Operation) => {
    return executors[operation.name](operation.config as never);
}