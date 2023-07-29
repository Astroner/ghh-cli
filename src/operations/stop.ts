import * as ReaderTaskEither from "fp-ts/lib/ReaderTaskEither";

import { Executor } from "./types";

export const stop: Executor<"stop"> = () =>
    ReaderTaskEither.left(new Error("Stop is not implemented"));
