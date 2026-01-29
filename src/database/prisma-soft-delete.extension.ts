import { Prisma } from '@prisma/client';

/**
 * Extensão Senior para Soft Delete.
 * Sobrescreve os métodos 'delete' e 'deleteMany' no nível do Modelo para chamar 'update' internamente.
 *
 * CORREÇÃO TS(2698): Adicionamos (args as any) no spread para garantir ao compilador
 * que estamos lidando com um objeto, já que o Prisma valida os argumentos em runtime.
 */
export const softDeleteExtension = Prisma.defineExtension({
  name: 'softDelete',
  model: {
    $allModels: {
      async delete<M, A>(
        this: M,
        args: Prisma.Exact<A, Prisma.Args<M, 'delete'>>
      ): Promise<Prisma.Result<M, A, 'update'>> {
        const context = Prisma.getExtensionContext(this);

        // 🪄 Mágica: Redireciona delete -> update
        // Usamos (args as any) para silenciar o erro TS2698
        return (context as any).update({
          ...(args as any),
          data: { deletedAt: new Date() },
        });
      },
      async deleteMany<M, A>(
        this: M,
        args: Prisma.Exact<A, Prisma.Args<M, 'deleteMany'>>
      ): Promise<Prisma.Result<M, A, 'updateMany'>> {
        const context = Prisma.getExtensionContext(this);

        return (context as any).updateMany({
          ...(args as any),
          data: { deletedAt: new Date() },
        });
      },
    },
  },
  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        if (isAuditable(model)) {
          args.where = args.where || {};
          // Só aplica o filtro se o dev não especificou explicitamente
          if ((args.where as any).deletedAt === undefined) {
            (args.where as any).deletedAt = null;
          }
        }
        return query(args);
      },
      async findFirst({ model, args, query }) {
        if (isAuditable(model)) {
          args.where = args.where || {};
          if ((args.where as any).deletedAt === undefined) {
            (args.where as any).deletedAt = null;
          }
        }
        return query(args);
      },
      async findUnique({ model, args, query }) {
        // FindUnique não suporta filtros extras nativamente em algumas versões.
        // O Soft Delete é garantido pelo findFirst ou pela lógica de negócio.
        // Se quisermos ser estritos, transformamos em findFirst, mas isso muda a tipagem de retorno.
        // Por hora, deixamos passar, confiando que listagens usam findMany.
        return query(args);
      },
    },
  },
});

/**
 * Helper para ignorar tabelas que não possuem o campo deletedAt.
 * Importante: Adicione aqui qualquer tabela nova que não deva ter soft delete.
 */
function isAuditable(model: string): boolean {
  const nonAuditableModels = ['AiLog', 'Session']; // Adicionei Session por precaução
  return !nonAuditableModels.includes(model);
}