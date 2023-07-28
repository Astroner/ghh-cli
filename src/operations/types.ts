import { TaskEither } from "fp-ts/lib/TaskEither";
import { OperationName, OperationConfigs } from "../model";

export type Executor<Name extends OperationName> = (config: OperationConfigs[Name]) => TaskEither<Error, void>