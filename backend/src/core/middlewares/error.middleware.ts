import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/appError";
import { ZodError } from "zod";

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Erro de validação Zod
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: "Validation error",
      message: "Dados inválidos",
      errors: err.flatten().fieldErrors,
    });
  }

  // Erro customizado da aplicação
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  // Erro de constraint do Prisma (unique, not found, etc)
  if (typeof err === "object" && err !== null && "code" in err) {
    const prismaErr = err as { code: string; meta?: { target?: string[] } };

    if (prismaErr.code === "P2002") {
      return res.status(409).json({
        error: `Já existe um registro com este ${prismaErr.meta?.target?.join(", ") || "campo"}`,
      });
    }

    if (prismaErr.code === "P2025") {
      return res.status(404).json({
        error: "Registro não encontrado",
      });
    }
  }

  // Erro genérico — nunca expõe detalhes em produção
  console.error("Unhandled error:", err);

  return res.status(500).json({
    error: process.env.NODE_ENV === "production"
      ? "Internal server error"
      : (err instanceof Error ? err.message : "Unknown error"),
  });
}
