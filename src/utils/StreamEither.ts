import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Either from "fp-ts/lib/Either";
import * as Monad from "fp-ts/lib/Monad";
import * as Apply from "fp-ts/lib/Apply";
import { pipeable } from "fp-ts/pipeable";

import * as Stream from "./Stream";
import { Readable } from "stream";
import { pipe } from "fp-ts/lib/function";

export type StreamLeft<E> = {
    type: "left";
    error: E;
};

export type StreamRight<E, T> = {
    type: "right";
    errorSubscribers: Array<(e: E) => void>;
    stream: Stream.Stream<T>;
};

export type StreamEither<E, T> = StreamLeft<E> | StreamRight<E, T>;

export const URI = "StreamEither";

export type URI = typeof URI;

declare module "fp-ts/HKT" {
    interface URItoKind2<E, A> {
        readonly StreamEither: StreamEither<E, A>;
    }
}

export const right = <E, T>(): StreamEither<E, T> => ({
    type: "right",
    errorSubscribers: [],
    stream: Stream.create(),
});

export const left = <E, T>(error: E): StreamEither<E, T> => ({
    type: "left",
    error,
});

export const isLeft = <E, T>(
    stream: StreamEither<E, T>,
): stream is StreamLeft<E> => {
    return stream.type === "left";
};

export const isRight = <E, T>(
    stream: StreamEither<E, T>,
): stream is StreamRight<E, T> => {
    return stream.type === "right";
};

export const next = <E, T>(
    stream: StreamEither<E, T>,
    value: T,
): StreamEither<E, T> => {
    if (isLeft(stream)) return stream;
    Stream.next(stream.stream, value);

    return stream;
};

export const end = <E, T>(
    stream: StreamEither<E, T>,
    value?: T,
): StreamEither<E, T> => {
    if (isLeft(stream)) return stream;

    stream.errorSubscribers = [];

    Stream.end(stream.stream, value);

    return stream;
};

export const fail = <E, T>(
    stream: StreamEither<E, T>,
    e: E,
): StreamEither<E, T> => {
    if (isLeft(stream)) return stream;

    stream.errorSubscribers.forEach((cb) => cb(e));

    stream.errorSubscribers = [];

    stream.stream.endScribers = [];
    stream.stream.subscribers = [];

    // @ts-ignore
    stream.type = "left";
    // @ts-ignore
    stream.error = e;
    // @ts-ignore
    delete stream.errorSubscribers;
    // @ts-ignore
    delete stream.stream;

    return stream;
};

export const subscribe = <E, T>(
    stream: StreamEither<E, T>,
    cb: (v: T) => void,
): Stream.Subscription => {
    if (isLeft(stream))
        return {
            unsubscribe: () => {},
        };

    return Stream.subscribe(stream.stream, cb);
};

export const subscribeEnd = (
    stream: StreamEither<any, any>,
    cb: () => void,
): Stream.Subscription => {
    if (isLeft(stream))
        return {
            unsubscribe: () => {},
        };

    return Stream.subscribeEnd(stream.stream, cb);
};

export const subscribeError = <E, T>(
    stream: StreamEither<E, T>,
    cb: (e: E) => void,
): Stream.Subscription => {
    if (isLeft(stream)) {
        setTimeout(() => cb(stream.error), 0);
        return {
            unsubscribe: () => {},
        };
    }

    stream.errorSubscribers.push(cb);

    return {
        unsubscribe: () =>
            stream.errorSubscribers.splice(
                stream.errorSubscribers.indexOf(cb),
                1,
            ),
    };
};

const monadInstance: Monad.Monad2<"StreamEither"> = {
    URI,
    of<E, A>(a: A) {
        const stream = right<E, A>();

        setTimeout(() => next(stream, a), 0);

        return stream;
    },
    map<E, A, B>(fa: StreamEither<E, A>, f: (a: A) => B) {
        if (isLeft(fa)) return fa as StreamEither<E, B>;

        const result: StreamEither<E, B> = {
            type: "right",
            errorSubscribers: [],
            stream: Stream.map<A, B>(f)(fa.stream),
        };

        subscribeError(fa, (e) => fail(result, e));

        return result;
    },
    ap<E, A, B>(fab: StreamEither<E, (a: A) => B>, fa: StreamEither<E, A>) {
        if (isLeft(fab)) return fab as StreamEither<E, B>;
        if (isLeft(fa)) return fa as StreamEither<E, B>;

        const result: StreamEither<E, B> = {
            type: "right",
            errorSubscribers: [],
            stream: Stream.ap(fa.stream)(fab.stream),
        };

        subscribeError<E, any>(fab, (e: E) => fail(result, e));

        subscribeError<E, any>(fa, (e: E) => fail(result, e));

        return result;
    },
    chain(fa, f) {
        return flatten(monadInstance.map(fa, f));
    },
};

const of_ = monadInstance.of;

export { of_ as of };

const { map, ap, apFirst, apSecond, chain } = pipeable(monadInstance);

export { map, ap, apFirst, apSecond, chain };

export const sequenceT = Apply.sequenceT(monadInstance);
export const sequenceS = Apply.sequenceS(monadInstance);

