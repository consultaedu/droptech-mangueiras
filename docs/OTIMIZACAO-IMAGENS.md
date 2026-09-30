# Fase 2: imagens responsivas DROPTECH

Base local: commit 39ef18a. Sem push, exclusao, renomeacao ou alteracao de originais e conteudo do CMS.

## Implementacao

Derivados em assets/optimized, identificados pelo SHA-256 do original e largura real. Manifesto relaciona URLs originais, dimensoes, hashes, variantes, tamanhos e metricas.

Fotografias: WebP qualidade 92, metodo 6. Limites no MAIOR lado: 400, 800, 1200 e 1600 px, preservando proporcao, sem ampliar. Descritores de srcset usam a largura REAL, que e menor em imagens verticais. Imagens ate 1000 px no maior lado nao receberam variantes. Variantes mais pesadas que o original foram omitidas.

Logo transparente: 230/460 px de largura, WebP sem perdas. Pixels e alpha de cada derivado foram comparados com a fonte redimensionada e sao identicos. Originais nunca foram substituidos.

src mantem a URL original. srcset/sizes em produtos, categorias, galeria, quadros institucionais, catalogos e Home. Miniaturas usam a menor variante; lightbox usa derivados de ate 1600 px no maior lado. WebPs originais verdadeiros e menores que 256 KiB tambem podem ser escolhidos em telas grandes. A Home cria uma imagem apenas para o slide ativo, com eager/high no primeiro slide. Demais imagens abaixo da dobra usam lazy. O carrossel institucional continua carregando somente a imagem ativa. O carregamento de slides da Home foi antecipado em relacao aos JSONs de produtos/catalogos.

Dimensoes explicitas, enquadramento cover/contain, proporcoes dos cards e comportamento dos controles preservados. Lazy loading e heuristico: o navegador pode antecipar itens proximos ao viewport.

## Tamanhos

- Originais referenciados (30 caminhos): 28,781,086 bytes. Nao inclui PDF.
- Fontes com variantes: 23; pequenas preservadas sem variantes: 7.
- WebPs novos: 72 arquivos, 12,897,334 bytes.
- Repositorio antes, sem .git: 75,615,367 bytes. O repositorio AUMENTA cerca de 12,9 MB porque os originais continuam presentes. Os visitantes baixam somente o candidato escolhido, nao todas as variantes.

## Transferencia observada no navegador

Edge headless, viewport 390x900 DPR 2 e 1440x900 DPR 1, cache novo por pagina. Medidas de corpos de respostas de imagem apos inicializacao e breve espera, sem rolar, somando requisicoes de imagens. Recursos externos (fontes, icones, mapa) bloqueados igualmente antes/depois para isolar imagens locais. Captura nao equivale a Lighthouse nem mede economia total da pagina ou LCP em rede real.

|Viewport|Pagina|Antes (bytes)|Depois (bytes)|Reducao|
|---|---|---:|---:|---:|
|390|index.html|508,660|224,596|55.8%|
|390|produtos.html|2,194,586|611,493|72.1%|
|390|produto.html?id=mangueira-trancada-1-2|5,754,920|178,516|96.9%|
|390|quem-somos.html|433,742|115,670|73.3%|
|390|contato.html|417,772|108,702|74.0%|
|390|catalogos.html|6,748,150|963,885|85.7%|
|1440|index.html|3,513,790|273,905|92.2%|
|1440|produtos.html|6,558,040|416,463|93.6%|
|1440|produto.html?id=mangueira-trancada-1-2|5,412,066|316,390|94.2%|
|1440|quem-somos.html|433,742|115,670|73.3%|
|1440|contato.html|417,772|119,442|71.4%|
|1440|catalogos.html|6,671,788|507,909|92.4%|

### Exemplo: card e foto de produto

Original assets/uploads/FOTOS MANGUEIRAS/1.2 Trançada/20260914_141425.jpg: 1,522,825 bytes.

|Largura x altura|Bytes|Reducao frente ao original|
|---|---:|---:|
|300 x 400|45,150|97.0%|
|600 x 800|172,284|88.7%|
|900 x 1200|352,392|76.9%|
|1200 x 1600|546,688|64.1%|

