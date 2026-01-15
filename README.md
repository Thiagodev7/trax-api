# Trax - Marketing Automation API

Backend da plataforma **SaaS Trax**, focado em automação de marketing utilizando Inteligência Artificial (**OpenAI / Google Gemini**).

---

## 🚀 Tech Stack

- **Framework:** NestJS (v10+)
- **Linguagem:** TypeScript (Strict Mode)
- **Banco de Dados:** PostgreSQL
- **ORM:** Prisma
- **Autenticação:** JWT + Argon2 (Boas práticas de segurança)
- **Docs:** Swagger (OpenAPI 3.0)
- **Infra:** Docker & Docker Compose
- **Cache/Queue (opcional):** Redis *(se habilitado no `docker-compose.yml`)*

---

## ✅ Pré-requisitos

- Node.js **v20+**
- Docker + Docker Compose (Docker Desktop)

---

## 🛠️ Instalação e Configuração

### 1) Variáveis de Ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

> Se o projeto ainda não tiver `.env.example`, crie um baseado no `.env` seguro do time e **não** faça commit do `.env`.

**Exemplo de variáveis (ajuste conforme seu projeto):**

```env
# App
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trax?schema=public"

# Auth
JWT_SECRET="troque-por-um-segredo-forte"
JWT_EXPIRES_IN="1d"

# AI Providers (opcional)
OPENAI_API_KEY=""
GEMINI_API_KEY=""

# Redis (opcional)
REDIS_URL="redis://localhost:6379"
```

---

### 2) Infraestrutura (Docker)

Suba os serviços necessários (ex.: Postgres e Redis):

```bash
docker-compose up -d
# ou (Docker Compose v2)
docker compose up -d
```

Para parar:

```bash
docker-compose down
# ou
docker compose down
```

---

### 3) Instalação de Dependências

```bash
npm install
```

---

### 4) Setup do Banco de Dados (Prisma)

Gere o Prisma Client e rode as migrações:

```bash
npx prisma generate
npx prisma migrate dev
```

> Dica: para abrir o Prisma Studio:
```bash
npx prisma studio
```

---

## ▶️ Executando

### Desenvolvimento (Watch Mode)

```bash
npm run start:dev
```

O servidor iniciará em: **http://localhost:3000**

### Produção

```bash
npm run build
npm run start:prod
```

---

## 📚 Documentação (Swagger)

Acesse a documentação interativa em:

- **http://localhost:3000/docs**

---

## 🧪 Testes

```bash
# Unit tests
npm run test

# e2e tests
npm run test:e2e

# coverage
npm run test:cov
```

---

## 🏛️ Arquitetura

Este projeto segue o padrão **Modular Monolith**, visando alta coesão e baixo acoplamento, permitindo futura extração para microsserviços se necessário.

Estratégias recomendadas:
- Separação por **módulos** (domínios de negócio)
- Camadas claras: **Controller → Service → Repository/Prisma**
- **DTOs + ValidationPipe** para validação de entrada
- **AppError / Exception Filter** para tratamento consistente de erros
- Logs estruturados (ex.: **Winston/Pino**) e correlação por request

---

## 🤖 Integração com IA (OpenAI / Gemini)

A integração com provedores de IA deve ficar isolada em um módulo/serviço dedicado (ex.: `AiModule`), com:
- Timeouts e retries
- Rate limiting / backoff
- Observabilidade (logs/metrics)
- Fallback entre provedores quando aplicável

---

## 🔁 CI (GitHub Actions)

Crie o workflow em: `.github/workflows/ci.yml`

```yaml
name: CI Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Use Node.js 20
        uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Build Project
        run: npm run build

      # Futuro: Adicionar 'npm run test' aqui quando tivermos testes
```

---

## 📄 Licença

Defina a licença do projeto (ex.: MIT) ou remova esta seção, conforme a política do repositório.

---

## 👥 Time

**Trax Engineering Team**
