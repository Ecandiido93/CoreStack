import { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/prisma";

export interface TenantRequest extends Request {
  tenant?: {
    id: string;
    slug: string;
    name: string;
  };
}

export const tenantMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Resolve tenant por header X-Tenant-ID (slug ou uuid)
  const tenantIdentifier =
    req.headers["x-tenant-id"] as string ||
    req.headers["x-tenant-slug"] as string;

  if (!tenantIdentifier) {
    return res.status(400).json({
      error: "Tenant não identificado",
      hint: "Envie o header X-Tenant-ID com o slug ou ID do tenant",
    });
  }

  try {
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { id: tenantIdentifier },
          { slug: tenantIdentifier },
        ],
        isActive: true,
      },
      select: { id: true, slug: true, name: true },
    });

    if (!tenant) {
      return res.status(404).json({ error: "Tenant não encontrado ou inativo" });
    }

    (req as TenantRequest).tenant = tenant;
    return next();
  } catch {
    return res.status(500).json({ error: "Erro ao resolver tenant" });
  }
};
