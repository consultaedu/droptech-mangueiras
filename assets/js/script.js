/* =========================================================
   DROPTECH MANGUEIRAS
   Funcionalidades principais
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  iniciarCabecalho();
  iniciarMenuMobile();
  carregarProdutosDestaque();
  carregarGaleriaDestaque();
  carregarProdutosNoFormulario();
  carregarInformacoesEmpresa();
  iniciarFormularioWhatsapp();
  iniciarCatalogoProdutos();
  atualizarAnoRodape();
  
});

/* =========================================================
   CABEÇALHO AO ROLAR
========================================================= */

function iniciarCabecalho() {
  const cabecalho = document.querySelector(".cabecalho");

  if (!cabecalho) {
    return;
  }

  function atualizarCabecalho() {
    cabecalho.classList.toggle("rolado", window.scrollY > 30);
  }

  atualizarCabecalho();

  window.addEventListener("scroll", atualizarCabecalho, {
    passive: true
  });
}

/* =========================================================
   MENU MOBILE
========================================================= */

function iniciarMenuMobile() {
  const botaoMenu = document.getElementById("botaoMenu");
  const menuMobile = document.getElementById("menuMobile");

  if (!botaoMenu || !menuMobile) {
    return;
  }

  const icone = botaoMenu.querySelector("i");
  const linksMenu = menuMobile.querySelectorAll("a");

  function abrirMenu() {
    menuMobile.classList.add("aberto");
    document.body.classList.add("menu-aberto");

    botaoMenu.setAttribute("aria-expanded", "true");
    botaoMenu.setAttribute("aria-label", "Fechar menu");

    if (icone) {
      icone.className = "fa-solid fa-xmark";
    }
  }

  function fecharMenu() {
    menuMobile.classList.remove("aberto");
    document.body.classList.remove("menu-aberto");

    botaoMenu.setAttribute("aria-expanded", "false");
    botaoMenu.setAttribute("aria-label", "Abrir menu");

    if (icone) {
      icone.className = "fa-solid fa-bars";
    }
  }

  function alternarMenu() {
    const menuEstaAberto = menuMobile.classList.contains("aberto");

    if (menuEstaAberto) {
      fecharMenu();
    } else {
      abrirMenu();
    }
  }

  botaoMenu.addEventListener("click", alternarMenu);

  linksMenu.forEach(link => {
    link.addEventListener("click", fecharMenu);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      fecharMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
      fecharMenu();
    }
  });
}

/* =========================================================
   PRODUTOS EM DESTAQUE
========================================================= */

function carregarProdutosDestaque() {
  const container = document.getElementById("produtosDestaque");

  if (!container) {
    return;
  }

  if (
    typeof PRODUTOS === "undefined" ||
    !Array.isArray(PRODUTOS)
  ) {
    exibirMensagemVazia(
      container,
      "Os produtos não puderam ser carregados."
    );

    return;
  }

  const produtosDestaque = PRODUTOS.filter(produto => {
    return produto.disponivel !== false && produto.destaque === true;
  });

  if (produtosDestaque.length === 0) {
    exibirMensagemVazia(
      container,
      "Nenhum produto em destaque foi cadastrado."
    );

    return;
  }

  container.innerHTML = produtosDestaque
    .slice(0, 3)
    .map(criarCardProduto)
    .join("");

  prepararImagensComFallback(container);
}

/* =========================================================
   CARD DE PRODUTO
========================================================= */