O navegador escolhe conforme largura renderizada e DPR; cards comuns tendem a usar as variantes menores, enquanto a foto principal usa maiores. A economia nao e garantida para toda imagem pequena, que continua original.

## Qualidade e limites

PSNR RGB comparado com o ORIGINAL REDIMENSIONADO por Lanczos: minimo 26.83 dB, maximo 46.04 dB. PSNR nao e garantia perceptual; fotografias com tramas coloridas podem ter diferencas de pixel. Comparacao visual lado a lado da mangueira trancada em 600x800 mostrou qualidade adequada para uso normal. Originais continuam disponiveis para consulta em resolucao integral.

Os quatro falsos WebP continuam intactos. Dois sao referenciados e receberam derivados reais; os dois sem referencias nao receberam variantes.

Novos uploads com caminhos diferentes funcionam automaticamente usando originais. Se o CMS sobrescrever os BYTES de uma imagem no MESMO caminho, e necessario regenerar o manifesto/variantes; o validador emite aviso de hash divergente. A regeneracao requer Pillow e numpy, executando python scripts/optimize-images.py na raiz; nao e um passo do deploy nem muda o CMS. Derivados existentes nunca sao limpos pelo script.

Se o manifesto ou derivados estiverem indisponiveis, testes confirmaram recuperacao pelos originais. Nesse caso o consumo de banda volta ao anterior. Em navegadores sem WebP, falha de imagem responsiva tambem recupera o src original.

O layout mobile da pagina individual preexistente permanece em duas colunas; nao foi redesenhado nesta fase. A validacao visual foi feita em Edge, sem teste em aparelhos fisicos ou Safari.

## Verificacao

- Sintaxe JS da aplicacao e do validador; YAML do workflow e CMS; git diff --check.
- validate-content.mjs: 0 erros, 30 avisos preexistentes no estado local atual (4 extensoes falsas, 7 pesos elevados, 11 dimensoes grandes, 8 grupos duplicados).
- Todos os hashes de originais, uploads, favicon, conteudo JSON e .pages.yml iguais a HEAD.
- Todas as variantes existem, sao WebP decodificavel, preservam proporcao e nao excedem origem/1600 px.
- Home, Produtos, pagina individual, Quem Somos, Contato e Catalogos em desktop e celular; nenhum erro JS ou 404 local.
- Busca, controles do slider, troca de miniaturas, lightbox e Escape; Catalogos conserva redirecionamento para Produtos.
- Falha do manifesto, falha dos derivados e novo caminho de foto do CMS: fallback confirmado.
- Quadros, tamanhos e posicoes comparados antes/depois: nenhuma diferenca superior a 1 px.
- Imagens originais pesadas nao requisitadas nos testes de navegacao otimizados.
- srcset validado pelo manifesto e pela navegacao; workflow inclui assets/optimized e gerador.

## Arquivos existentes alterados

- `.github/workflows/validate-site.yml`
- `assets/css/style.css`
- `assets/js/app.js`
- `contato.html`
- `index.html`
- `produtos.html`
- `quem-somos.html`
- `scripts/validate-content.mjs`

## Lista completa dos arquivos adicionados

