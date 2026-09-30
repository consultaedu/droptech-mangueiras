# DropTech Mangueiras

Site institucional estático da DropTech, preparado para GitHub Pages e edição de conteúdo pelo Pages CMS.

## Páginas públicas
- `index.html` — Home com slider institucional
- `quem-somos.html` — Quem Somos
- `produtos.html` — Produtos, categorias, catálogos e certificações
- `produto.html?id=...` — detalhe dinâmico de produto
- `contato.html` — Contato
- `politica-privacidade.html` — Política de Privacidade

Os arquivos `sobre.html`, `galeria.html`, `catalogos.html` e `representantes.html` foram mantidos como redirecionamentos para não quebrar links antigos.

## Conteúdo editável
O conteúdo é carregado de `conteudo/*.json` e pode ser gerenciado pelo Pages CMS através do arquivo `.pages.yml`.

- Empresa, slides, páginas e contatos: `conteudo/empresa.json`
- Categorias: `conteudo/categorias.json`
- Produtos: `conteudo/produtos.json`
- Galeria: `conteudo/galeria.json`
- Clientes/parceiros: `conteudo/clientes.json`
- Catálogos: `conteudo/catalogos.json`
- Certificações: `conteudo/certificacoes.json`

Se clientes, catálogos ou certificações estiverem vazios, as respectivas seções são ocultadas automaticamente.


## Validação e segurança
O projeto inclui `scripts/validate-content.mjs` e o workflow `.github/workflows/validate-site.yml` para verificar automaticamente conteúdo e referências após alterações. Veja `SEGURANCA-E-VALIDACAO.md`.


## Deploy otimizado do Pages
O GitHub Pages usa Source **GitHub Actions**. O workflow prepara um artefato com imagens incrementais e publica somente depois da validação e dos testes de navegador. Operação e rollback estão em [docs/DEPLOY-GITHUB-PAGES.md](docs/DEPLOY-GITHUB-PAGES.md).

## Conferência local

Use Node 22 ou superior e Python 3.12. Instale as dependências com `python -m pip install -r scripts/image-requirements.txt` e `npm ci --ignore-scripts`. Para testes de navegador, execute `npx --no-install playwright install chromium` (no Linux, acrescente `--with-deps`).

```text
python -B -m unittest discover -s tests -p test_image_pipeline.py
node scripts/validate-content.mjs --strict-optimized
node tests/site-smoke.mjs
node scripts/checksums.mjs
git diff --check
```

Para testar o mesmo pacote publicado, monte-o com `python -B scripts/build-site.py --output CAMINHO_ABSOLUTO_FORA_DO_REPOSITORIO` em uma pasta vazia e execute `node tests/site-smoke.mjs --root CAMINHO_ABSOLUTO_FORA_DO_REPOSITORIO`. No Windows, `PLAYWRIGHT_CHANNEL=msedge` permite usar o Edge instalado em vez do Chromium baixado. Ferramentas e dependências de testes não são incluídas no artefato público.
