import * as ReaderTaskEither from "fp-ts/lib/ReaderTaskEither";

import { Executor } from "./types";

export const down: Executor<"down"> = () => ReaderTaskEither.left(new Error("Down is not implemented"))