# Automação de Envio de Pontos Extras (PE)

Automação em Python para geração e envio de relatórios semanais de **Pontos Extras** para Especialistas e Gerentes via e-mail (Outlook), com arquivos Excel personalizados por destinatário.

---

## Pré-requisitos

- Windows com **Microsoft Excel** e **Microsoft Outlook** instalados
- Python 3.x com as bibliotecas:
  ```
  pandas
  openpyxl
  pywin32
  ```

---

## Estrutura de arquivos esperada

```
C:\Automacao_PE\
├── Extracao_PE_Produto_Foco_TESTE.xlsx   ← Base de dados com os registros de PE
├── Modelo_Envio_PE.xlsx                  ← Template Excel (abas: BASE_PE + TT_PE)
├── Arquivos_Gerados\                     ← Relatórios gerados (criado automaticamente)
│   └── TESTE\                            ← Relatórios gerados em modo teste
└── LOG_ENVIO_PE.xlsx                     ← Log de envios e erros (criado automaticamente)
```

---

## Colunas obrigatórias na base de dados

| Coluna               | Descrição                          |
|----------------------|------------------------------------|
| `ESPECIALISTA`       | Nome do especialista responsável   |
| `EMAIL ESPECIALISTA` | E-mail do especialista             |
| `GERENTE`            | Nome do gerente responsável        |
| `EMAIL GERENTE`      | E-mail do gerente                  |
| `COD_PESQUISA`       | Código da pesquisa                 |
| `DATA`               | Data do registro                   |
| `COD_LOJA`           | Código da loja                     |
| `COD_SAP`            | Código SAP                         |
| `NOME_FANTASIA`      | Nome fantasia da loja              |
| `BANDEIRA`           | Bandeira da loja                   |
| `DES_REGIAO`         | Região                             |
| `NOM_PESSOA_COMPLETO`| Nome completo do responsável       |
| `DES_CATEGORIA`      | Categoria do produto               |
| `DES_SUB_CATEGORIA`  | Subcategoria do produto            |
| `DES_TIPO_PONTO_EXTRA`| Tipo do ponto extra               |
| `FOTO`               | Referência de foto                 |
| `CHAVE`              | Chave do registro                  |
| `EXISTE`             | Indicador de existência            |
| `PE_RETORNO`         | PE de retorno                      |

---

## Como usar

### 1. Configure as variáveis no notebook

Abra o arquivo `Automacao_envio_pe.ipynb` e ajuste as configurações no topo:

```python
CAMINHO_BASE   = r'C:\Automacao_PE\Extracao_PE_Produto_Foco_TESTE.xlsx'
CAMINHO_MODELO = r'C:\Automacao_PE\Modelo_Envio_PE.xlsx'
PASTA_SAIDA    = r'C:\Automacao_PE\Arquivos_Gerados'
ARQUIVO_LOG    = r'C:\Automacao_PE\LOG_ENVIO_PE.xlsx'

EMAILS_CC = [
    'coordenador@empresa.com',
    'diretoria@empresa.com'
]

MAX_TENTATIVAS = 2   # Tentativas de reenvio em caso de falha no Outlook
```

### 2. Escolha o modo de execução

```python
MODO_TESTE = True   # Apenas gera arquivos, sem enviar e-mails
MODO_TESTE = False  # Gera arquivos E envia e-mails (pede confirmação antes)
```

### 3. Execute o notebook

Execute todas as células. Em modo produção, será exibida uma confirmação antes do envio:

```
⚠️  MODO PRODUÇÃO — serão enviados e-mails para 25 destinatários.
Confirma o envio? [s/n]:
```

---

## Fluxo de execução

```
Base Excel (extração)
    │
    ├─ Valida colunas obrigatórias
    ├─ Valida abas do modelo Excel
    │
    ├─ Para cada ESPECIALISTA:
    │       └─ Filtra registros → copia modelo → injeta dados (em bloco)
    │          → atualiza tabela dinâmica → salva arquivo
    │          → (produção) envia e-mail com retry
    │
    ├─ Para cada GERENTE:
    │       └─ (mesma lógica acima)
    │
    └─ Salva log completo em LOG_ENVIO_PE.xlsx
```

---

## Log de execução

O arquivo `LOG_ENVIO_PE.xlsx` registra todas as operações:

| Coluna     | Descrição                              |
|------------|----------------------------------------|
| DATA_ENVIO | Data e hora da execução                |
| TIPO       | `Especialista` ou `Gerente`            |
| NOME       | Nome do destinatário                   |
| EMAIL      | E-mail do destinatário                 |
| STATUS     | `ENVIADO`, `GERADO` ou `ERRO`          |
| ERRO       | Mensagem de erro (quando aplicável)    |
