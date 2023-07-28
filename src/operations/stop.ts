import * as TaskEither from "fp-ts/lib/TaskEither";

import { Executor } from "./types";

export const stop: Executor<"stop"> = () => TaskEither.left(new Error("Stop is not implemented"))