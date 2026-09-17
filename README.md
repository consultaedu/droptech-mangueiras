# DropTech Mangueiras — site institucional + Pages CMS

Site estático da DropTech Mangueiras, preparado para GitHub Pages e edição de conteúdo pelo Pages CMS.

## Páginas

- `index.html` — Home
- `sobre.html` — Quem somos
- `produtos.html` — Catálogo pesquisável e filtros
- `produto.html?id=...` — Página individual de produto
- `catalogos.html` — Catálogos/PDFs
- `galeria.html` — Galeria de fotos
- `representantes.html` — Cadastro de interesse para representação
- `contato.html` — Contato/orçamento
- `politica-privacidade.html` — Privacidade

## Conteúdo editável

O site lê os dados da pasta `/conteudo`:

- `empresa.json`
- `categorias.json`
- `produtos.json`
- `galeria.json`
- `catalogos.json`
- `clientes.json`
- `certificacoes.json`

O arquivo `.pages.yml` configura o painel do Pages CMS.

## Atenção antes de publicar

Os dados de telefone/WhatsApp/e-mail vieram do projeto original e ainda usam valores de exemplo. Atualize em **Empresa / Site > Contato** no Pages CMS antes de divulgar o site.

Os formulários de contato e representação não dependem de servidor: eles montam a mensagem e abrem o WhatsApp para o visitante confirmar o envio.
