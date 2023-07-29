import * as ReaderTaskEither from "fp-ts/lib/ReaderTaskEither";

import { Executor } from "./types";

export const start: Executor<"start"> = () => ReaderTaskEither.left(new Error("Start is not implemented"))