import type { Request } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

export type TypedRequest<
  Q = Record<string, unknown>,
  B = unknown,
  P extends ParamsDictionary = ParamsDictionary,
> = Request<P, unknown, B, Q>;
