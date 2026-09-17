(() => {
  const page = document.body.dataset.page || 'home';
  const $ = (s,c=document) => c.querySelector(s);
  const $$ = (s,c=document) => [...c.querySelectorAll(s)];
  const cache = {};
  const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const asset = (v='') => String(v).replace(/^\//,'');
  const order = (a,b) => (Number(a.ordem)||999)-(Number(b.ordem)||999);

  async function load(name, fallback){
    if(cache[name]) return cache[name];
    try{
      const r=await fetch(`conteudo/${name}.json`,{cache:'no-store'});
      if(!r.ok) throw new Error(r.status);
      cache[name]=await r.json();
    }catch(e){console.warn(`Falha ao carregar ${name}.json`,e);cache[name]=fallback;}
    return cache[name];
  }
  function wa(company,msg='Olá! Gostaria de informações sobre os produtos DropTech.'){
    const n=String(company?.contato?.whatsapp||'').replace(/\D/g,'');
    return n?`https://wa.me/${n}?text=${encodeURIComponent(msg)}`:'contato.html';
  }
  function mail(company){return company?.contato?.email?`mailto:${company.contato.email}`:'contato.html'}

  function renderHeader(company){
    const el=$('#siteHeader'); if(!el)return;
    const active=(p)=>page===p?'active':'';
    el.innerHTML=`
      <div class="topbar"><div class="container topbar-inner">
        <div class="topbar-links"><a href="representantes.html"><i class="fa-solid fa-handshake"></i> Seja um representante</a><a href="catalogos.html"><i class="fa-regular fa-file-pdf"></i> Catálogos</a></div>
        <div class="topbar-contact"><a href="${wa(company)}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> ${esc(company?.contato?.telefone||'Fale conosco')}</a><a href="${mail(company)}"><i class="fa-regular fa-envelope"></i> ${esc(company?.contato?.email||'Contato')}</a></div>
      </div></div>
      <header class="header"><div class="container header-inner">
        <a class="brand" href="index.html" aria-label="Página inicial"><img src="assets/images/logo/logo-simbolo.png" alt=""><span><strong>DropTech</strong><small>Mangueiras</small></span></a>
        <nav class="nav" aria-label="Navegação principal"><a class="${active('home')}" href="index.html">Início</a><a class="${active('sobre')}" href="sobre.html">Quem somos</a><a class="${page==='produto'||page==='produtos'?'active':''}" href="produtos.html">Produtos</a><a class="${active('catalogos')}" href="catalogos.html">Catálogos</a><a class="${active('galeria')}" href="galeria.html">Galeria</a><a class="${active('contato')}" href="contato.html">Contato</a></nav>
        <a class="btn btn-primary header-cta" href="${wa(company,'Olá! Gostaria de solicitar um orçamento da DropTech.')}" target="_blank" rel="noopener">Solicitar orçamento</a>
        <button class="menu-btn" id="menuBtn" aria-label="Abrir menu" aria-expanded="false"><i class="fa-solid fa-bars"></i></button>
      </div><nav class="mobile-menu" id="mobileMenu"><a href="index.html">Início</a><a href="sobre.html">Quem somos</a><a href="produtos.html">Produtos</a><a href="catalogos.html">Catálogos</a><a href="galeria.html">Galeria</a><a href="representantes.html">Seja um representante</a><a href="contato.html">Contato</a></nav></header>`;
    const b=$('#menuBtn'),m=$('#mobileMenu');
    b?.addEventListener('click',()=>{const open=m.classList.toggle('open');document.body.classList.toggle('menu-open',open);b.setAttribute('aria-expanded',String(open));b.innerHTML=`<i class="fa-solid fa-${open?'xmark':'bars'}"></i>`;});
  }

  function renderFooter(company){
    const el=$('#siteFooter'); if(!el)return;
    const r=company?.redes||{};
    const socials=[r.instagram&&['instagram',r.instagram],r.facebook&&['facebook-f',r.facebook],r.linktree&&['link',r.linktree]].filter(Boolean).map(([i,u])=>`<a href="${esc(u)}" target="_blank" rel="noopener"><i class="fa-${i==='link'?'solid':'brands'} fa-${i}"></i></a>`).join('');
    el.innerHTML=`<footer class="footer"><div class="container footer-grid">
      <div class="footer-brand"><div class="brand footer-brand-lockup"><img src="assets/images/logo/logo-simbolo.png" alt=""><span><strong>DropTech</strong><small>Mangueiras</small></span></div><p>${esc(company?.descricao||'Soluções em mangueiras com qualidade e resistência.')}</p><div class="socials">${socials}</div></div>
      <div class="footer-col"><h3>Institucional</h3><a href="sobre.html">Quem somos</a><a href="galeria.html">Galeria</a><a href="representantes.html">Seja um representante</a><a href="politica-privacidade.html">Privacidade</a></div>
      <div class="footer-col"><h3>Produtos</h3><a href="produtos.html">Linha de produtos</a><a href="catalogos.html">Catálogos</a><a href="contato.html">Solicitar orçamento</a></div>
      <div class="footer-col"><h3>Contato</h3><a href="${wa(company)}" target="_blank" rel="noopener">${esc(company?.contato?.telefone||'WhatsApp')}</a><a href="${mail(company)}">${esc(company?.contato?.email||'E-mail')}</a><span>${esc(company?.endereco?.linha1||'')}</span><span>${esc([company?.endereco?.cidade,company?.endereco?.estado].filter(Boolean).join(' - '))}</span><span>${esc(company?.contato?.horario||'')}</span></div>
    </div><div class="footer-bottom"><div class="container"><span>© ${new Date().getFullYear()} DropTech Mangueiras. Todos os direitos reservados.</span><span>Desenvolvido por Marcos Daleprane</span></div></div></footer>`;
    const w=document.createElement('a');w.className='whatsapp';w.href=wa(company);w.target='_blank';w.rel='noopener';w.setAttribute('aria-label','Falar pelo WhatsApp');w.innerHTML='<i class="fa-brands fa-whatsapp"></i>';document.body.appendChild(w);
  }

  const productCard=p=>`<article class="product-card fade-up"><a class="product-image" href="produto.html?id=${encodeURIComponent(p.id)}"><img src="${asset(p.imagem)}" alt="${esc(p.nome)}" loading="lazy"><span class="pill">${esc(p.categoriaNome||p.categoria||'Produto')}</span></a><div class="product-body"><h3>${esc(p.nome)}</h3><p>${esc(p.resumo||'')}</p><a class="text-link" href="produto.html?id=${encodeURIComponent(p.id)}">Ver detalhes <i class="fa-solid fa-arrow-right"></i></a></div></article>`;
  const categoryCard=c=>`<article class="category-card fade-up"><img src="${asset(c.imagem)}" alt="${esc(c.nome)}" loading="lazy"><div class="category-copy"><h3>${esc(c.nome)}</h3><p>${esc(c.descricao||'')}</p><a class="text-link" href="produtos.html?categoria=${encodeURIComponent(c.slug)}">Ver produtos <i class="fa-solid fa-arrow-right"></i></a></div></article>`;
  const galleryCard=g=>`<figure class="gallery-item fade-up" data-lightbox="${asset(g.imagem)}"><img src="${asset(g.imagem)}" alt="${esc(g.titulo)}" loading="lazy"><figcaption class="gallery-overlay"><div><span>${esc(g.categoria||'DropTech')}</span><h3>${esc(g.titulo)}</h3></div></figcaption></figure>`;

  function lightbox(){if($('#lightbox'))return;const l=document.createElement('div');l.id='lightbox';l.className='lightbox';l.innerHTML='<button class="lightbox-close" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button><img alt="Imagem ampliada">';document.body.appendChild(l);document.addEventListener('click',e=>{const c=e.target.closest('[data-lightbox]');if(c){$('img',l).src=c.dataset.lightbox;l.classList.add('open')}if(e.target===l||e.target.closest('.lightbox-close'))l.classList.remove('open')});document.addEventListener('keydown',e=>{if(e.key==='Escape')l.classList.remove('open')});}
  function animate(){if(!('IntersectionObserver'in window)){$$('.fade-up').forEach(x=>x.classList.add('visible'));return}const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}}),{threshold:.06});$$('.fade-up').forEach(x=>io.observe(x));}

  async function home(company){
    const [products,cats,gallery,clients]=await Promise.all([load('produtos',[]),load('categorias',[]),load('galeria',[]),load('clientes',[])]);
    const hero=$('#hero');if(hero){hero.style.backgroundImage=`url('${asset(company.hero?.imagem||'assets/images/banners/banner-principal.webp')}')`;$('.hero-tag span',hero).textContent=company.hero?.etiqueta||'Fabricação própria';$('.hero-title',hero).innerHTML=esc(company.hero?.titulo||company.slogan).replace(/(cada metro\.?)/i,'<em>$1</em>');$('.hero-text',hero).textContent=company.hero?.texto||company.descricao;}
    if($('#aboutTitle'))$('#aboutTitle').textContent=company.sobre?.titulo||'Soluções desenvolvidas para durar';if($('#aboutSummary'))$('#aboutSummary').textContent=company.sobre?.resumo||company.descricao;
    if($('#categoryGrid'))$('#categoryGrid').innerHTML=cats.filter(x=>x.ativo!==false).sort(order).map(categoryCard).join('');
    const pp=products.filter(x=>x.disponivel!==false);if($('#featuredProducts'))$('#featuredProducts').innerHTML=(pp.filter(x=>x.destaque).length?pp.filter(x=>x.destaque):pp).sort(order).slice(0,6).map(productCard).join('');
    if($('#processGrid'))$('#processGrid').innerHTML=(company.processo||[]).map(x=>`<article class="process-item fade-up"><span class="process-number">${esc(x.numero)}</span><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></article>`).join('');
    if($('#benefitGrid'))$('#benefitGrid').innerHTML=(company.diferenciais||[]).map(x=>`<article class="benefit-card fade-up"><i class="fa-solid ${esc(x.icone||'fa-check')}"></i><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></article>`).join('');
    const gs=gallery.filter(x=>x.publicado!==false).sort(order).slice(0,5);if(gs.length&&$('#galleryPreview')){$('#galleryPreview').innerHTML=gs.map(galleryCard).join('');lightbox()}else $('#homeGallery')?.remove();
    const cs=clients.filter(x=>x.ativo!==false&&x.logo).sort(order);if(cs.length&&$('#clientLogos'))$('#clientLogos').innerHTML=cs.map(c=>`<a class="client-logo" href="${esc(c.site||'#')}" ${c.site?'target="_blank" rel="noopener"':''}><img src="${asset(c.logo)}" alt="${esc(c.nome)}"></a>`).join('');else $('#clientsSection')?.remove();
  }

  async function productsPage(company){
    const [products,cats]=await Promise.all([load('produtos',[]),load('categorias',[])]);const all=products.filter(x=>x.disponivel!==false).sort(order);const grid=$('#productCatalog'),filters=$('#filters'),input=$('#productSearch'),count=$('#resultCount');if(!grid)return;let cat=new URLSearchParams(location.search).get('categoria')||'todos';
    filters.innerHTML=`<button class="filter-btn ${cat==='todos'?'active':''}" data-cat="todos">Todos</button>`+cats.filter(x=>x.ativo!==false).sort(order).map(c=>`<button class="filter-btn ${cat===c.slug?'active':''}" data-cat="${esc(c.slug)}">${esc(c.nome)}</button>`).join('');
    const draw=()=>{const q=(input.value||'').trim().toLowerCase();const list=all.filter(p=>(cat==='todos'||p.categoria===cat)&&(!q||`${p.nome} ${p.resumo} ${p.categoriaNome}`.toLowerCase().includes(q)));grid.innerHTML=list.length?list.map(productCard).join(''):`<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-magnifying-glass"></i><h3>Nenhum produto encontrado</h3><p>Tente outra busca ou fale diretamente com nossa equipe.</p><a class="btn btn-primary" href="${wa(company)}" target="_blank" rel="noopener">Falar com a DropTech</a></div>`;count.textContent=`${list.length} ${list.length===1?'produto encontrado':'produtos encontrados'}`;animate()};
    filters.addEventListener('click',e=>{const b=e.target.closest('[data-cat]');if(!b)return;cat=b.dataset.cat;$$('.filter-btn',filters).forEach(x=>x.classList.toggle('active',x===b));draw()});input.addEventListener('input',draw);draw();
  }

  async function productPage(company){
    const list=await load('produtos',[]),id=new URLSearchParams(location.search).get('id'),p=list.find(x=>x.id===id&&x.disponivel!==false)||list.find(x=>x.disponivel!==false),t=$('#productDetail');if(!t)return;if(!p){t.innerHTML='<div class="empty-state"><h3>Produto não encontrado.</h3><a class="btn btn-primary" href="produtos.html">Voltar</a></div>';return}document.title=`${p.nome} | DropTech Mangueiras`;
    const photos=[p.imagem,...(p.galeria||[])].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i), specs=(p.especificacoes||[]).filter(x=>x.rotulo||x.valor);
    t.innerHTML=`<div class="product-detail"><div><div class="detail-main-image"><img id="detailMain" src="${asset(photos[0])}" alt="${esc(p.nome)}"></div><div class="detail-thumbs">${photos.map((ph,i)=>`<button class="detail-thumb ${i===0?'active':''}" data-img="${asset(ph)}"><img src="${asset(ph)}" alt="${esc(p.nome)} ${i+1}"></button>`).join('')}</div></div><div class="detail-copy"><span class="category-label">${esc(p.categoriaNome||p.categoria)}</span><h1>${esc(p.nome)}</h1><p class="description">${esc(p.descricao||p.resumo||'')}</p>${(p.caracteristicas||[]).length?`<ul class="detail-list">${p.caracteristicas.map(x=>`<li><i class="fa-solid fa-check"></i><span>${esc(x)}</span></li>`).join('')}</ul>`:''}<div class="detail-actions"><a class="btn btn-primary" target="_blank" rel="noopener" href="${wa(company,`Olá! Gostaria de informações sobre ${p.nome}.`)}"><i class="fa-brands fa-whatsapp"></i> Solicitar informações</a><a class="btn btn-outline" href="produtos.html">Ver outros produtos</a></div>${(p.aplicacoes||[]).length?`<div class="detail-section"><h3>Aplicações</h3><div class="tags">${p.aplicacoes.map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div></div>`:''}${specs.length?`<div class="detail-section"><h3>Especificações técnicas</h3><table class="spec-table">${specs.map(s=>`<tr><td>${esc(s.rotulo)}</td><td>${esc(s.valor)}</td></tr>`).join('')}</table></div>`:`<div class="detail-section"><h3>Informações técnicas</h3><p class="lead">Medidas, composição, cores e especificações podem variar conforme o modelo. Consulte a equipe comercial.</p></div>`}</div></div>`;
    $$('.detail-thumb',t).forEach(b=>b.addEventListener('click',()=>{$('#detailMain').src=b.dataset.img;$$('.detail-thumb',t).forEach(x=>x.classList.toggle('active',x===b))}));
  }

  async function about(company){if($('#aboutTitle'))$('#aboutTitle').textContent=company.sobre?.titulo||'';if($('#aboutHistory'))$('#aboutHistory').textContent=company.sobre?.historia||company.descricao;if($('#mission'))$('#mission').textContent=company.sobre?.missao||'';if($('#vision'))$('#vision').textContent=company.sobre?.visao||'';if($('#values'))$('#values').innerHTML=(company.sobre?.valores||[]).map(v=>`<span class="tag">${esc(v)}</span>`).join('')}
  async function galleryPage(){const d=(await load('galeria',[])).filter(x=>x.publicado!==false).sort(order),g=$('#galleryAll');if(g)g.innerHTML=d.length?d.map(galleryCard).join(''):'<div class="empty-state"><h3>Galeria em atualização</h3></div>';lightbox()}
  async function catalogsPage(company){const d=(await load('catalogos',[])).filter(x=>x.ativo!==false).sort(order),g=$('#downloadGrid');if(!g)return;g.innerHTML=d.length?d.map(c=>`<article class="download-card fade-up"><div class="download-cover">${c.capa?`<img src="${asset(c.capa)}" alt="${esc(c.titulo)}">`:'<i class="fa-regular fa-file-pdf"></i>'}</div><div class="download-body"><h3>${esc(c.titulo)}</h3><p>${esc(c.descricao||'')}</p><a class="btn btn-primary" href="${asset(c.arquivo)}" target="_blank" rel="noopener"><i class="fa-solid fa-download"></i> Abrir catálogo</a></div></article>`).join(''):`<div class="empty-state" style="grid-column:1/-1"><i class="fa-regular fa-file-pdf"></i><h3>Catálogos digitais em preparação</h3><p>Os PDFs podem ser publicados pelo painel. Enquanto isso, solicite o material diretamente à equipe.</p><a class="btn btn-primary" href="${wa(company,'Olá! Gostaria de receber o catálogo da DropTech.')}" target="_blank" rel="noopener">Solicitar catálogo</a></div>`}

  function formToWhats(company,selector,prefix){const f=$(selector);if(!f)return;f.addEventListener('submit',e=>{e.preventDefault();const d=new FormData(f);let msg=prefix+'\n\n';for(const [k,v] of d.entries())if(v&&k!=='privacidade')msg+=`${k}: ${v}\n`;window.open(wa(company,msg),'_blank','noopener')})}
  function contact(company){const set=(id,text,href)=>{const e=$(id);if(!e)return;e.textContent=text||'—';if(href)e.href=href};set('#contactPhone',company.contato?.telefone,wa(company));set('#contactEmail',company.contato?.email,mail(company));set('#contactAddress',[company.endereco?.linha1,company.endereco?.cidade,company.endereco?.estado].filter(Boolean).join(' • '),company.endereco?.mapa||undefined);set('#contactHours',company.contato?.horario);formToWhats(company,'#contactForm','Olá! Gostaria de falar com a DropTech.')}
  function reps(company){if($('#repTitle'))$('#repTitle').textContent=company.representantes?.titulo||'Cresça com a DropTech';if($('#repText'))$('#repText').textContent=company.representantes?.texto||'';if($('#repBenefits'))$('#repBenefits').innerHTML=(company.representantes?.beneficios||[]).map(x=>`<div class="rep-benefit"><i class="fa-solid fa-check"></i>${esc(x)}</div>`).join('');formToWhats(company,'#repForm','Olá! Tenho interesse em representar a DropTech.')}
  async function certificates(){const d=(await load('certificacoes',[])).filter(x=>x.ativo!==false),s=$('#certSection');if(!s)return;if(!d.length){s.remove();return}$('#certGrid').innerHTML=d.map(c=>`<article class="value-card"><i class="fa-solid fa-certificate"></i><h3>${esc(c.nome)}</h3><p>${esc(c.descricao||'')}</p>${c.link?`<a class="text-link" href="${esc(c.link)}" target="_blank" rel="noopener">Ver certificado <i class="fa-solid fa-arrow-right"></i></a>`:''}</article>`).join('')}

  async function init(){const company=await load('empresa',{});renderHeader(company);renderFooter(company);if(page==='home')await home(company);if(page==='produtos')await productsPage(company);if(page==='produto')await productPage(company);if(page==='sobre')await about(company);if(page==='galeria')await galleryPage();if(page==='catalogos')await catalogsPage(company);if(page==='contato')contact(company);if(page==='representantes')reps(company);await certificates();animate()}
  init();
})();
