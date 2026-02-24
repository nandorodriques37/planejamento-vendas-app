# Especificação da API REST

Especificação dos endpoints necessários para migrar o sistema de dados estáticos (mockData.ts) para uma API REST conectada ao datalake.

---

## Base URL

```
Produção: https://previsao.empresa.com.br/api/v1
Desenvolvimento: http://localhost:3001/api/v1
```

## Autenticação

Todas as requisições devem incluir o header:
```
Authorization: Bearer <jwt_token>
```

---

## Endpoints

### 1. Produtos

#### GET /products

Lista produtos com filtros e paginação.

**Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| page | number | Não (default: 1) | Página atual |
| limit | number | Não (default: 50) | Itens por página |
| codigo | number | Não | Filtrar por código do produto |
| categoria3 | string | Não | Filtrar por Categoria Nível 3 |
| categoria4 | string | Não | Filtrar por Categoria Nível 4 |
| fornecedor | string[] | Não | Filtrar por fornecedor(es) comercial(is). Aceita múltiplos valores separados por vírgula: `fornecedor=NOVO+NORDISK,ABBOTT` |
| comprador | string[] | Não | Filtrar por comprador(es). Aceita múltiplos valores: `comprador=THATYANNE,MARCOS` |
| cd | string[] | Não | Filtrar por Centro(s) de Distribuição. Aceita múltiplos valores: `cd=CD+1,CD+2` |
| categoria3 | string[] | Não | Filtrar por Categoria(s) Nível 3. Aceita múltiplos valores |
| categoria4 | string[] | Não | Filtrar por Categoria(s) Nível 4. Aceita múltiplos valores |
| search | string | Não | Busca textual (código, nome, categoria) |

**Resposta (200):**

```json
{
  "data": [
    {
      "codigo": 79444,
      "nome": "MOUNJARO 5MG C/4 SERINGAS+",
      "categoria3": "DIABETES",
      "categoria4": "DIABETES-INJETAVEL",
      "fornecedor": "LILLY MOUNJARO",
      "comprador": "THATYANNE",
      "cd": "CD 1",
      "forecast": 32883,
      "originalForecast": 32883
    }
  ],
  "total": 881,
  "page": 1,
  "pages": 18,
  "limit": 50
}
```

---

### 2. Dados Mensais

#### GET /monthly-data

Retorna dados mensais agregados para o gráfico.

**Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| startMonth | string | Não (default: "2023-01") | Mês inicial (YYYY-MM) |
| endMonth | string | Não (default: "2026-12") | Mês final (YYYY-MM) |
| fornecedor | string[] | Não | Filtrar por fornecedor(es). Aceita múltiplos valores separados por vírgula |
| categoria4 | string[] | Não | Filtrar por categoria(s). Aceita múltiplos valores |
| cd | string[] | Não | Filtrar por CD(s). Aceita múltiplos valores |

**Resposta (200):**

```json
{
  "data": [
    {
      "month": "Jan/23",
      "historico": 145230,
      "qtdBruta": 158900,
      "previsao": null,
      "previsaoAjustada": null
    },
    {
      "month": "Fev/26",
      "historico": null,
      "qtdBruta": null,
      "previsao": 245462,
      "previsaoAjustada": 253800
    }
  ]
}
```

**Regras:**
- Meses históricos: `historico` e `qtdBruta` preenchidos, `previsao` = null
- Meses forecast: `previsao` e `previsaoAjustada` preenchidos, `historico` = null
- Quando filtrado por fornecedor, valores são proporcionais ao fornecedor

---

### 3. Comparativo por Categoria

#### GET /comparison

Retorna dados comparativos por Categoria Nível 4.

**Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| fornecedor | string[] | Não | Filtrar por fornecedor(es). Aceita múltiplos valores |
| cd | string[] | Não | Filtrar por CD(s). Aceita múltiplos valores |
| categoria3 | string[] | Não | Filtrar por Categoria(s) Nível 3. Aceita múltiplos valores |
| categoria4 | string[] | Não | Filtrar por Categoria(s) Nível 4. Aceita múltiplos valores |
| comprador | string[] | Não | Filtrar por comprador(es). Aceita múltiplos valores |
| sort | string | Não (default: "mes0_desc") | Ordenação |

**Resposta (200):**

```json
{
  "data": [
    {
      "categoria": "DIABETES-INJETAVEL",
      "mes0": 180793,
      "varLY": -4.3,
      "varLM": 2.1,
      "mes1": 209282,
      "varLY1": 15.8,
      "mes2": 205498,
      "varLY2": 12.3,
      "triAnterior": 520000,
      "ultTrimestre": 545000,
      "triAtual": 595183,
      "triPenultimo": 530000,
      "varTriLY": 14.4,
      "varTriPenult": 12.3,
      "varTriUltTri": 9.2,
      "confidence": {
        "level": "alta",
        "score": 77,
        "cv": 4.8,
        "maxVar": 15.8,
        "reasons": ["CV 4.8% — estável no histórico", "Variações < 200 un./tri"]
      },
      "sparkline": {
        "months": ["Jun/25", "Jul/25", "Ago/25", "Set/25", "Out/25", "Nov/25", "Dez/25", "Jan/26"],
        "values": [145230, 148900, 152100, 149800, 155200, 158400, 161000, 163500]
      }
    }
  ],
  "total": 19
}
```

---

### 4. Ajustes Colaborativos

#### POST /adjustments

Cria um novo ajuste de previsão.

**Request Body:**

