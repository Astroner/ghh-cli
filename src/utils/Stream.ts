import { Readable } from "stream";

import * as Applicative from "fp-ts/lib/Applicative";
import * as Apply from "fp-ts/lib/Apply";
import * as Task from "fp-ts/lib/Task";
import { pipeable } from "fp-ts/lib/pipeable";

export type Subscription = {
    unsubscribe(): void;
}

export type Stream<T> = {
    ended: boolean;
    subscribers: Array<(t: T) => void>
    endScribers: Array<() => void>
}

export const URI = "Stream";
export type URI = typeof URI;

declare module 'fp-ts/HKT' {
    interface URItoKind<A> {
      readonly Stream: Stream<A>
    }
}

export const create = <T>(): Stream<T> => {
    return {
        ended: false,
        subscribers: [],
        endScribers: [],
    }
}

export const next = <T>(value: T) => (stream: Stream<T>) => {
    if(stream.ended) stream;
    stream.subscribers.forEach(cb => cb(value));

    return stream;
};

export const end = (stream: Stream<any>) => {
    if(stream.ended) return stream;
    stream.ended = true;
    stream.subscribers = [];
    stream.endScribers.forEach(cb => cb());

    return stream;
}

export const subscribe = <T>(cb: (val: T) => void) => (stream: Stream<T>): Subscription => {
    if(stream.ended) return {
        unsubscribe: () => {}
    }

    stream.subscribers.push(cb)

    return {
        unsubscribe: () => stream.subscribers.splice(stream.subscribers.indexOf(cb), 1)
    }
}

export const subscribeEnd = (cb: () => void) => (stream: Stream<any>): Subscription => {
    if(stream.ended) {
        setTimeout(cb, 0);
        return {
            unsubscribe: () => {}
        }
    }
    stream.endScribers.push(cb)

    return {
        unsubscribe: () => stream.endScribers.splice(stream.subscribers.indexOf(cb), 1)
    }
}

export const applicativeInstance: Applicative.Applicative1<"Stream"> = {
    URI,
    of() {
        return create()
    },
    map<A, B>(fa: Stream<A>, f: (a: A) => B) {
        
        const mapped = create<B>()

        subscribe((a: A) => next(f(a))(mapped))(fa)
        subscribeEnd(() => {
            end(mapped);
        })(fa)

        return mapped;
    },
    ap<A, B>(fab: Stream<(a: A) => B>, fa: Stream<A>) {
        let transform: ((a: A) => B) | null = null;
        let arg: A | null = null;

        const result = create<B>()

        const update = () => {
            if(!transform || !arg) return;
            
            return next(transform(arg))(result);
        }

        let ended = 0;

        subscribe((f: ((a: A) => B)) => (transform = f, update()))(fab);
        subscribe((a: A) => (arg = a, update()))(fa);


        const endHandler = subscribeEnd(() => {
            if(++ended == 2) end(result);
        })

        endHandler(fab)
        endHandler(fa)

        return result;
    },
}

const { ap, apFirst, apSecond, map } = pipeable(applicativeInstance);

export { ap, apFirst, apSecond, map };

export const sequenceT = Apply.sequenceT(applicativeInstance)
export const sequenceS = Apply.sequenceS(applicativeInstance)

export const toTask = (stream: Stream<any>): Task.Task<void> => {
    return () => new Promise<void>((resolve) => {
        subscribeEnd(resolve)(stream)
    }) 
}

export const fromReadable = (str: Readable): Stream<unknown> => {
    const result = create<unknown>()

    str.on('data', (chunk) => result.subscribers.forEach(cb => cb(chunk)))
    str.on('close', () => end(result))
    str.on('error', () => end(result))

    return result;
}

export const tap = <T>(cb: (t: T) => void) => (stream: Stream<T>) => {
    stream.subscribers.push(cb)

    return stream;
}

export const tapEnd = <T>(cb: () => void) => (stream: Stream<T>) => {
    stream.endScribers.push(cb)

    return stream;
}