export const fromReadable = (
    readable: Readable,
): StreamEither<Error, unknown> => {
    const result = right<Error, unknown>();

    readable.on("data", (chunk) => {
        next(result, chunk);
    });

    readable.once("error", (err) => {
        fail(result, err);
    });

    readable.once("end", () => {
        end(result);
    });

    return result;
};

export const toTaskEither = <E, T>(
    stream: StreamEither<E, T>,
): TaskEither.TaskEither<E, void> => {
    return () =>
        new Promise<Either.Either<E, void>>((resolve) => {
            subscribeEnd(stream, () => resolve(Either.right(undefined)));
            subscribeError(stream, (err) => resolve(Either.left(err)));
        });
};

export const chainEither =
    <E, A, B>(map: (a: A) => Either.Either<E, B>) =>
    (stream: StreamEither<E, A>): StreamEither<E, B> => {
        if (isLeft(stream)) return stream;

        const result = right<E, B>();

        subscribe(stream, (a: A) => {
            const val = map(a);
            if (Either.isLeft(val)) fail(result, val.left);
            else next(result, val.right);
        });

        subscribeEnd(stream, () => end(result));
        subscribeError(stream, (err: E) => fail(result, err));

        return result;
    };

export const tap =
    <E, A>(cb: (a: A) => void) =>
    (stream: StreamEither<E, A>) => {
        subscribe(stream, cb);

        return stream;
    };

export const tapEnd =
    <E, A>(cb: () => void) =>
    (stream: StreamEither<E, A>) => {
        subscribeEnd(stream, cb);

        return stream;
    };

export const tapError =
    <E, A>(cb: (e: E) => void) =>
    (stream: StreamEither<E, A>) => {
        subscribeError(stream, cb);

        return stream;
    };

export const fromTaskEither = <E, A>(te: TaskEither.TaskEither<E, A>) => {
    const stream = right<E, A>();

    te().then(
        Either.fold(
            (e) => fail(stream, e),
            (r) => next(stream, r),
        ),
    );

    return stream;
};

interface StreamEitherFilter {
    <E, A>(
        predicate: (a: A) => unknown,
    ): (stream: StreamEither<E, A>) => StreamEither<E, A>;
    <E, A, B extends A>(
        predicate: (a: A) => a is B,
    ): (stream: StreamEither<E, A>) => StreamEither<E, B>;
}

export const filter: StreamEitherFilter =
    (predicate: (a: unknown) => unknown) =>
    (stream: StreamEither<unknown, unknown>) => {
        if (isLeft(stream)) return stream;

        const result: StreamEither<unknown, unknown> = {
            type: "right",
            stream: Stream.filter(predicate)(stream.stream),
            errorSubscribers: [],
        };

        subscribeError(stream, (e) => {
            fail(result, e);
        });

        return result;
    };

export const flatten = <E, A>(stream: StreamEither<E, StreamEither<E, A>>) => {
    if (isLeft(stream)) return stream;

    const result = right<E, A>();

    let prevStream: StreamEither<E, A> | null = null;
    let valSub: Stream.Subscription | null = null;
    let errSub: Stream.Subscription | null = null;
    let endSub: Stream.Subscription | null = null;

    subscribe(stream, (s) => {
        valSub?.unsubscribe();
        errSub?.unsubscribe();
        endSub?.unsubscribe();
        if (prevStream) end(prevStream);

        prevStream = s;
        valSub = subscribe(s, (a) => {
            next(result, a);
        });

        errSub = subscribeError(s, (e) => {
            fail(result, e);
        });

        endSub = subscribeEnd(s, () => end(result));
    });

    subscribeError(stream, (e) => {
        valSub?.unsubscribe();
        errSub?.unsubscribe();
        endSub?.unsubscribe();
        if (prevStream) end(prevStream);

        fail(result, e);
    });

    subscribeEnd(stream, () => {
        valSub?.unsubscribe();
        errSub?.unsubscribe();
        endSub?.unsubscribe();
        if (prevStream) end(prevStream);

        end(result);
    });

    return result;
};

export const accumulate = <E, T>(
    stream: StreamEither<E, T>,
): TaskEither.TaskEither<E, T[]> => {
    if (isLeft(stream)) return TaskEither.left(stream.error);

    return () =>
        new Promise((resolve) => {
            const entries: T[] = [];
            subscribe(stream, (v) => entries.push(v));
            subscribeError(stream, (e) => resolve(Either.left(e)));
            subscribeEnd(stream, () => resolve(Either.right(entries)));
        });
};

export const chainFirst =
    <E, A, B>(map: (a: A) => StreamEither<E, B>) =>
    (input: StreamEither<E, A>): StreamEither<E, A> => {
        if (isLeft(input)) return input;

        const stream = right<E, A>();

        let mappedStream: StreamEither<E, B> | null = null;
        let errSub: Stream.Subscription | null = null;
        subscribe(input, (value) => {
            errSub?.unsubscribe();
            if (mappedStream) end(mappedStream);

            mappedStream = map(value);

            errSub = subscribeError(mappedStream, (e) => fail(stream, e));

            next(stream, value);
        });

        subscribeEnd(input, () => {
            errSub?.unsubscribe();
            if (mappedStream) end(mappedStream);
            end(stream);
        });

        subscribeError(input, (err) => {
            errSub?.unsubscribe();
            if (mappedStream) end(mappedStream);

            fail(stream, err);
        });

        return stream;
    };