- `assets/optimized/1b2b428cb193772e-230w.webp`
- `assets/optimized/1b2b428cb193772e-460w.webp`
- `assets/optimized/210afc25d7e069a1-237w.webp`
- `assets/optimized/210afc25d7e069a1-475w.webp`
- `assets/optimized/2b14703757358b19-1200w.webp`
- `assets/optimized/2b14703757358b19-300w.webp`
- `assets/optimized/2b14703757358b19-600w.webp`
- `assets/optimized/2b14703757358b19-900w.webp`
- `assets/optimized/30cc95e22157839e-300w.webp`
- `assets/optimized/30cc95e22157839e-600w.webp`
- `assets/optimized/3411dafcfe9d5d72-300w.webp`
- `assets/optimized/3411dafcfe9d5d72-600w.webp`
- `assets/optimized/3411dafcfe9d5d72-900w.webp`
- `assets/optimized/3536d7a6eaa4b8ca-1200w.webp`
- `assets/optimized/3536d7a6eaa4b8ca-400w.webp`
- `assets/optimized/3536d7a6eaa4b8ca-800w.webp`
- `assets/optimized/3a78aaf6ed59cb07-1080w.webp`
- `assets/optimized/3a78aaf6ed59cb07-400w.webp`
- `assets/optimized/3a78aaf6ed59cb07-800w.webp`
- `assets/optimized/44bb7adc9fd34d71-1200w.webp`
- `assets/optimized/44bb7adc9fd34d71-300w.webp`
- `assets/optimized/44bb7adc9fd34d71-600w.webp`
- `assets/optimized/44bb7adc9fd34d71-900w.webp`
- `assets/optimized/450bd818484b1e25-1200w.webp`
- `assets/optimized/450bd818484b1e25-300w.webp`
- `assets/optimized/450bd818484b1e25-600w.webp`
- `assets/optimized/450bd818484b1e25-900w.webp`
- `assets/optimized/4744f638c08c8e81-300w.webp`
- `assets/optimized/4744f638c08c8e81-600w.webp`
- `assets/optimized/4744f638c08c8e81-900w.webp`
- `assets/optimized/4cb0bd112ace4b3e-1200w.webp`
- `assets/optimized/4cb0bd112ace4b3e-400w.webp`
- `assets/optimized/4cb0bd112ace4b3e-800w.webp`
- `assets/optimized/532b42010747097d-1200w.webp`
- `assets/optimized/532b42010747097d-300w.webp`
- `assets/optimized/532b42010747097d-600w.webp`
- `assets/optimized/532b42010747097d-900w.webp`
- `assets/optimized/78941e73cf07a6db-300w.webp`
- `assets/optimized/78941e73cf07a6db-600w.webp`
- `assets/optimized/78941e73cf07a6db-900w.webp`
- `assets/optimized/8b852a5d47498714-1200w.webp`
- `assets/optimized/8b852a5d47498714-400w.webp`
- `assets/optimized/8b852a5d47498714-800w.webp`
- `assets/optimized/9f4b93677c0dad06-1080w.webp`
- `assets/optimized/9f4b93677c0dad06-400w.webp`
- `assets/optimized/9f4b93677c0dad06-800w.webp`
- `assets/optimized/b3ed1f27d02ada95-1200w.webp`
- `assets/optimized/b3ed1f27d02ada95-300w.webp`
- `assets/optimized/b3ed1f27d02ada95-600w.webp`
- `assets/optimized/b3ed1f27d02ada95-900w.webp`
- `assets/optimized/c074ce01d6a015c2-1200w.webp`
- `assets/optimized/c074ce01d6a015c2-300w.webp`
- `assets/optimized/c074ce01d6a015c2-600w.webp`
- `assets/optimized/c074ce01d6a015c2-900w.webp`
- `assets/optimized/d1854e031a8e7d9f-300w.webp`
- `assets/optimized/d1854e031a8e7d9f-600w.webp`
- `assets/optimized/d1854e031a8e7d9f-900w.webp`
- `assets/optimized/d60d8bc794a190c5-1200w.webp`
- `assets/optimized/d60d8bc794a190c5-300w.webp`
- `assets/optimized/d60d8bc794a190c5-600w.webp`
- `assets/optimized/d60d8bc794a190c5-900w.webp`
- `assets/optimized/dfe2797a75c4f63c-1200w.webp`
- `assets/optimized/dfe2797a75c4f63c-300w.webp`
- `assets/optimized/dfe2797a75c4f63c-600w.webp`
- `assets/optimized/dfe2797a75c4f63c-900w.webp`
- `assets/optimized/ea9a37569e3e3402-1200w.webp`
- `assets/optimized/ea9a37569e3e3402-300w.webp`
- `assets/optimized/ea9a37569e3e3402-600w.webp`
- `assets/optimized/ea9a37569e3e3402-900w.webp`
- `assets/optimized/fc84b2c2a83c34a1-240w.webp`
- `assets/optimized/fc84b2c2a83c34a1-480w.webp`
- `assets/optimized/fc84b2c2a83c34a1-720w.webp`
- `assets/optimized/manifest.json`
- `docs/OTIMIZACAO-IMAGENS.md`
- `scripts/optimize-images.py`