```json
{
  "categoria_n4": "DIABETES-INJETAVEL",
  "mes": "Fev/26",
  "percentual_ajuste": 3.5,
  "comentario": "Campanha de marketing regional no Sudeste"
}
```

**Resposta (201):**

```json
{
  "id": 1,
  "categoria_n4": "DIABETES-INJETAVEL",
  "mes": "Fev/26",
  "percentual_ajuste": 3.5,
  "valor_original": 2751576,
  "valor_ajustado": 2830912,
  "usuario": "THATYANNE",
  "status": "Aprovado",
  "created_at": "2026-02-08T20:41:00Z"
}
```

**Validações:**
- `percentual_ajuste`: entre -100% e +500%
- `categoria_n4`: deve existir no banco
- Usuário deve ter perfil `editor` ou superior

---

#### GET /adjustments/log

Retorna log de auditoria dos ajustes.

**Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| page | number | Não (default: 1) | Página atual |
| limit | number | Não (default: 20) | Itens por página |
| usuario | string | Não | Filtrar por nome do usuário |
| status | string | Não | Filtrar por status (Aprovado, Pendente, Revertido) |
| categoria | string | Não | Filtrar por categoria |
| startDate | string | Não | Data inicial (ISO 8601) |
| endDate | string | Não | Data final (ISO 8601) |

**Resposta (200):**

```json
{
  "data": [
    {
      "id": 1,
      "timestamp": "2026-02-08T20:41:00Z",
      "usuario": "THATYANNE",
      "tipo": "CATEGORIA NÍVEL 4",
      "item": "DIABETES-INJETAVEL",
      "acao": "AJUSTE",
      "detalhe": "+3.5%",
      "valorAnterior": 2751576,
      "valorNovo": 2830912,
      "status": "Aprovado"
    }
  ],
  "total": 2,
  "page": 1,
  "pages": 1
}
```

---

#### POST /adjustments/:id/revert

Reverte um ajuste específico.

**Resposta (200):**

```json
{
  "success": true,
  "id": 1,
  "reverted_by": "GESTOR_COMERCIAL",
  "reverted_at": "2026-02-09T10:30:00Z"
}
```

---

### 5. Filtros Disponíveis

#### GET /filters

Retorna listas de valores disponíveis para os filtros. Suporta busca por digitação (autocomplete) via parâmetro `search`.

**Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|----------|
| search | string | Não | Texto para filtrar opções (case-insensitive, busca parcial) |
| field | string | Não | Campo específico a filtrar (fornecedor, categoria3, categoria4, comprador, cd) |

**Exemplo de uso (autocomplete no frontend):**
```
GET /api/v1/filters?field=fornecedor&search=NOVO
→ Retorna apenas fornecedores que contêm "NOVO" no nome
```

**Resposta (200):**

```json
{
  "fornecedores": ["ABBOTT AME CONSIG", "ABBVIE AME CONSIG", "..."],
  "categorias3": ["DIABETES", "OFTALMOLOGIA", "..."],
  "categorias4": ["DIABETES-INJETAVEL", "ANTIGLAUCOMATOSO", "..."],
  "compradores": ["THATYANNE", "MARCOS", "..."],
  "centrosDistribuicao": ["CD 1", "CD 2", "CD 3", "..."],
  "total": {
    "fornecedores": 57,
    "categorias3": 15,
    "categorias4": 28,
    "compradores": 12,
    "centrosDistribuicao": 9
  }
}
```

---

### 6. Exportação

#### GET /export/excel

Gera e retorna arquivo Excel com dados filtrados.

**Query Parameters:** Mesmos filtros de `/products`

**Resposta:** Arquivo `.xlsx` (Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)

#### GET /export/pdf

Gera e retorna relatório PDF.

**Query Parameters:** Mesmos filtros de `/products`

**Resposta:** Arquivo `.pdf` (Content-Type: application/pdf)

---

### 7. Webhook (Datalake → Sistema)

#### POST /webhook/datalake-update

Notifica o sistema sobre novas previsões disponíveis no datalake.

**Request Body:**

```json
{
  "tipo": "nova_previsao",
  "timestamp": "2026-02-10T06:00:00Z",
  "versao": "2026-W07",
  "total_produtos": 881,
  "total_meses": 11
}
```

**Autenticação:** Header `X-Webhook-Secret: <secret>`

**Resposta (200):**

```json
{
  "status": "ok",
  "synced_at": "2026-02-10T06:01:30Z",
  "produtos_atualizados": 881
}
```

---

## Códigos de Erro

| Código | Significado | Exemplo |
|--------|-----------|---------|
| 400 | Requisição inválida | Parâmetros de filtro inválidos |
| 401 | Não autenticado | Token JWT ausente ou expirado |
| 403 | Não autorizado | Perfil sem permissão para a ação |
| 404 | Não encontrado | Ajuste ID não existe |
| 409 | Conflito | Ajuste já revertido |
| 422 | Entidade não processável | Percentual fora do range permitido |
| 429 | Rate limit excedido | Muitas requisições em pouco tempo |
| 500 | Erro interno | Falha no banco de dados |
| 503 | Serviço indisponível | Datalake fora do ar |

**Formato de erro:**

```json
{
  "error": {
    "code": "ADJUSTMENT_ALREADY_REVERTED",
    "message": "O ajuste #1 já foi revertido em 2026-02-09T10:30:00Z",
    "details": {
      "adjustment_id": 1,
      "reverted_at": "2026-02-09T10:30:00Z",
      "reverted_by": "GESTOR_COMERCIAL"
    }
  }
}
```
