import * as TaskEither from "fp-ts/lib/TaskEither";

import { Executor } from "./types";

export const ls: Executor<"ls"> = () => TaskEither.left(new Error("LS is not implemented"))