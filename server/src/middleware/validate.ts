import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

export function validate(
  schema: ZodType,
  source: "body" | "params" | "query" = "body",
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success)
      return res
        .status(400)
        .json({
          error: "Dữ liệu không hợp lệ",
          details: result.error.flatten(),
        });
    Object.assign(req[source], result.data);
    next();
  };
}
