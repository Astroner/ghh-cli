import * as TaskEither from "fp-ts/lib/TaskEither";

import { Executor } from "./types";

export const down: Executor<"down"> = () => TaskEither.left(new Error("Down is not implemented"))