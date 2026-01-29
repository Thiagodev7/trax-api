import { Prisma } from '@prisma/client';

/**
 * Extensão Senior para automatizar Soft Delete no Prisma.
 * Intercepta operações de exclusão e leitura para gerenciar o campo 'deletedAt'.
 */
export const softDeleteExtension = Prisma.defineExtension({
  name: 'softDelete',
  query: {
    $allModels: {
      // 1. Intercepta 'delete' único
      async delete({ model, args, query }) {
        return (query as any)({
          ...args,
          data: { deletedAt: new Date() },
        });
      },
      // 2. Intercepta 'deleteMany'
      async deleteMany({ model, args, query }) {
        return (query as any)({
          ...args,
          data: { deletedAt: new Date() },
        });
      },
      // 3. Filtra automaticamente 'findMany' para registros não deletados
      async findMany({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      // 4. Filtra 'findFirst'
      async findFirst({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      // 5. Filtra 'findUnique' (necessário transformar em findFirst pois Unique não aceita filtros extras)
      async findUnique({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      // 6. Filtra contagens
      async count({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
    },
  },
});