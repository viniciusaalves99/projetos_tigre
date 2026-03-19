# Automação de Envio de Pontos Extras (PE)

Automação em Python para geração e envio de relatórios semanais de **Pontos Extras** para Especialistas e Gerentes via e-mail (Outlook), com arquivos Excel personalizados e filtrados por destinatário.

---

## Pré-requisitos

- Windows com **Microsoft Outlook** instalado (necessário apenas para envio de e-mails em modo produção)
- Python 3.x com as bibliotecas:
  ```
  pandas
  openpyxl
  pywin32
  ```

---

## Arquivos necessários

```
<pasta configurada>
├── Base_Extracao_PE_Produto_Foco_TESTE1.xlsx  ← Base de dados com os registros de PE
├── Arquivos_Gerados\                           ← Relatórios gerados (criado automaticamente)
│   └── TESTE\                                  ← Relatórios gerados em modo teste
└── LOG_ENVIO_PE.xlsx                           ← Log de envios e erros (criado automaticamente)
```

> Não é necessário nenhum arquivo de modelo — os relatórios são criados do zero pelo código.

---

## Colunas obrigatórias na base de dados

| Coluna                | Descrição                           |
|-----------------------|-------------------------------------|
| `ESPECIALISTA`        | Nome do especialista responsável    |
| `EMAIL ESPECIALISTA`  | E-mail do especialista              |
| `GERENTE`             | Nome do gerente responsável         |
| `EMAIL GERENTE`       | E-mail do gerente                   |
| `COD_PESQUISA`        | Código da pesquisa                  |
| `DATA`                | Data do registro                    |
| `COD_LOJA`            | Código da loja                      |
| `COD_SAP`             | Código SAP                          |
| `NOME_FANTASIA`       | Nome fantasia da loja               |
| `BANDEIRA`            | Bandeira da loja                    |
| `DES_REGIAO`          | Região                              |
| `NOM_PESSOA_COMPLETO` | Nome completo do responsável        |
| `DES_CATEGORIA`       | Categoria do produto                |
| `DES_SUB_CATEGORIA`   | Subcategoria do produto             |
| `DES_TIPO_PONTO_EXTRA`| Tipo do ponto extra                 |
| `FOTO`                | Referência de foto                  |
| `CHAVE`               | Chave única do registro             |
| `EXISTE`              | Indicador de existência             |
| `PE_RETORNO`          | PE de retorno                       |

---

## Como usar

### 1. Configure as variáveis no notebook

Abra o arquivo `Automacao_envio_pe.ipynb` e ajuste as configurações no topo:

```python
CAMINHO_BASE = r'C:\...\Base_Extracao_PE_Produto_Foco_TESTE1.xlsx'
PASTA_SAIDA  = r'C:\...\Arquivos_Gerados'
ARQUIVO_LOG  = r'C:\...\LOG_ENVIO_PE.xlsx'

EMAILS_CC = [
    'l.basaia@spotpromo.com.br'   # e-mail(s) em cópia em todos os envios
]

MAX_TENTATIVAS = 2   # Tentativas de reenvio em caso de falha no Outlook
```

### 2. Escolha o modo de execução

```python
MODO_TESTE = True   # Apenas gera os arquivos, sem enviar e-mails
MODO_TESTE = False  # Gera os arquivos E envia e-mails (pede confirmação antes)
```

### 3. Execute o notebook

Execute a célula principal. Em modo produção, será exibida uma confirmação:

```
⚠️  MODO PRODUÇÃO — 7 destinatários. Confirma? [s/n]:
```

Digite `s` e pressione Enter para confirmar o envio.

---

## Estrutura dos arquivos gerados

Cada destinatário recebe um arquivo `.xlsx` com duas abas:

### Aba `BASE_PE`
Contém os registros filtrados exclusivamente para aquele Especialista ou Gerente, com as colunas A até O:

```
COD_PESQUISA | DATA | COD_LOJA | COD_SAP | NOME_FANTASIA | BANDEIRA |
DES_REGIAO | NOM_PESSOA_COMPLETO | DES_CATEGORIA | DES_SUB_CATEGORIA |
DES_TIPO_PONTO_EXTRA | FOTO | CHAVE | EXISTE | PE_RETORNO
```

### Aba `TT_PE`
Resumo de Pontos Extras conquistados, com contagem distinta de `CHAVE` agrupada por `DES_SUB_CATEGORIA` e `DES_TIPO_PONTO_EXTRA`, incluindo linha de total:

| DES_SUB_CATEGORIA | DES_TIPO_PONTO_EXTRA | QTD_PE |
|-------------------|----------------------|--------|
| Bebidas           | Ilha                 | 3      |
| Bebidas           | Ponta de Gôndola     | 5      |
| Higiene           | Ilha                 | 2      |
|                   | **TOTAL**            | **10** |

---

## E-mail enviado

O e-mail é enviado em formato **HTML** com:
- Saudação personalizada com o nome do destinatário
- Observação sobre a coluna `CHAVE_TI` (diferencia PE de retorno de nova aquisição)
- Botão de acesso ao **Dashboard** do sistema
- **Assinatura automática** do Outlook carregada dinamicamente
- Arquivo `.xlsx` em anexo

---

## Fluxo de execução

```
Base Excel (extração)
    │
    ├─ Valida colunas obrigatórias
    │
    ├─ Para cada ESPECIALISTA:
    │       └─ Filtra registros da base
    │          → Gera BASE_PE (colunas A:O, dados filtrados)
    │          → Gera TT_PE  (contagem distinta de PE por subcategoria/tipo + total)
    │          → Salva arquivo .xlsx
    │          → (produção) Envia e-mail HTML via Outlook com retry
    │
    ├─ Para cada GERENTE:
    │       └─ (mesma lógica acima)
    │
    └─ Salva log completo em LOG_ENVIO_PE.xlsx
```

---

## Log de execução

O arquivo `LOG_ENVIO_PE.xlsx` registra todas as operações:

| Coluna     | Descrição                           |
|------------|-------------------------------------|
| DATA_ENVIO | Data e hora da execução             |
| TIPO       | `Especialista` ou `Gerente`         |
| NOME       | Nome do destinatário                |
| EMAIL      | E-mail do destinatário              |
| STATUS     | `ENVIADO`, `GERADO` ou `ERRO`       |
| ERRO       | Mensagem de erro (quando aplicável) |
