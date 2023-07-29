import { Operation, OperationConfigs } from "../model";
import { launch } from "./launch";
import { land } from "./land";
import { help } from "./help";
import { ls } from "./ls";
import { start } from "./start";
import { stop } from "./stop";
import { Executor } from "./types";
import { status } from "./status";
import { clean } from "./clean";

type Executors = {
    [K in keyof OperationConfigs]: Executor<K>
}

const executors: Executors = {
    launch,
    land,
    ls,
    start,
    stop,
    help,
    status,
    clean
}

export const runOperation = (operation: Operation) => {
    return executors[operation.name](operation.config as never);
}