<div align="center">

# ◈ CoreStack

### Fundação Modular para Backend SaaS

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Um backend core seguro, escalável e pronto para produção, projetado para impulsionar aplicações SaaS modernas — com isolamento multi-tenant, autenticação JWT avançada, fingerprinting de dispositivos, audit logging e um dashboard de monitoramento em tempo real.

[🇺🇸 Read in English](./README.md)

</div>

---

## 🧠 Visão Geral

CoreStack é uma fundação modular de backend construída com segurança, escalabilidade e arquitetura do mundo real em mente. Ele serve como um **core SaaS reutilizável** onde novos módulos podem ser conectados sem quebrar o sistema existente.

O projeto inclui uma **implementação full-stack**: um backend robusto com Express + Prisma e um frontend Next.js com dashboard de monitoramento de sessão em tempo real.

---

## ✨ Funcionalidades

### 🔐 Autenticação & Segurança
- **Autenticação JWT** — Par de tokens Access + Refresh com expiração configurável
- **Rotação de Refresh Token** — Rotação automática a cada chamada de refresh; tokens antigos marcados como `USED`
- **Detecção de Ataque de Reuso** — Revogação de toda a família de tokens quando um token consumido é reutilizado
- **Hash de Senha** — bcrypt com salt rounds para armazenamento seguro de credenciais
- **Validação Zod** — Validação de entrada em tempo de execução com schemas rigorosos (tamanho mínimo, maiúsculas, dígitos)
- **Integração Helmet** — Headers HTTP de segurança (CSP, Referrer-Policy, X-Frame-Options)
- **Rate Limiting** — Global (100 req/15min) + específico para auth (10 req/15min) com skip automático em sucesso

### 🏢 Arquitetura Multi-Tenant
- **Isolamento por Tenant** — Todo recurso é escopado por tenant via header `X-Tenant-ID` / `X-Tenant-Slug`
- **Middleware de Resolução de Tenant** — Lookup automático por UUID ou slug com validação de status ativo
- **Unicidade por Tenant** — Unicidade de email aplicada por tenant, não globalmente
- **Seeding de Tenant** — Tenant padrão criado no seed do banco de dados

### 🧾 Gerenciamento de Sessões
- **Sessões Persistentes** — Sessões armazenadas em banco de dados com rastreamento de IP, User-Agent e geolocalização
- **Listagem de Sessões** — Usuários podem visualizar todas as suas sessões ativas
- **Revogação de Sessões** — Revogar sessões individuais ou admin pode revogar todas as sessões de um usuário
- **Rastreamento por Família de Token** — Cada sessão possui uma cadeia de família de tokens; logout revoga a família inteira
- **Limpeza Automática** — Job agendado (a cada 6h) remove sessões expiradas e tokens antigos

### 🖐️ Fingerprinting de Dispositivos
- **Fingerprint SHA-256** — Gerado a partir de IP + User-Agent + Accept-Language + Timezone
- **Lógica de Upsert** — Rastreamento de primeiro acesso e último acesso com incremento de contagem de visitas
- **Por tenant, por usuário** — Constraint única em `(tenantId, userId, fingerprintHash)`
- **Extensível** — Campo `externalFingerprintId` pronto para FingerprintJS Pro ou serviços similares

### 📜 Audit Logging
- **Eventos Abrangentes** — `USER_REGISTER`, `USER_LOGIN`, `USER_LOGIN_FAILED`, `USER_LOGOUT`, `TOKEN_REFRESHED`, `TOKEN_REUSE_DETECTED`, `SESSION_REVOKED`, `PROFILE_UPDATED`, `PASSWORD_CHANGED`
- **Dados Contextuais** — Endereço IP, User-Agent e metadados JSON arbitrários por evento
- **Não-bloqueante** — Falhas no audit nunca quebram o fluxo principal da requisição
- **Escopado por Tenant** — Cada entrada de log vinculada ao seu tenant e usuário

### 👤 Gerenciamento de Usuários
- **CRUD de Perfil** — Obter e atualizar perfil do usuário (nome, email)
- **Suporte a Roles** — Roles `USER` e `ADMIN` com enforcement a nível de banco de dados
- **Endpoints de Admin** — Listar todos os usuários, revogar todas as sessões de qualquer usuário (somente admin)
- **Rastreamento de Último Login** — `lastLoginAt` atualizado a cada autenticação bem-sucedida

