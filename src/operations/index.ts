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
import { remove } from "./remove";
import { restart } from "./restart";
import { logs } from "./logs";

type Executors = {
    [K in keyof OperationConfigs]: Executor<K>;
};

const executors: Executors = {
    launch,
    land,
    ls,
    start,
    stop,
    help,
    status,
    clean,
    remove,
    restart,
    logs,
};

export const runOperation = (operation: Operation) => {
    return executors[operation.name](operation.config as never);
};