function criarCardProduto(produto) {
  const nome = escaparHTML(produto.nome || "Produto DropTech");

  const categoria = escaparHTML(
    produto.categoria || "Mangueiras"
  );

  const descricao = escaparHTML(
    produto.descricao || "Produto desenvolvido pela DropTech."
  );

  const imagem = escaparAtributo(
    produto.imagem || "assets/images/produtos/produto-padrao.webp"
  );

  const caracteristicas = Array.isArray(produto.caracteristicas)
    ? produto.caracteristicas.slice(0, 3)
    : [];

  const listaCaracteristicas = caracteristicas
    .map(item => `<li>${escaparHTML(item)}</li>`)
    .join("");

  const mensagemWhatsapp = encodeURIComponent(
    `Olá! Gostaria de saber mais sobre o produto: ${produto.nome || "Produto DropTech"}.`
  );

  const numeroWhatsapp = obterNumeroWhatsapp();

  const linkWhatsapp = numeroWhatsapp
    ? `https://wa.me/${numeroWhatsapp}?text=${mensagemWhatsapp}`
    : "#contato";

  return `
    <article class="produto-card">
      <div class="produto-imagem">
        <img
          src="${imagem}"
          alt="${nome}"
          loading="lazy"
          data-fallback="produto"
        >

        <span class="produto-categoria">
          ${categoria}
        </span>
      </div>

      <div class="produto-conteudo">
        <h3>${nome}</h3>

        <p>${descricao}</p>

        ${
          listaCaracteristicas
            ? `
              <ul class="produto-caracteristicas">
                ${listaCaracteristicas}
              </ul>
            `
            : ""
        }

        <a
          href="${linkWhatsapp}"
          class="produto-link"
          ${
            numeroWhatsapp
              ? 'target="_blank" rel="noopener noreferrer"'
              : ""
          }
        >
          Solicitar informações
          <i class="fa-solid fa-arrow-right"></i>
        </a>
      </div>
    </article>
  `;
}

/* =========================================================
   GALERIA
========================================================= */

function carregarGaleriaDestaque() {
  const container = document.getElementById("galeriaDestaque");

  if (!container) {
    return;
  }

  if (
    typeof GALERIA === "undefined" ||
    !Array.isArray(GALERIA)
  ) {
    exibirMensagemVazia(
      container,
      "A galeria não pôde ser carregada."
    );

    return;
  }

  const imagensValidas = GALERIA.filter(item => {
    return item && item.imagem;
  });

  if (imagensValidas.length === 0) {
    exibirMensagemVazia(
      container,
      "Nenhuma imagem foi cadastrada na galeria."
    );

    return;
  }

  container.innerHTML = imagensValidas
    .slice(0, 5)
    .map(criarItemGaleria)
    .join("");

  prepararImagensComFallback(container);
}

/* =========================================================
   ITEM DA GALERIA
========================================================= */

function criarItemGaleria(item) {
  const titulo = escaparHTML(
    item.titulo || "DropTech Mangueiras"
  );

  const categoria = escaparHTML(
    formatarCategoria(item.categoria || "galeria")
  );

  const descricao = escaparHTML(
    item.descricao || titulo
  );

  const imagem = escaparAtributo(item.imagem);

  return `
    <article class="galeria-item">
      <img
        src="${imagem}"
        alt="${descricao}"
        loading="lazy"
        data-fallback="galeria"
      >

      <div class="galeria-overlay">
        <h3>${titulo}</h3>
        <span>${categoria}</span>
      </div>
    </article>
  `;
}

/* =========================================================
   PRODUTOS NO FORMULÁRIO
========================================================= */

function carregarProdutosNoFormulario() {
  const selectProduto = document.getElementById("produto");

  if (!selectProduto) {
    return;
  }

  if (
    typeof PRODUTOS === "undefined" ||
    !Array.isArray(PRODUTOS)
  ) {
    return;
  }

  const produtosDisponiveis = PRODUTOS.filter(produto => {
    return produto.disponivel !== false;
  });

  produtosDisponiveis.forEach(produto => {
    const opcao = document.createElement("option");

    opcao.value = produto.nome || "Produto DropTech";
    opcao.textContent = produto.nome || "Produto DropTech";

    selectProduto.appendChild(opcao);
  });

  const opcaoOutro = document.createElement("option");

  opcaoOutro.value = "Outro produto ou necessidade";
  opcaoOutro.textContent = "Outro produto ou necessidade";

  selectProduto.appendChild(opcaoOutro);
}

/* =========================================================
   INFORMAÇÕES DA EMPRESA
========================================================= */