### 🧩 Sistema de Módulos Plug & Play
- **Auto-registro** — Módulos são declarados em um array simples e auto-montados com logging
- **Zero acoplamento** — Adicionar um novo módulo não requer mudanças no core
- **Slots preparados** — Finanças, Marketplace, ferramentas Admin planejados como módulos futuros

### 🖥️ Dashboard Frontend
- **Next.js 16 + React 19** — Frontend moderno SSR/CSR com Tailwind CSS
- **Landing Page** — Indicador animado de sistema online, grid de features, botões de CTA
- **Login & Registro** — Páginas de formulário com validação client-side
- **Dashboard Monitor de Sessão** — Exibição em tempo real de:
  - Identidade e role do usuário
  - Access token com contador regressivo ao vivo
  - Hash do refresh token, family ID e expiração
  - Preview do payload JWT (decodificado)
  - Tabela de sessões ativas com revogação individual
  - Histórico de rotações (OK / REUSE_DETECTED / ERROR)
  - Indicador de modo seguro (HttpOnly, Secure, SameSite)

### 🐳 Docker & DevOps
- **Docker Compose** — Stack completo (PostgreSQL + Backend + Frontend) com health checks
- **Dockerfile Multi-stage** — Builds de produção otimizados com estágios separados de deps/build/runtime
- **Docker Entrypoint** — Executa migrações Prisma automaticamente antes de iniciar o servidor
- **Graceful Shutdown** — Handlers SIGTERM / SIGINT com desconexão do Prisma
- **Validação de Ambiente** — Variáveis de ambiente validadas com Zod e falha antecipada em configuração inválida

### 🧪 Testes
- **Jest + ts-jest** — Test runner nativo para TypeScript
- **Supertest** — Testes de integração a nível HTTP
- **Categorias de Teste**:
  - **Unitários**: Serviço de tokens (hash, geração)
  - **Integração**: Rotas de auth (registro, login, refresh, logout, detecção de reuso), Middleware de tenant, Rotas de usuário (perfil, sessões)
- **BD de Teste Isolado** — `.env.test` separado com banco de dados dedicado
- **Ambiente de Teste Customizado** — Setup/teardown global com limpeza de Prisma por teste

---

## 🏗️ Arquitetura

```
CoreStack
├── backend/                    # API Express + Prisma
│   ├── src/
│   │   ├── core/               # 🔒 Camada Estável (raramente muda)
│   │   │   ├── config/         #    Conexão com BD, validação de env (Zod)
│   │   │   ├── errors/         #    Classes AppError, HttpError
│   │   │   ├── middlewares/    #    Middlewares Auth, Tenant, Error
│   │   │   ├── services/       #    Audit logging, Scheduler de limpeza
│   │   │   ├── utils/          #    Construtor de fingerprint, Hash, JWT helpers
│   │   │   └── modules/        #    Auto-registro de módulos
│   │   ├── modules/            # 🧩 Camada Expansível
│   │   │   ├── auth/           #    Register, Login, Refresh, Logout, Me
│   │   │   ├── user/           #    Perfil, Sessões, Rotas Admin
│   │   │   └── admin/          #    (Planejado)
│   │   └── __tests__/          #    Testes unitários + integração
│   ├── prisma/
│   │   ├── schema.prisma       #    6 modelos: Tenant, User, Session,
│   │   │                       #    RefreshToken, DeviceFingerprint, AuditLog
│   │   └── seed.ts             #    Tenant padrão + usuário admin
│   └── Dockerfile              #    Build de produção multi-stage
├── frontend/                   # Next.js 16 + React 19
│   ├── src/app/
│   │   ├── page.tsx            #    Landing page
│   │   ├── login/              #    Formulário de login
│   │   ├── register/           #    Formulário de registro
│   │   └── dashboard/          #    Monitor de Sessão (tempo real)
│   └── Dockerfile              #    Build de produção
└── docker-compose.yml          #    Orquestração full stack
```

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js 20+ |
| Linguagem | TypeScript 5.9 |
| Framework Backend | Express 5 |
| ORM | Prisma 7 |
| Banco de Dados | PostgreSQL 16 |
| Autenticação | JWT (Access + Refresh) com HS256 |
| Validação | Zod 4 |
| Segurança | Helmet, bcrypt, express-rate-limit |
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Testes | Jest 30, Supertest, ts-jest |
| DevOps | Docker, Docker Compose |
| Ferramentas Dev | ts-node-dev, Prisma CLI, ESLint |

