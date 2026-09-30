# Publicação por artefato no GitHub Pages

O Source do Pages está configurado como **GitHub Actions**. A execução #65 publicou o artefato com sucesso; a execução #66 foi bloqueada por um PDF referenciado que havia sido movido. O site mantém a última publicação válida quando um build falha.

## Fluxo atual

`.github/workflows/validate-site.yml`: checkout → Node 22/Python 3.12 → dependências fixadas → cache opcional → YAML/CMS → testes incrementais → geração de imagens → sintaxe JavaScript → conteúdo/manifesto → montagem e conferência de URLs → testes de navegador no artefato → upload → deploy separado.

Push em `main` e execução manual em `main` podem publicar. Pull requests e outras branches em execução manual testam o artefato, mas não executam deploy. Não há commits automáticos, push ou permissão de escrita em conteúdo. A publicação não cria ciclos de commits/Actions.

Não há filtros de caminhos: um JSON que passe a referenciar um upload antigo também precisa gerar variantes. Cada novo commit em main precisa ter build próprio para a proteção contra SHA obsoleto funcionar. Alterações só de texto reutilizam imagens e validam o conteúdo.

## Imagens e cache

O manifesto registra receita, versões do encoder, hashes e dimensões. O gerador verifica original, receita, cobertura de tamanhos, bytes, dimensões e decodificação WebP antes de reutilizar. Referências novas ou novos bytes no mesmo caminho geram nomes derivados dos hashes de conteúdo e receita. O manifesto atualizado e os arquivos gerados são incluídos no artefato publicado.

Originais, URLs e derivados anteriores são preservados; não há limpeza automática. Uploads não referenciados são publicados sem gerar variantes. Quando passarem a ser usados pelo conteúdo, serão processados no próximo build. Conteúdo sem alteração de imagem não recodifica tudo.

O cache fica fora da branch. Cada entrada restaurada é verificada; PRs não salvam cache compartilhado. Cache ausente implica geração adicional, sem impedir o build. Mudança de biblioteca/receita pode exigir recodificação. Um derivado com bytes conflitantes causa falha segura, sem sobrescrita.

A receita preserva orientação EXIF, proporção e transparência. No navegador, originais continuam em `src`; `srcset` escolhe as variantes. Manifesto ausente, inválido ou sem resposta em quatro segundos permite carregar com originais. Uma variante que falhe também retorna ao original. Esses fallbacks podem transferir mais bytes, mas mantêm o conteúdo acessível.

## Validação e publicação

`validate-content.mjs --strict-optimized` bloqueia JSON inválido, mídia inexistente, hash divergente, manifesto inválido e variantes incompatíveis. Dimensões grandes, peso e duplicatas são avisos.

`build-site.py` inclui HTML da raiz, assets/conteudo/favicon, `.nojekyll` e CNAME/robots.txt/sitemap.xml quando presentes. Preserva uploads e derivados antigos para manter URLs. Exclui `.git`, workflows, scripts, testes, configuração interna do CMS, documentação e dependências de desenvolvimento. Confere URLs locais, CSS, JSON e srcset no artefato. Links simbólicos não são aceitos.

A saída deve estar fora do checkout e vazia; arquivos anteriores não são apagados automaticamente. Os testes de navegador verificam as páginas principais e todos os produtos publicados em 360, 390, 414, 768 e 1440 px, miniaturas, lightbox, URLs de mídia renderizadas, PDFs e falhas simuladas do manifesto/variantes. Usam Chromium e bloqueiam serviços externos, portanto não comprovam login do Pages CMS, WhatsApp, Maps ou disponibilidade de CDNs.

A dependência de testes [Playwright 1.62.1](https://github.com/microsoft/playwright/releases/tag/v1.62.1) está fixada no lockfile. Sua instalação e a preparação de Chromium acrescentam tempo ao build; nada disso vai ao site público. A instalação no runner segue a [documentação de CI do Playwright](https://playwright.dev/docs/ci).

Falha em geração, validação ou testes impede o envio do artefato. `deploy` depende de `build` bem-sucedido. Nenhum conteúdo inválido é publicado para contornar um erro.

## Concorrência e permissões

Builds anteriores da mesma ref podem ser cancelados. O deploy usa grupo único, sem cancelamento de uma publicação já em andamento. Antes de publicar, confere o SHA atual de main e ignora commits obsoletos. Se outro commit chegar durante o deploy, este pode terminar primeiro; o build válido mais recente publica depois.

Deploy tem `contents:read`, `pages:write` e `id-token:write`, ambiente `github-pages` e Actions fixadas por SHA. Consulta o Source por API sem alterá-lo. Enquanto Source for branch, pula configure/deploy. `configure-pages` usa `enablement:false`.

## Operação após salvar no CMS

1. O CMS salva conteúdo/uploads no GitHub. Um upload só recebe variantes quando referenciado pelo site/conteúdo.
2. Acompanhe Actions → **Construir e publicar site** no commit mais recente.
3. Com build e deploy verdes, confira a página e o catálogo publicados.
4. Com erro, corrija a referência/estrutura no CMS ou repositório; o último site válido permanece no ar. Não basta salvar um arquivo em outra pasta: os campos que o usam continuam apontando para a URL cadastrada.
5. Os rascunhos de produto não são exibidos no site público. Revise campos antes de ativar e confira o site depois da publicação.

O PDF atual também foi disponibilizado em `assets/uploads/catalogo-droptech-2026-9.pdf`, mantendo a URL já cadastrada. O arquivo em `assets/uploads/catalogos/` permanece preservado. Essa compatibilidade adiciona uma cópia ao armazenamento, sem download duplicado automático pelo visitante.

`.gitattributes` declara PDFs como binários: o Git preserva seus bytes e não aplica conversão de finais de linha nem verificações de espaços de código a documentos. Nenhum PDF existente foi recodificado ou normalizado.

## Verificação local

As instruções estão no README. São executados os testes de integração de imagens, validação de conteúdo, sintaxe JS, YAML, teste de navegador no artefato, conferência manual de checksums e `git diff --check`. Para usar Edge instalado no Windows, defina a variável `PLAYWRIGHT_CHANNEL` como `msedge`.

O checker de checksums é manual e normaliza finais de linha para LF, evitando divergência entre Windows e Linux. Não acompanha conteúdo/mídia do CMS e não bloqueia o workflow. Atualize o snapshot somente depois de revisar as alterações intencionais.

## Rollback e limites

Se necessário, mudar manualmente Source para **Deploy from a branch**, main, `/(root)`, como anteriormente. O workflow deixa de publicar por artefato. Aguardar deploys em andamento terminarem antes da troca para evitar corrida. Não reescrever histórico nem remover originais.

Variantes geradas somente em Actions não estão na branch: o rollback usa manifesto versionado e fallback original, podendo transferir mais bytes. Guardar originais, variantes órfãs e a cópia de compatibilidade mantém o volume de armazenamento. A limpeza depende de revisão de uso e links externos.

As correções locais só chegam ao site depois de push autorizado e deploy bem-sucedido. Login do Pages CMS é externo ao site; timeout no callback de `app.pagescms.org` não é resolvido pela geração de imagens. Não alterar autenticação ou configuração de publicação para contornar uma falha externa sem diagnóstico próprio.