function carregarInformacoesEmpresa() {
  if (
    typeof CONFIG_EMPRESA === "undefined" ||
    !CONFIG_EMPRESA
  ) {
    console.warn(
      "CONFIG_EMPRESA não foi encontrada no arquivo config.js."
    );

    return;
  }

  const numeroWhatsapp = obterNumeroWhatsapp();
  const telefoneFormatado =
    CONFIG_EMPRESA.contato?.telefone ||
    CONFIG_EMPRESA.contato?.whatsapp ||
    "Solicitar orçamento";

  const instagram =
    CONFIG_EMPRESA.redesSociais?.instagram || "";

  const horario =
    CONFIG_EMPRESA.contato?.horario ||
    "Consulte nosso horário de atendimento";

  const endereco = montarEndereco();

  preencherTexto("textoWhatsapp", telefoneFormatado);
  preencherTexto("textoEndereco", endereco);
  preencherTexto("rodapeHorario", horario);
  preencherTexto("rodapeEndereco", endereco);

  configurarLink(
    "linkInstagram",
    instagram
  );

  configurarLink(
    "rodapeInstagram",
    instagram
  );

  if (numeroWhatsapp) {
    const mensagem = encodeURIComponent(
      "Olá! Vim pelo site da DropTech Mangueiras e gostaria de solicitar um orçamento."
    );

    const linkWhatsapp =
      `https://wa.me/${numeroWhatsapp}?text=${mensagem}`;

    configurarLink("linkWhatsapp", linkWhatsapp);
    configurarLink("whatsappFlutuante", linkWhatsapp);
  } else {
    desativarLink("linkWhatsapp");
    desativarLink("whatsappFlutuante");
  }

  atualizarMapa();
}

/* =========================================================
   FORMULÁRIO PARA WHATSAPP
========================================================= */

function iniciarFormularioWhatsapp() {
  const formulario = document.getElementById("formularioContato");

  if (!formulario) {
    return;
  }

  formulario.addEventListener("submit", event => {
    event.preventDefault();

    const numeroWhatsapp = obterNumeroWhatsapp();

    if (!numeroWhatsapp) {
      alert(
        "O número de WhatsApp ainda não foi configurado no arquivo config.js."
      );

      return;
    }

    const nome = obterValorCampo("nome");
    const empresa = obterValorCampo("empresa");
    const produto = obterValorCampo("produto");
    const mensagem = obterValorCampo("mensagem");

    if (!nome || !produto) {
      alert(
        "Preencha seu nome e selecione o produto de interesse."
      );

      return;
    }

    const texto = [
      "Olá! Vim pelo site da DropTech Mangueiras.",
      "",
      `*Nome:* ${nome}`,
      empresa ? `*Empresa ou propriedade:* ${empresa}` : "",
      `*Produto de interesse:* ${produto}`,
      mensagem ? `*Mensagem:* ${mensagem}` : "",
      "",
      "Gostaria de receber mais informações e solicitar um orçamento."
    ]
      .filter(Boolean)
      .join("\n");

    const link =
      `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(texto)}`;

    window.open(
      link,
      "_blank",
      "noopener,noreferrer"
    );
  });
}

/* =========================================================
   MAPA
========================================================= */

function atualizarMapa() {
  const mapa = document.getElementById("mapaEmpresa");

  if (!mapa) {
    return;
  }

  const linkMapaConfigurado =
    CONFIG_EMPRESA.mapa?.link?.trim();

  if (linkMapaConfigurado) {
    mapa.src = linkMapaConfigurado;
    return;
  }

  const endereco = montarEndereco();

  if (!endereco) {
    return;
  }

  mapa.src =
    `https://www.google.com/maps?q=${encodeURIComponent(endereco)}&output=embed`;
}

/* =========================================================
   FALLBACK PARA IMAGENS
========================================================= */

function prepararImagensComFallback(container) {
  const imagens = container.querySelectorAll("img[data-fallback]");

  imagens.forEach(imagem => {
    imagem.addEventListener(
      "error",
      () => substituirImagemQuebrada(imagem),
      { once: true }
    );
  });
}

