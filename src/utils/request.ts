import axios from "axios";
import { flow, pipe } from "fp-ts/lib/function";
import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Task from "fp-ts/lib/Task";
import * as Either from "fp-ts/lib/Either";
import * as t from "io-ts";
import { DataFile } from "./dataFile";

export const request = <ResponseType = unknown>(method: string, path: string, responseType: t.Type<ResponseType> = t.any, data?: unknown) => (ctx: DataFile): TaskEither.TaskEither<Error, ResponseType> => pipe(
    TaskEither.tryCatch(
        () => axios({
            method,
            baseURL: `http://127.0.0.1:${ctx.port}`,
            url: path,
            headers: {
                Authorization: ctx.token,
            }
        }),
        (err) => new Error("Failed to connect to the mother-ship:\n" + err)
    ),
    TaskEither.map(response => response.data),
    Task.map(Either.chain(flow(
        responseType.decode,
        Either.mapLeft(() => new Error("Failed to decode mother-ship data")
    ))))
)