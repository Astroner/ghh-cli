import { Readable } from "stream";

import axios from "axios";

import * as t from "io-ts";
import { flow, pipe } from "fp-ts/lib/function";
import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Either from "fp-ts/lib/Either";
import * as Json from "fp-ts/lib/Json";
import * as Option from "fp-ts/lib/Option";

import { DataFile } from "./dataFile";
import * as StreamEither from "../utils/StreamEither";

export const streamFromMotherShip =
    <MessageType = string>(
        method: string,
        path: string,
        type: t.Type<MessageType>,
        data?: unknown,
    ) =>
    (ctx: DataFile) =>
        pipe(
            TaskEither.tryCatch(
                () =>
                    axios<Readable>({
                        method,
                        responseType: "stream",
                        baseURL: `http://127.0.0.1:${ctx.port}`,
                        url: path,
                        data,
                        headers: {
                            Authorization: ctx.token,
                        },
                    }),
                (err) =>
                    new Error("Failed to connect to the mother-ship:\n" + err),
            ),
            TaskEither.map(
                flow(
                    ({ data }) => data,
                    StreamEither.fromReadable,
                    StreamEither.map((data) => data + ""),
                    StreamEither.chainEither((data) =>
                        type.name === "string"
                            ? pipe(
                                  type.decode(data),
                                  Either.mapLeft(
                                      () =>
                                          new Error(
                                              "Failed to decode mother-ship message",
                                          ),
                                  ),
                              )
                            : pipe(
                                  Json.parse(data),
                                  Either.mapLeft(
                                      () =>
                                          new Error(
                                              "Failed to parse json response",
                                          ),
                                  ),
                                  Either.chain(
                                      flow(
                                          type.decode,
                                          Either.mapLeft(
                                              () =>
                                                  new Error(
                                                      "Failed to decode response",
                                                  ),
                                          ),
                                      ),
                                  ),
                              ),
                    ),
                ),
            ),
        );
