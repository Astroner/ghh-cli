import { ReaderTaskEither } from "fp-ts/lib/ReaderTaskEither";
import { OperationName, OperationConfigs } from "../model";

export type ExecutionContext = {
    appDirectory: string;
    dataFilePath: string;
};

export type Executor<Name extends OperationName> = (
    config: OperationConfigs[Name],
) => ReaderTaskEither<ExecutionContext, Error, void>;