---

## 📡 Referência da API

### Auth (`/auth`)
> Todas as rotas de auth requerem o header `X-Tenant-ID`.

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| `POST` | `/auth/register` | — | Registrar novo usuário |
| `POST` | `/auth/login` | — | Login e receber par de tokens |
| `POST` | `/auth/refresh` | Cookie | Rotacionar refresh token |
| `POST` | `/auth/logout` | Cookie | Revogar toda a família de tokens |
| `GET` | `/auth/me` | Bearer | Obter usuário atual + metadados do token |

### Usuários (`/users`)
> Todas as rotas de usuário requerem `X-Tenant-ID` + Bearer token.

| Método | Endpoint | Role | Descrição |
|--------|----------|------|-----------|
| `GET` | `/users/me` | Qualquer | Obter próprio perfil |
| `PUT` | `/users/me` | Qualquer | Atualizar próprio perfil (nome, email) |
| `GET` | `/users/me/sessions` | Qualquer | Listar sessões ativas próprias |
| `DELETE` | `/users/me/sessions/:id` | Qualquer | Revogar uma sessão específica |
| `GET` | `/users/` | Admin | Listar todos os usuários do tenant |
| `DELETE` | `/users/:userId/sessions` | Admin | Revogar todas as sessões de um usuário |

### Admin
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/admin/cleanup` | Disparar limpeza manual de sessões/tokens expirados |

### Health
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/` | Status do serviço + módulos registrados |

---

## 🔒 Design de Segurança

| Camada | Implementação |
|--------|---------------|
| Armazenamento de Senha | bcrypt com salt rounds |
| Access Token | JWT HS256, expiração de 15min (configurável) |
| Refresh Token | JWT HS256, expiração de 7 dias (configurável), armazenado como hash SHA-256 |
| Rotação de Token | Token antigo → `USED`, novo token gerado, vinculado via `replacedBy` |
| Detecção de Reuso | Reenviar um token `USED` revoga toda a família (`REVOKED`) |
| Validação de Sessão | Middleware de auth verifica existência e expiração da sessão a cada request |
| Enforcement de Role | Role atualizada buscada do BD a cada request (não apenas do token) |
| Rate Limiting | Global 100/15min + Auth 10/15min com `skipSuccessfulRequests` |
| Segurança HTTP | Helmet (CSP, Referrer-Policy, headers rigorosos) |
| CORS | Origem configurável com suporte a credentials |
| Validação de Ambiente | Schema Zod — servidor recusa iniciar com configuração inválida |
| Fingerprinting | Hash SHA-256 de IP + User-Agent + Accept-Language + Timezone |
| Graceful Shutdown | Handlers SIGTERM/SIGINT fecham servidor e desconectam Prisma |

---

## 🚀 Como Começar

### Pré-requisitos
- Node.js 20+
- PostgreSQL 16+ (ou Docker)
- npm

### Opção 1: Docker (Recomendado)

```bash
# Clone o repositório
git clone https://github.com/Ecandiido93/CoreStack.git
cd CoreStack

# Configure o ambiente
cp .env.example .env
# Edite .env com seu JWT_SECRET (mín 32 caracteres)

# Inicie todos os serviços
docker compose up -d
```

A stack estará disponível em:
- **Frontend**: http://localhost:3000
- **API Backend**: http://localhost:3001
- **PostgreSQL**: localhost:5432

### Opção 2: Desenvolvimento Local

```bash
# Clone e instale
git clone https://github.com/Ecandiido93/CoreStack.git
cd CoreStack

# Backend
cd backend
npm install
cp .env.test.example .env   # ou crie seu próprio .env
npx prisma generate
npx prisma migrate dev
npx prisma db seed           # Cria tenant padrão
npm run dev

# Frontend (em outro terminal)
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

### Variáveis de Ambiente

```env
# PostgreSQL
POSTGRES_USER=corestack
POSTGRES_PASSWORD=corestack
POSTGRES_DB=corestack

