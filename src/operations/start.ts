import * as TaskEither from "fp-ts/lib/TaskEither";

import { Executor } from "./types";

export const start: Executor<"start"> = () => TaskEither.left(new Error("Start is not implemented"))