# Guia de Deployment e Migração para Produção

Este documento detalha os passos necessários para migrar o protótipo de Previsão de Vendas Colaborativa para um ambiente de produção corporativo.

---

## Sumário

1. [Pré-requisitos de Infraestrutura](#pré-requisitos-de-infraestrutura)
2. [Fase 1: Deploy do Frontend Estático](#fase-1-deploy-do-frontend-estático)
3. [Fase 2: Backend API](#fase-2-backend-api)
4. [Fase 3: Banco de Dados](#fase-3-banco-de-dados)
5. [Fase 4: Integração com Datalake](#fase-4-integração-com-datalake)
6. [Fase 5: Autenticação e Autorização](#fase-5-autenticação-e-autorização)
7. [Fase 6: Monitoramento e Observabilidade](#fase-6-monitoramento-e-observabilidade)
8. [Checklist de Go-Live](#checklist-de-go-live)

---

## Pré-requisitos de Infraestrutura

### Mínimo Recomendado

| Componente | Especificação | Observação |
|-----------|--------------|------------|
| Servidor Web | 2 vCPU, 4GB RAM | Nginx para servir SPA |
| Servidor API | 4 vCPU, 8GB RAM | Node.js 22+ |
| Banco de Dados | PostgreSQL 16+ | 2 vCPU, 4GB RAM, 50GB SSD |
| Cache | Redis 7+ | 1 vCPU, 2GB RAM |
| SSL/TLS | Certificado válido | Let's Encrypt ou corporativo |

### Rede

- Porta 443 (HTTPS) aberta para usuários internos
- Porta 5432 (PostgreSQL) acessível apenas pelo servidor API
- Porta 6379 (Redis) acessível apenas pelo servidor API
- DNS interno configurado (ex: `previsao.empresa.com.br`)

---

## Fase 1: Deploy do Frontend Estático

### 1.1 Build de Produção

```bash
cd previsao-vendas-mockup
pnpm install --frozen-lockfile
pnpm build
```

Os arquivos estáticos serão gerados em `dist/`.

> **Nota sobre Filtros Multi-Seleção:** Na versão atual (protótipo), todos os 5 filtros dropdown suportam seleção múltipla com checkboxes, busca por digitação e badges. A filtragem é feita localmente no frontend. Em produção, para volumes maiores de dados (10k+ fornecedores/categorias), recomenda-se:
> - Implementar busca server-side via endpoint `GET /api/v1/filters?field=fornecedor&search=NOVO` com debounce de 300ms
> - Paginar as opções dos dropdowns (carregar primeiras 50, buscar mais sob demanda)
> - Os parâmetros de filtro da API aceitam múltiplos valores separados por vírgula: `fornecedor=NOVO+NORDISK,ABBOTT`
>
> **Nota sobre Indicadores de Confiança:** O cálculo de confiança (CV dos trimestres + magnitude das variações) é feito no frontend. Em produção, recomenda-se calcular no backend e incluir no response da API `/comparison` como campo `confidence` (ver API_SPEC.md).
>
> **Nota sobre Sparklines:** Os dados de tendência (8 meses) são agregados no frontend a partir de `catN4CdMonthlyHistorico`. Em produção, recomenda-se que a API `/comparison` retorne o campo `sparkline` já pré-calculado para reduzir processamento no cliente.

### 1.2 Configuração Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name previsao.empresa.com.br;

    ssl_certificate /etc/ssl/certs/previsao.crt;
    ssl_certificate_key /etc/ssl/private/previsao.key;

    root /var/www/previsao-vendas/dist;
    index index.html;

    # SPA fallback - todas as rotas apontam para index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache agressivo para assets com hash
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy para API (quando implementada)
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:;" always;
}
```

### 1.3 Deploy com Docker (Alternativa)

```dockerfile
# Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build: .
    ports:
      - "443:80"
    restart: always
    
  api:
    build: ./server
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/previsao
      - REDIS_URL=redis://cache:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
      - cache
    restart: always
    
  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./sql/init.sql:/docker-entrypoint-initdb.d/init.sql
    environment:
      - POSTGRES_DB=previsao
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    restart: always
    
  cache:
    image: redis:7-alpine
    restart: always

volumes:
  pgdata:
```

---

## Fase 2: Backend API

### 2.1 Estrutura Sugerida

```
server/
├── src/
│   ├── index.ts              # Entry point Express
│   ├── routes/
│   │   ├── products.ts       # CRUD de produtos
│   │   ├── adjustments.ts    # Ajustes colaborativos
│   │   ├── monthly-data.ts   # Dados mensais agregados
│   │   ├── comparison.ts     # Dados comparativos
│   │   ├── export.ts         # Exportação Excel/PDF
│   │   └── auth.ts           # Autenticação
│   ├── middleware/
│   │   ├── auth.ts           # Verificação JWT
│   │   ├── rbac.ts           # Controle de acesso por perfil
│   │   └── validation.ts     # Validação de entrada
│   ├── services/
│   │   ├── datalake.ts       # Integração com datalake
│   │   ├── forecast.ts       # Lógica de previsão
│   │   └── cache.ts          # Gerenciamento de cache Redis
│   └── db/
│       ├── connection.ts     # Pool de conexões PostgreSQL
│       └── migrations/       # Migrações de schema
├── package.json
└── tsconfig.json
```

### 2.2 Endpoints da API

```typescript
// GET /api/products?fornecedor=NOVO+NORDISK&categoria4=DIABETES-INJETAVEL&cd=1&page=1&limit=50
// Resposta: { data: Product[], total: number, page: number, pages: number }

// GET /api/monthly-data?startMonth=2023-01&endMonth=2026-12&fornecedor=NOVO+NORDISK
// Resposta: FilteredMonthlyPoint[]

// GET /api/comparison?fornecedor=NOVO+NORDISK
// Resposta: ComparisonRow[]

// POST /api/adjustments
// Body: { categoria_n4: string, mes: string, percentual: number, comentario?: string }
// Resposta: { id: number, status: "Aprovado" }

// GET /api/adjustments/log?page=1&limit=20&usuario=THATYANNE&status=Aprovado
// Resposta: { data: AuditEntry[], total: number }

// POST /api/adjustments/:id/revert
// Resposta: { success: true, reverted_by: string }
```

### 2.3 Variáveis de Ambiente

```env
# .env.production
NODE_ENV=production
PORT=3001

# Banco de Dados
DATABASE_URL=postgresql://previsao_user:senha_segura@db-host:5432/previsao_vendas
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://cache-host:6379
REDIS_TTL=300

# JWT
JWT_SECRET=chave-secreta-256-bits-minimo
JWT_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# Datalake
DATALAKE_API_URL=https://datalake.empresa.com.br/api/v1
DATALAKE_API_KEY=chave-do-datalake

# CORS
CORS_ORIGIN=https://previsao.empresa.com.br

# Logs
LOG_LEVEL=info
LOG_FORMAT=json
```

---

## Fase 3: Banco de Dados

### 3.1 Schema Completo

```sql
-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários (se não usar SSO)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

-- Tabela de ajustes de previsão
CREATE TABLE forecast_adjustments (
    id SERIAL PRIMARY KEY,
    categoria_n4 VARCHAR(100) NOT NULL,
    cd VARCHAR(10),
    mes VARCHAR(10) NOT NULL,
    percentual_ajuste DECIMAL(8,2) NOT NULL,
    valor_original BIGINT NOT NULL,
    valor_ajustado BIGINT NOT NULL,
    usuario_id UUID REFERENCES users(id),
    usuario_nome VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'Aprovado',
    comentario TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    reverted_at TIMESTAMP,
    reverted_by UUID REFERENCES users(id)
);

-- Tabela de cache de produtos (atualizada pelo datalake)
CREATE TABLE products_cache (
    id SERIAL PRIMARY KEY,
    codigo INTEGER NOT NULL,
    nome VARCHAR(200) NOT NULL,
    categoria_n3 VARCHAR(100),
    categoria_n4 VARCHAR(100),
    fornecedor VARCHAR(100),
    comprador VARCHAR(100),
    cd VARCHAR(10),
    forecast_total BIGINT,
    original_forecast_total BIGINT,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(codigo, cd)
);

-- Tabela de dados mensais (atualizada pelo datalake)
CREATE TABLE monthly_data (
    id SERIAL PRIMARY KEY,
    month VARCHAR(10) NOT NULL,
    tipo VARCHAR(20) NOT NULL, -- 'historico' ou 'forecast'
    venda_regular BIGINT,
    qtd_bruta BIGINT,
    previsao BIGINT,
    categoria_n4 VARCHAR(100),
    cd VARCHAR(10),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(month, categoria_n4, cd)
);

-- Índices para performance
CREATE INDEX idx_adjustments_categoria ON forecast_adjustments(categoria_n4);
CREATE INDEX idx_adjustments_status ON forecast_adjustments(status);
CREATE INDEX idx_adjustments_created ON forecast_adjustments(created_at DESC);
CREATE INDEX idx_products_fornecedor ON products_cache(fornecedor);
CREATE INDEX idx_products_categoria4 ON products_cache(categoria_n4);
CREATE INDEX idx_products_cd ON products_cache(cd);
CREATE INDEX idx_products_comprador ON products_cache(comprador);
CREATE INDEX idx_monthly_month ON monthly_data(month);
CREATE INDEX idx_monthly_categoria ON monthly_data(categoria_n4);

-- Tabela de indicadores de confiança por categoria (atualizada pelo backend)
CREATE TABLE confidence_indicators (
    id SERIAL PRIMARY KEY,
    categoria_n4 VARCHAR(100) NOT NULL UNIQUE,
    level VARCHAR(10) NOT NULL DEFAULT 'media',  -- 'alta', 'media', 'baixa'
    score INTEGER NOT NULL DEFAULT 50,             -- 0-100
    cv DECIMAL(6,2),                               -- Coeficiente de Variação (%)
    max_var DECIMAL(8,2),                          -- Maior variação absoluta (%)
    reasons TEXT[],                                 -- Array de razões
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_confidence_level ON confidence_indicators(level);

-- View para dados agregados
CREATE VIEW v_monthly_aggregated AS
SELECT 
    month,
    tipo,
    SUM(venda_regular) as total_venda_regular,
    SUM(qtd_bruta) as total_qtd_bruta,
    SUM(previsao) as total_previsao
FROM monthly_data
GROUP BY month, tipo
ORDER BY month;

-- View para comparativo com penúltimo trimestre
CREATE VIEW v_comparison_quarterly AS
SELECT
    categoria_n4,
    SUM(CASE WHEN month BETWEEN '2025-02' AND '2025-04' THEN previsao END) as tri_anterior,
    SUM(CASE WHEN month BETWEEN '2025-08' AND '2025-10' THEN previsao END) as tri_penultimo,
    SUM(CASE WHEN month BETWEEN '2025-11' AND '2026-01' THEN previsao END) as ult_trimestre,
    SUM(CASE WHEN month BETWEEN '2026-02' AND '2026-04' THEN previsao END) as tri_atual
FROM monthly_data
GROUP BY categoria_n4;
```

### 3.2 Migração de Dados

```bash
# Script de migração do LocalStorage para PostgreSQL
# Executar uma única vez após setup do banco

node scripts/migrate-localstorage-to-db.mjs
```

### 3.3 Backup

```bash
# Backup diário (cron: 0 2 * * *)
pg_dump -h db-host -U previsao_user -d previsao_vendas \
  --format=custom --compress=9 \
  -f /backups/previsao_$(date +%Y%m%d_%H%M%S).dump

# Retenção: 30 dias
find /backups -name "previsao_*.dump" -mtime +30 -delete
```

---

## Fase 4: Integração com Datalake

### 4.1 Job de Sincronização

```typescript
// scripts/sync-datalake.ts
// Executar via cron: segunda-feira às 06:00

import { Pool } from 'pg';

async function syncFromDatalake() {
  const response = await fetch(`${DATALAKE_API_URL}/forecast/latest`, {
    headers: { 'Authorization': `Bearer ${DATALAKE_API_KEY}` }
  });
  
  const data = await response.json();
  
  // Upsert produtos
  for (const product of data.produtos) {
    await pool.query(`
      INSERT INTO products_cache (codigo, nome, categoria_n3, categoria_n4, fornecedor, comprador, cd, forecast_total, original_forecast_total)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
      ON CONFLICT (codigo, cd) DO UPDATE SET
        forecast_total = EXCLUDED.forecast_total,
        original_forecast_total = EXCLUDED.original_forecast_total,
        updated_at = NOW()
    `, [product.codigo, product.nome, product.cat_n3, product.cat_n4, product.fornecedor, product.comprador, product.cd, product.previsao]);
  }
  
  // Reaplicar ajustes existentes
  const adjustments = await pool.query(`
    SELECT * FROM forecast_adjustments WHERE status = 'Aprovado'
  `);
  
  for (const adj of adjustments.rows) {
    await pool.query(`
      UPDATE products_cache 
      SET forecast_total = original_forecast_total * (1 + $1 / 100.0)
      WHERE categoria_n4 = $2
    `, [adj.percentual_ajuste, adj.categoria_n4]);
  }
  
  console.log(`Sincronização concluída: ${data.produtos.length} produtos atualizados`);
}
```

### 4.2 Webhook (Alternativa ao Cron)

```typescript
// POST /api/webhook/datalake-update
// Chamado pelo datalake quando novas previsões estão disponíveis

app.post('/api/webhook/datalake-update', 
  authenticateWebhook,
  async (req, res) => {
    const { tipo, timestamp } = req.body;
    
    if (tipo === 'nova_previsao') {
      await syncFromDatalake();
      res.json({ status: 'ok', synced_at: new Date() });
    }
  }
);
```

---

## Fase 5: Autenticação e Autorização

### 5.1 Opção A: SSO Corporativo (Recomendado)

Se a empresa usa Active Directory / LDAP:

```typescript
import passport from 'passport';
import { Strategy as LDAPStrategy } from 'passport-ldapauth';

passport.use(new LDAPStrategy({
  server: {
    url: 'ldaps://ad.empresa.com.br:636',
    bindDN: 'cn=svc-previsao,ou=services,dc=empresa,dc=com,dc=br',
    bindCredentials: process.env.LDAP_PASSWORD,
    searchBase: 'ou=users,dc=empresa,dc=com,dc=br',
    searchFilter: '(sAMAccountName={{username}})'
  }
}));
```

### 5.2 Opção B: JWT Standalone

```typescript
import jwt from 'jsonwebtoken';

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await findUserByEmail(email);
  
  if (!user || !await bcrypt.compare(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }
  
  const token = jwt.sign(
    { id: user.id, nome: user.nome, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  res.json({ token, user: { nome: user.nome, role: user.role } });
});

// Middleware de autorização por perfil
function requireRole(...roles: string[]) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    next();
  };
}

// Uso: apenas editores e aprovadores podem ajustar
app.post('/api/adjustments', requireRole('editor', 'approver', 'admin'), ...);
```

---

## Fase 6: Monitoramento e Observabilidade

### 6.1 Health Check

```typescript
// GET /api/health
app.get('/api/health', async (req, res) => {
  const checks = {
    api: 'ok',
    database: await checkDatabase(),
    redis: await checkRedis(),
    datalake: await checkDatalake(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date()
  };
  
  const healthy = Object.values(checks).every(v => v !== 'error');
  res.status(healthy ? 200 : 503).json(checks);
});
```

### 6.2 Logs Estruturados

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: '/var/log/previsao/error.log', level: 'error' }),
    new winston.transports.File({ filename: '/var/log/previsao/combined.log' }),
  ],
});

// Log de ajustes (auditoria)
logger.info('Ajuste realizado', {
  usuario: req.user.nome,
  categoria: 'DIABETES-INJETAVEL',
  percentual: 3.5,
  ip: req.ip,
  timestamp: new Date()
});
```

### 6.3 Alertas

| Alerta | Condição | Ação |
|--------|---------|------|
| API Down | Health check falha 3x consecutivas | Notificar TI via email/Slack |
| Banco Lento | Query > 5s | Log warning + investigar |
| Disco Cheio | > 85% uso | Notificar TI |
| Erro de Sync | Falha na sincronização com datalake | Retry 3x + notificar |
| Login Suspeito | > 10 tentativas falhas em 5min | Bloquear IP temporariamente |

---

## Checklist de Go-Live

### Infraestrutura
- [ ] Servidor web provisionado e configurado
- [ ] Certificado SSL/TLS instalado
- [ ] DNS interno configurado
- [ ] Firewall configurado (apenas portas necessárias)
- [ ] Backup automático configurado

### Aplicação
- [ ] Build de produção gerado sem erros
- [ ] Variáveis de ambiente configuradas
- [ ] API REST implementada e testada
- [ ] Banco de dados criado com schema e índices
- [ ] Migração de dados do protótipo concluída

### Segurança
- [ ] Autenticação implementada (SSO ou JWT)
- [ ] CORS configurado (apenas domínio da empresa)
- [ ] Headers de segurança configurados no Nginx
- [ ] Rate limiting ativo
- [ ] Audit trail funcionando

### Integração
- [ ] Conexão com datalake testada
- [ ] Job de sincronização agendado
- [ ] Webhook configurado (se aplicável)
- [ ] Dados iniciais carregados

### Monitoramento
- [ ] Health check endpoint ativo
- [ ] Logs estruturados configurados
- [ ] Alertas configurados
- [ ] Dashboard de monitoramento criado

### Validação
- [ ] Testes de carga realizados (50+ usuários simultâneos)
- [ ] Testes de segurança (OWASP Top 10)
- [ ] Testes de usabilidade com equipe comercial
- [ ] Plano de rollback documentado
- [ ] Treinamento da equipe comercial realizado

---

## Suporte

Para questões sobre este documento ou a migração para produção, entre em contato com a equipe de desenvolvimento.