# JWT (gere com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=seu_super_segredo_minimo_32_caracteres_aqui

# URLs
CORS_ORIGIN=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_TENANT_ID=default

# Expiração de Tokens
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES_DAYS=7
```

---

## 🧪 Executando os Testes

```bash
cd backend

# Executar todos os testes
npm test

# Modo watch
npm run test:watch

# Relatório de cobertura
npm run test:coverage
```

Os testes usam um banco de dados separado (`.env.test`) com setup/teardown automatizado.

---

## 🗄️ Banco de Dados

### Modelos

| Modelo | Descrição |
|--------|-----------|
| `Tenant` | Organização/workspace com slug e status ativo |
| `User` | Usuário escopado por tenant com role, unicidade de email por tenant |
| `Session` | Sessão de login com IP, User-Agent, geolocalização, expiração |
| `RefreshToken` | Cadeia de tokens com rastreamento por família, status (ACTIVE/USED/REVOKED), hash |
| `DeviceFingerprint` | Rastreamento de dispositivo com hash SHA-256, contagem de acessos, extensível |
| `AuditLog` | Log de eventos com ação, IP, User-Agent, metadados JSON |

### Comandos Úteis

```bash
npx prisma migrate dev    # Executar migrações
npx prisma studio         # Abrir GUI do banco de dados
npx prisma db seed        # Semear dados padrão
```

---

## 🧪 Testando o Fluxo de Autenticação

### 1. Registro
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: default" \
  -d '{"name": "João Silva", "email": "joao@exemplo.com", "password": "Test123"}'
```

### 2. Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: default" \
  -d '{"email": "joao@exemplo.com", "password": "Test123"}'
```

### 3. Refresh Token (Rotação)
```bash
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: default" \
  --cookie "refreshToken=SEU_REFRESH_TOKEN"
```
**Comportamento esperado**: Novo access token + refresh token rotacionado. Token antigo marcado como `USED`.

### 4. Teste de Ataque de Reuso
Reenvie o refresh token **antigo** após a rotação:
```bash
# Esperado: 401 — "Refresh token reuse detected"
# Todos os tokens da família são revogados
```

### 5. Logout
```bash
curl -X POST http://localhost:3001/auth/logout \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: default" \
  --cookie "refreshToken=SEU_REFRESH_TOKEN"
```
**Comportamento esperado**: Toda a família de tokens é revogada. Nenhum refresh futuro é possível.

---

## 📈 Roadmap

- [x] Autenticação JWT (Access + Refresh)
- [x] Rotação de Refresh Token com Detecção de Reuso
- [x] Arquitetura Multi-Tenant
- [x] Gerenciamento de Sessões Persistentes
- [x] Fingerprinting de Dispositivos
- [x] Sistema de Audit Logging
- [x] Suporte a Roles (USER / ADMIN)
- [x] Rate Limiting
- [x] Deploy via Docker Compose
- [x] Testes de Integração & Unitários
- [x] Frontend Next.js + Dashboard Monitor de Sessão
- [x] Scheduler de Limpeza Automática
- [x] Validação de Ambiente com Zod
- [x] Graceful Shutdown
- [ ] RBAC (Controle de Acesso Baseado em Roles) — permissões granulares
- [ ] Verificação de Email
- [ ] Fluxo de Recuperação de Senha
- [ ] Documentação Swagger / OpenAPI
- [ ] Pipeline CI/CD
- [x] Cookies HTTP-only (Secure + SameSite=Strict)
- [ ] Proteção CSRF
- [ ] Guia de Deploy em Produção

---

## 🎯 Propósito

Este projeto foi construído para:
1. Demonstrar habilidades reais de engenharia de backend
2. Aplicar arquitetura multi-tenant escalável
3. Construir um core SaaS reutilizável e extensível
4. Focar em boas práticas de segurança e manutenibilidade
5. Simular um sistema full-stack de nível produção

---

## 📌 Status

🚧 **Em Desenvolvimento Ativo** — Fundação core totalmente implementada. Novos módulos e melhorias em breve.

---

## 👨‍💻 Autor

**Emerson R. Candido**
Construindo sistemas sólidos, uma camada de cada vez.

---

<div align="center">

Feito com ☕ e dedicação

</div>
