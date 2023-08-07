import { ReaderTaskEither } from "fp-ts/lib/ReaderTaskEither";
import { OperationName, OperationConfigs } from "../model";
import * as t from "io-ts";

export type ExecutionContext = {
    appDirectory: string;
    dataFilePath: string;
};

export type Executor<Name extends OperationName> = (
    config: OperationConfigs[Name],
) => ReaderTaskEither<ExecutionContext, Error, void>;

export const WingInfoC = t.type({
    name: t.string,
    pid: t.union([t.number, t.null]),
    port: t.number,
    status: t.union([t.literal("ACTIVE"), t.literal("STOPPED")]),
    cwd: t.string,
    logFilePath: t.string,
    configFilePath: t.string,
});
