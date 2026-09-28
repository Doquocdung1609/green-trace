import type { ErrorRequestHandler } from "express";
import { MulterError } from "multer";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  void _next;
  if (error instanceof MulterError)
    return res
      .status(400)
      .json({ error: `Tệp tải lên không hợp lệ: ${error.message}` });
  const message =
    error instanceof Error ? error.message : "Lỗi máy chủ không xác định";
  if (process.env.NODE_ENV !== "test") console.error("API error:", message);
  return res.status(500).json({ error: "Không thể hoàn tất yêu cầu" });
};