function substituirImagemQuebrada(imagem) {
  const pai = imagem.parentElement;

  if (!pai) {
    return;
  }

  const tipo = imagem.dataset.fallback;

  const texto =
    tipo === "produto"
      ? "Imagem do produto em breve"
      : "Imagem da DropTech em breve";

  const placeholder = document.createElement("div");

  placeholder.className = "imagem-indisponivel";

  placeholder.innerHTML = `
    <span>${escaparHTML(texto)}</span>
  `;

  imagem.remove();
  pai.prepend(placeholder);
}

/* =========================================================
   FUNÇÕES AUXILIARES
========================================================= */

function obterNumeroWhatsapp() {
  if (
    typeof CONFIG_EMPRESA === "undefined" ||
    !CONFIG_EMPRESA?.contato
  ) {
    return "";
  }

  const numero =
    CONFIG_EMPRESA.contato.whatsapp ||
    CONFIG_EMPRESA.contato.telefone ||
    "";

  return String(numero).replace(/\D/g, "");
}

function montarEndereco() {
  if (
    typeof CONFIG_EMPRESA === "undefined" ||
    !CONFIG_EMPRESA?.endereco
  ) {
    return "";
  }

  const endereco = CONFIG_EMPRESA.endereco;

  const ruaNumero = [
    endereco.rua,
    endereco.numero
  ]
    .filter(Boolean)
    .join(", ");

  const cidadeEstado = [
    endereco.cidade,
    endereco.estado
  ]
    .filter(Boolean)
    .join(" - ");

  return [
    ruaNumero,
    endereco.bairro,
    cidadeEstado,
    endereco.cep
  ]
    .filter(Boolean)
    .join(", ");
}

function configurarLink(id, url) {
  const elemento = document.getElementById(id);

  if (!elemento) {
    return;
  }

  if (!url) {
    desativarLink(id);
    return;
  }

  elemento.href = url;
  elemento.removeAttribute("aria-disabled");
  elemento.classList.remove("link-desativado");
}

function desativarLink(id) {
  const elemento = document.getElementById(id);

  if (!elemento) {
    return;
  }

  elemento.href = "#contato";
  elemento.setAttribute("aria-disabled", "true");
  elemento.classList.add("link-desativado");
}

function preencherTexto(id, texto) {
  const elemento = document.getElementById(id);

  if (!elemento || !texto) {
    return;
  }

  elemento.textContent = texto;
}

function obterValorCampo(id) {
  const campo = document.getElementById(id);

  if (!campo) {
    return "";
  }

  return campo.value.trim();
}

function atualizarAnoRodape() {
  const anoAtual = document.getElementById("anoAtual");

  if (!anoAtual) {
    return;
  }

  anoAtual.textContent = new Date().getFullYear();
}

function exibirMensagemVazia(container, mensagem) {
  container.innerHTML = `
    <div class="mensagem-vazia">
      ${escaparHTML(mensagem)}
    </div>
  `;
}

function formatarCategoria(categoria) {
  return String(categoria)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, letra => letra.toUpperCase());
}

