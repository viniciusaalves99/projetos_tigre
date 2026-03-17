# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Ambiente

- **Python**: utilizado via Jupyter Notebook (`.ipynb`). Python não está no PATH do sistema — use o ambiente configurado no VSCode/Jupyter para executar os notebooks.
- **Dependências principais**: `pandas`, `openpyxl`, `pywin32` (`win32com.client`), `shutil`, `re`
- **Plataforma**: Windows — os scripts dependem de automação COM (Excel e Outlook via `win32com`), portanto só funcionam em Windows com Excel e Outlook instalados.

## Arquivos de entrada esperados

Os notebooks esperam os seguintes arquivos em `C:\Automacao_PE\`:
- `Extracao_PE_Produto_Foco_TESTE.xlsx` — base de dados com colunas: `ESPECIALISTA`, `EMAIL ESPECIALISTA`, `GERENTE`, `EMAIL GERENTE`, e as colunas de `COLUNAS_MODELO`
- `Modelo_Envio_PE.xlsx` — template Excel com abas `BASE_PE` e `TT_PE` (tabela dinâmica)

## Arquivos de saída

- `C:\Automacao_PE\Arquivos_Gerados\` — arquivos Excel gerados por Especialista/Gerente
- `C:\Automacao_PE\Arquivos_Gerados\TESTE\` — arquivos gerados em modo teste
- `C:\Automacao_PE\LOG_ENVIO_PE.xlsx` — log de envios e erros

## Arquitetura dos notebooks

### `Automacao_envio_pe.ipynb`
Automação de geração e envio de relatórios de Pontos Extras (PE). Fluxo principal:
1. Lê a base de extração → filtra por Especialista ou Gerente
2. Para cada pessoa: copia o modelo Excel → injeta os dados filtrados via COM → atualiza tabela dinâmica (`RefreshAll`) → salva
3. Em modo produção (`MODO_TESTE = False`): envia e-mail via Outlook com o arquivo em anexo e CC fixo
4. Registra cada operação no log Excel

**Variável de controle**: `MODO_TESTE = True` gera arquivos sem enviar e-mails; `False` executa o processo completo.

## Git

- O repositório remoto está em `https://github.com/viniciusaalves99/projetos_tigre`
- Arquivos só devem ser enviados ao GitHub quando o usuário solicitar explicitamente (`git push`)
- A pasta `.claude/` está no `.gitignore` e não deve ser commitada
