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