function escaparHTML(valor) {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escaparAtributo(valor) {
  return escaparHTML(valor);
}

/* =========================================================
   CATÁLOGO COMPLETO DE PRODUTOS
========================================================= */

function iniciarCatalogoProdutos() {
  const container = document.getElementById("catalogoProdutos");
  const filtrosContainer = document.getElementById("filtrosProdutos");
  const campoBusca = document.getElementById("buscaProduto");
  const botaoLimpar = document.getElementById("limparBusca");
  const textoQuantidade = document.getElementById("quantidadeProdutos");

  if (
    !container ||
    !filtrosContainer ||
    !campoBusca ||
    !textoQuantidade
  ) {
    return;
  }

  if (
    typeof PRODUTOS === "undefined" ||
    !Array.isArray(PRODUTOS)
  ) {
    exibirMensagemVazia(
      container,
      "Os produtos não puderam ser carregados."
    );

    textoQuantidade.textContent = "Nenhum produto encontrado.";
    return;
  }

  const produtosDisponiveis = PRODUTOS.filter(produto => {
    return produto && produto.disponivel !== false;
  });

  let categoriaSelecionada = "todos";
  let termoBusca = "";

  criarFiltros();

  aplicarFiltros();

  campoBusca.addEventListener("input", () => {
    termoBusca = normalizarTexto(campoBusca.value);

    if (botaoLimpar) {
      botaoLimpar.hidden = !campoBusca.value.trim();
    }

    aplicarFiltros();
  });

  if (botaoLimpar) {
    botaoLimpar.addEventListener("click", () => {
      campoBusca.value = "";
      termoBusca = "";
      botaoLimpar.hidden = true;

      campoBusca.focus();

      aplicarFiltros();
    });
  }

  function criarFiltros() {
    const categorias = produtosDisponiveis
      .map(produto => produto.categoria || "Outros")
      .filter(Boolean);

    const categoriasUnicas = [
      ...new Set(categorias)
    ].sort((a, b) => {
      return a.localeCompare(b, "pt-BR");
    });

    filtrosContainer.innerHTML = "";

    filtrosContainer.appendChild(
      criarBotaoFiltro("todos", "Todos")
    );

    categoriasUnicas.forEach(categoria => {
      filtrosContainer.appendChild(
        criarBotaoFiltro(
          normalizarTexto(categoria),
          categoria
        )
      );
    });
  }

  function criarBotaoFiltro(valor, texto) {
    const botao = document.createElement("button");

    botao.type = "button";
    botao.className = "filtro-produto";
    botao.dataset.categoria = valor;
    botao.textContent = texto;

    if (valor === categoriaSelecionada) {
      botao.classList.add("ativo");
    }

    botao.addEventListener("click", () => {
      categoriaSelecionada = valor;

      atualizarEstadoFiltros();

      aplicarFiltros();
    });

    return botao;
  }

  function atualizarEstadoFiltros() {
    const botoes = filtrosContainer.querySelectorAll(
      ".filtro-produto"
    );

    botoes.forEach(botao => {
      const estaAtivo =
        botao.dataset.categoria === categoriaSelecionada;

      botao.classList.toggle("ativo", estaAtivo);
    });
  }

  function aplicarFiltros() {
    const produtosFiltrados = produtosDisponiveis.filter(produto => {
      const categoriaProduto = normalizarTexto(
        produto.categoria || "Outros"
      );

      const correspondeCategoria =
        categoriaSelecionada === "todos" ||
        categoriaProduto === categoriaSelecionada;

      const textoProduto = normalizarTexto([
        produto.nome,
        produto.categoria,
        produto.descricao,
        ...(Array.isArray(produto.caracteristicas)
          ? produto.caracteristicas
          : [])
      ]
        .filter(Boolean)
        .join(" "));

      const correspondeBusca =
        !termoBusca ||
        textoProduto.includes(termoBusca);

      return correspondeCategoria && correspondeBusca;
    });

    renderizarCatalogo(produtosFiltrados);
  }

  function renderizarCatalogo(produtos) {
    atualizarQuantidade(produtos.length);

    if (produtos.length === 0) {
      container.innerHTML = `
        <div class="mensagem-vazia">
          <strong>Nenhum produto encontrado.</strong>

          <p>
            Tente buscar por outro nome ou selecionar uma categoria diferente.
          </p>
        </div>
      `;

      return;
    }

    container.innerHTML = produtos
      .map(criarCardProduto)
      .join("");

    prepararImagensComFallback(container);
  }

  function atualizarQuantidade(quantidade) {
    if (quantidade === 1) {
      textoQuantidade.textContent = "1 produto encontrado.";
      return;
    }

    textoQuantidade.textContent =
      `${quantidade} produtos encontrados.`;
  }
}

/* =========================================================
   NORMALIZAÇÃO DE TEXTO
========================================================= */

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}