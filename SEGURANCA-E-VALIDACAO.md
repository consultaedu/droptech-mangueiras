# Segurança e validação — DropTech

O site é estático e não possui banco de dados, login próprio, PHP ou API privada. Isso reduz bastante a superfície de ataque. Os principais pontos de atenção são o acesso ao GitHub/Pages CMS e os dados/links inseridos pelo CMS.

## Camadas implementadas

- Escape de textos vindos do CMS antes de inserir no HTML.
- URLs externas aceitas somente por HTTPS; esquemas executáveis como `javascript:` e `data:` são bloqueados.
- Imagens e PDFs do CMS só podem apontar para caminhos locais permitidos do site.
- O mapa incorporado aceita apenas endereços oficiais do Google Maps.
- Content Security Policy (CSP) nas páginas públicas restringindo scripts, estilos, frames e conexões.
- Links que abrem nova guia usam `noopener noreferrer`.
- Uploads pelo CMS limitados a JPG, JPEG, PNG, WEBP e PDF.
- Validações de formato no CMS para identificadores, WhatsApp, e-mail e links.
- Produtos novos começam como rascunho (`Publicado / exibir no site = desligado`).
- Validação automática via GitHub Actions em alterações de código ou conteúdo, incluindo referências ausentes, arquivos muito grandes e uploads duplicados.
- Tratamento defensivo para IDs de produto duplicados no navegador, evitando que cards diferentes apontem silenciosamente para a mesma página.

## Operação recomendada

1. Ative autenticação em dois fatores (2FA) na conta GitHub proprietária do repositório.
2. Para quem só precisa cadastrar produtos/conteúdo, prefira `Admin > Collaborators` no Pages CMS em vez de conceder acesso de escrita completo ao GitHub.
3. Nunca coloque senhas, tokens, chaves privadas ou credenciais nos JSONs, HTML, JavaScript ou no CMS: o repositório/site é público.
4. Cadastre produtos como rascunho, salve em etapas e publique somente no final.
5. Observe a aba Actions do GitHub após alterações importantes. O workflow `Validar site e conteúdo` verifica estrutura, referências de arquivos e problemas comuns.
6. Se algo for salvo incorretamente, o histórico de commits do GitHub permite recuperar versões anteriores.

## Observação importante

O validador sinaliza identificadores de produto duplicados como aviso. A interface do site cria um identificador público alternativo para evitar conflito imediato, mas o correto é ajustar o campo `Identificador / slug` no CMS para que cada produto tenha um valor único.
