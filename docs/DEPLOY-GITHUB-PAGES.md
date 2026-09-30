# Publicação por artefato no GitHub Pages

Esta etapa prepara a migração. Nenhum push ou alteração em Settings → Pages foi realizado.

## Fluxo

O workflow existente `.github/workflows/validate-site.yml` passa a executar:
checkout → Node 22/Python 3.12 → dependências fixadas → cache opcional → validação YAML/CMS → testes → geração incremental → sintaxe JavaScript → conteúdo/manifesto → montagem e conferência de URLs → upload do artefato → deploy separado.

Push em `main` e execução manual em `main` podem publicar. Pull requests geram, testam e enviam o artefato, mas nunca executam o job de deploy. Outras branches em execução manual também não publicam. Não há commits automáticos, push ou permissão de escrita em conteúdo. Assim, não existe ciclo de commits gerados pela Action.

Os eventos não usam filtros de caminhos: um JSON que passa a referenciar um upload antigo também precisa gerar variantes. Além disso, todo novo commit em main precisa ter build próprio para que a proteção contra SHA obsoleto não deixe uma alteração anterior sem publicação. Alterações somente em texto reutilizam imagens e ainda validam o conteúdo.

## Geração incremental e preservação

O manifesto agora registra receita, versões do encoder, hash e dimensões dos originais e variantes. Os metadados das 72 variantes existentes foram complementados sem recodificar ou mover qualquer arquivo. Em entradas intactas, todas as 30 referências atuais são reutilizadas, com zero recodificações.

Antes de reutilizar, o gerador confere SHA-256, receita, cobertura de tamanhos, bytes, dimensões e decodificação WebP. Referências novas ou novos bytes no mesmo caminho geram nomes derivados dos hashes de conteúdo e receita. O manifesto do artefato é atualizado. Originais, URLs e derivados antigos são preservados. Não existe coleta de arquivos órfãos.

Uploads ainda não referenciados permanecem publicados, sem necessidade de variantes. Quando um JSON passar a referenciá-los, serão processados no próximo build. Cache de Actions guarda derivados e metadados fora da branch, e cada entrada é novamente verificada antes do uso. PRs podem ler cache, mas não salvam cache compartilhado. Cache ausente ou indisponível apenas implica geração adicional. Nenhum arquivo gerado depende de persistência no checkout: é copiado ao artefato.

A receita preserva EXIF, proporção, transparência e a qualidade da Fase 2. Mudança de biblioteca/receita pode exigir uma recodificação inicial. Um derivado existente com bytes conflitantes é motivo de falha segura: não será sobrescrito.

## Validação e artefato

O build conserva as verificações existentes e executa `validate-content.mjs --strict-optimized`. Hash divergente, mídia inexistente, manifesto inválido e variantes incompatíveis bloqueiam o build. Tamanho, dimensões e duplicatas continuam sendo avisos.

Depois da validação, `build-site.py` copia HTML da raiz, todos os arquivos de assets/conteudo/favicon e `.nojekyll`; preserva CNAME, robots.txt e sitemap.xml se presentes. Inclui inclusive uploads e derivados antigos para preservar URLs públicas. Exclui `.git`, `.github`, scripts, testes, configuração interna do CMS e documentação. Confere URLs locais, CSS, JSON e srcset no diretório real do artefato. Links simbólicos não são aceitos.

O diretório de saída deve estar fora do checkout e vazio; arquivos anteriores nunca são apagados automaticamente. Falha em qualquer etapa impede `upload-pages-artifact`; o deploy depende do sucesso do build por `needs: build`.

## Concorrência e deploy

Builds anteriores da mesma ref podem ser cancelados. Deploy usa um grupo único, com cancelamento desativado: não há dois deploys deste workflow simultâneos. Imediatamente antes de publicar, confere o SHA atual de main pela API e ignora commits antigos. Uma alteração que chegue durante um deploy pode permitir que este finalize primeiro; o build válido mais recente publica depois. Se o mais recente for inválido, mantém-se a última publicação válida.

O deploy tem somente contents:read, pages:write e id-token:write, ambiente github-pages e Actions fixadas por SHA. Consulta o Source atual por API, mas não o modifica. Enquanto Source for branch, prepara o artefato e pula configure/deploy. `configure-pages` usa enablement:false.

## Ativação manual posterior

1. Revisar e enviar este commit para main quando autorizado. Esta etapa não faz push.
2. Manter inicialmente o Source atual por branch. Esperar o build do SHA atual de main concluir com sucesso e conferir seu artefato github-pages. O deploy personalizado deverá ser ignorado por Source ainda ser branch.
3. Confirmar que o build contém os arquivos públicos e que não há erros. O ambiente github-pages não deve exigir aprovações adicionais incompatíveis com publicação automática; políticas personalizadas de Actions/permissões também precisam permitir os jobs. Em um repositório com configuração padrão, a única alteração de configuração necessária é a próxima.
4. Só então mudar manualmente Settings → Pages → Build and deployment → Source → GitHub Actions.
5. Executar o workflow manualmente em main (Run workflow) para publicar o SHA atual. Conferir URL e sucesso do job deploy.

Não é necessário fazer um novo commit para essa execução manual. Ainda não foi possível confirmar o job remoto, token, políticas de ambiente ou publicação real, porque nenhum push foi realizado. Não considerar a publicação ativa antes do passo 5.

## Rollback

Mudar manualmente Source para Deploy from a branch, escolhendo main e /(root), como na configuração anterior. O workflow customizado consulta Source e deixa de publicar. Não reverter nem reescrever main: originais, CMS, HTML e URLs continuam presentes na branch; fallback e variantes versionadas da Fase 2 permanecem disponíveis. Variantes criadas somente em Actions não aparecem na branch, por isso o rollback usa o manifesto versionado e fallback original. Builds anteriores já em deploy devem terminar antes da troca de Source para evitar uma corrida na transição.

## Verificação local

- 10 testes de integração: sem alterações; apenas conteúdo; upload e referência posterior; novos bytes no mesmo caminho; cache; alteração de receita; derivado corrompido; falha de conteúdo; mídia inexistente; artefato determinístico e fallback; srcset inexistente.
- Geração real: 30 referências reutilizadas, 72 variantes, zero recodificações.
- Conteúdo real: zero erros e 30 avisos preexistentes (4 formatos com extensão divergente, 7 arquivos pesados, 11 imagens grandes e 8 grupos duplicados).
- Sintaxe JS, YAML do CMS/workflow, referências do artefato e git diff --check.
- Comparação por hash dos originais, derivados existentes, CMS e front-end com HEAD; duas montagens com as mesmas entradas.
- Home, Produtos, produto individual, Quem Somos, Contato e Catálogos em 390 e 1440 px, comparados à Fase 2; fallback com derivados bloqueados.

## Limites e riscos restantes

Não foi executado deploy remoto. A troca manual de Source e a execução posterior são necessárias. Enquanto Source continuar por branch, a publicação gerenciada antiga continua independente desta validação e não recebe derivados gerados somente na Action. O bloqueio integral de publicação por validação passa a valer após ativar Source GitHub Actions.

Guardar originais e variantes órfãs mantém o volume de armazenamento; esta etapa não tenta reduzir esse volume. Cache pode ser removido pelo GitHub; o build continua correto, mas pode gastar mais CPU. Builds completos em commits somente de documentação têm custo pequeno adicional, necessário à política de SHA atual. Publicar o último estado válido não significa publicar conteúdo inválido mais recente.
