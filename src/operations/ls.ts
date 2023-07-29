import * as ReaderTaskEither from "fp-ts/lib/ReaderTaskEither";

import { Executor } from "./types";

export const ls: Executor<"ls"> = () =>
    ReaderTaskEither.left(new Error("LS is not implemented"));
