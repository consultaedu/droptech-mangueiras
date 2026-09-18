(()=>{
'use strict';

const page=document.body.dataset.page||'home';
const $=(selector,context=document)=>context.querySelector(selector);
const $$=(selector,context=document)=>[...context.querySelectorAll(selector)];
const cache=Object.create(null);
const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
const FALLBACK_IMAGE='assets/images/logo/logo-simbolo.png';

const esc=(value='')=>String(value).replace(/[&<>'"]/g,char=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  "'":'&#39;',
  '"':'&quot;'
}[char]));

function numericOrder(value){
  const number=Number(value);
  return Number.isFinite(number)?number:999;
}
const order=(a,b)=>numericOrder(a?.ordem)-numericOrder(b?.ordem);

function safeAsset(value,fallback=''){
  let path=String(value||'').trim().replace(/\\/g,'/').replace(/^\/+/, '');
  if(!path)return fallback;
  if(/[\u0000-\u001f\u007f]/.test(path))return fallback;
  if(path.split('/').includes('..'))return fallback;
  if(!/^(assets|favicon)\//i.test(path))return fallback;
  return path;
}

function safeHref(value,fallback='#'){
  const href=String(value||'').trim();
  if(!href)return fallback;
  if(/[\u0000-\u001f\u007f]/.test(href))return fallback;
  if(/^(?:javascript|data|vbscript|file|blob):/i.test(href))return fallback;
  if(/^https:\/\//i.test(href))return href;
  if(/^http:\/\//i.test(href))return fallback;
  if(/^\/\//.test(href)||/\\/.test(href))return fallback;
  if(/^[a-z][a-z0-9+.-]*:/i.test(href))return fallback;
  return href;
}

function safeHttps(value){
  const href=String(value||'').trim();
  if(!/^https:\/\//i.test(href))return '';
  try{
    const url=new URL(href);
    return url.protocol==='https:'?url.href:'';
  }catch{return ''}
}

function safeEmail(value){
  const email=String(value||'').replace(/[\r\n]/g,'').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:'';
}

function isGoogleHost(hostname){
  const host=String(hostname||'').toLowerCase();
  return /^(?:www|maps)\.google\.(?:com|com\.br)$/.test(host);
}

function safeMapEmbed(value){
  if(!value)return '';
  const raw=String(value);
  const iframeMatch=raw.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  const candidate=(iframeMatch?iframeMatch[1]:raw).replace(/&amp;/g,'&').trim();
  if(!candidate)return '';
  try{
    const url=new URL(candidate);
    if(url.protocol!=='https:'||!isGoogleHost(url.hostname))return '';
    const embedPath=/\/maps\/embed(?:\/|$)/i.test(url.pathname);
    const embedQuery=url.searchParams.get('output')==='embed';
    return embedPath||embedQuery?url.href:'';
  }catch{return ''}
}

function safeMapLink(value){
  const raw=String(value||'').trim();
  if(!raw)return '';
  try{
    const url=new URL(raw);
    const host=url.hostname.toLowerCase();
    const allowed=host==='maps.app.goo.gl'||isGoogleHost(host);
    return url.protocol==='https:'&&allowed?url.href:'';
  }catch{return ''}
}

function slugify(value=''){
  return String(value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'');
}

function searchable(value=''){
  return String(value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase();
}

function prepareProducts(items){
  const list=Array.isArray(items)?items:[];
  const baseKeys=list.map((product,index)=>String(product?.id||'').trim()||slugify(product?.nome)||`produto-${index+1}`);
  const counts=new Map();
  baseKeys.forEach(key=>counts.set(key,(counts.get(key)||0)+1));
  const used=new Set();
  return list.map((product,index)=>{
    const base=baseKeys[index];
    let publicId=base;
    if((counts.get(base)||0)>1){
      publicId=`${base}--${slugify(product?.nome)||index+1}`;
    }
    if(used.has(publicId))publicId=`${publicId}-${index+1}`;
    used.add(publicId);
    return {...product,_publicId:publicId,_originalId:base};
  });
}

async function load(name,fallback){
  if(Object.prototype.hasOwnProperty.call(cache,name))return cache[name];
  try{
    const response=await fetch(`conteudo/${name}.json`,{
      cache:'no-store',
      headers:{Accept:'application/json'}
    });
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const data=await response.json();
    cache[name]=data;
    return data;
  }catch(error){
    console.warn(`[DropTech] Não foi possível carregar conteudo/${name}.json`,error);
    cache[name]=fallback;
    return fallback;
  }
}

const phone=config=>{
  const digits=String(config?.contato?.whatsapp||'').replace(/\D/g,'');
  return /^\d{10,15}$/.test(digits)?digits:'';
};
const wa=(config,message='Olá! Gostaria de informações sobre os produtos DropTech.')=>{
  const number=phone(config);
  return number?`https://wa.me/${number}?text=${encodeURIComponent(message)}`:'contato.html';
};
const mail=config=>{
  const email=safeEmail(config?.contato?.email);
  return email?`mailto:${email}`:'contato.html';
};

function brand(){
  return '<span class="brand"><img src="assets/images/logo/logo-simbolo.png" alt="" aria-hidden="true"><span class="brand-name"><strong>DropTech</strong><small>Mangueiras</small></span></span>';
}

function searchForm(className='header-search'){
  return `<form class="${esc(className)}" action="produtos.html" method="get" role="search"><input type="search" name="q" placeholder="Pesquisar" aria-label="Pesquisar produtos" maxlength="80" autocomplete="off"><button type="submit" aria-label="Pesquisar"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i></button></form>`;
}

function header(){
  const element=$('#siteHeader');
  if(!element)return;
  const navLink=(key,label,href,active=page===key)=>`<a class="${active?'active':''}" ${active?'aria-current="page"':''} href="${href}">${label}</a>`;
  element.innerHTML=`<header class="header"><div class="container header-inner"><a href="index.html" aria-label="DropTech - Home">${brand()}</a><nav class="nav" aria-label="Navegação principal">${navLink('home','Home','index.html')}${navLink('sobre','Quem somos','quem-somos.html')}${navLink('produtos','Produtos','produtos.html',page==='produto'||page==='produtos')}${navLink('contato','Contato','contato.html')}</nav>${searchForm()}<button class="menu-btn" id="menuBtn" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="mobileMenu"><i class="fa-solid fa-bars" aria-hidden="true"></i></button></div><div class="mobile-menu" id="mobileMenu" aria-hidden="true"><a href="index.html">Home</a><a href="quem-somos.html">Quem somos</a><a href="produtos.html">Produtos</a><a href="contato.html">Contato</a>${searchForm('mobile-search')}</div></header>`;
  const button=$('#menuBtn');
  const menu=$('#mobileMenu');
  const closeMenu=()=>{
    if(!menu?.classList.contains('open'))return;
    menu.classList.remove('open');
    document.body.classList.remove('menu-open');
    menu.setAttribute('aria-hidden','true');
    button?.setAttribute('aria-expanded','false');
    button?.setAttribute('aria-label','Abrir menu');
    if(button)button.innerHTML='<i class="fa-solid fa-bars" aria-hidden="true"></i>';
  };
  button?.addEventListener('click',()=>{
    const open=menu.classList.toggle('open');
    document.body.classList.toggle('menu-open',open);
    menu.setAttribute('aria-hidden',String(!open));
    button.setAttribute('aria-expanded',String(open));
    button.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');
    button.innerHTML=`<i class="fa-solid fa-${open?'xmark':'bars'}" aria-hidden="true"></i>`;
  });
  menu?.addEventListener('click',event=>{
    if(event.target.closest('a'))closeMenu();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape')closeMenu();
  });
}

function socialLink(icon,value,label){
  const href=safeHttps(value);
  if(!href)return '';
  return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(label)}"><i class="${icon==='link'?'fa-solid':'fa-brands'} fa-${icon}" aria-hidden="true"></i></a>`;
}

function footer(config){
  const element=$('#siteFooter');
  if(!element)return;
  const social=config.redes||{};
  const socials=[
    socialLink('instagram',social.instagram,'Instagram'),
    socialLink('facebook-f',social.facebook,'Facebook'),
    socialLink('linkedin-in',social.linkedin,'LinkedIn'),
    socialLink('link',social.linktree,'Linktree')
  ].filter(Boolean).join('');
  const addressLine=esc(config.endereco?.linha1||'');
  const cityState=esc([config.endereco?.cidade,config.endereco?.estado].filter(Boolean).join(' - '));
  element.innerHTML=`<footer class="footer"><div class="container footer-grid"><div class="footer-brand"><img class="footer-logo" src="assets/images/logo/logo-droptech.png" alt="DropTech Mangueiras"><p>${esc(config.descricao||'Soluções em mangueiras com qualidade e resistência.')}</p><div class="socials">${socials}</div></div><div class="footer-col"><h3>Institucional</h3><a href="quem-somos.html">Quem somos</a><a href="produtos.html">Produtos</a><a href="contato.html">Contato</a></div><div class="footer-col"><h3>Contato</h3><a href="${esc(wa(config))}" target="_blank" rel="noopener noreferrer">${esc(config.contato?.telefone||'WhatsApp')}</a><a href="${esc(mail(config))}">${esc(config.contato?.email||'')}</a><span>${addressLine}</span><span>${cityState}</span></div></div><div class="footer-bottom"><div class="container"><span>© ${new Date().getFullYear()} DropTech Mangueiras. Todos os direitos reservados.</span><a href="politica-privacidade.html">Política de Privacidade</a></div></div></footer>`;
  if(phone(config)&&!$('.whatsapp')){
    const button=document.createElement('a');
    button.className='whatsapp';
    button.href=wa(config);
    button.target='_blank';
    button.rel='noopener noreferrer';
    button.setAttribute('aria-label','Falar com a DropTech pelo WhatsApp');
    button.innerHTML='<i class="fa-brands fa-whatsapp" aria-hidden="true"></i><span>Fale conosco</span>';
    document.body.appendChild(button);
  }
}

function productCard(product){
  const id=product._publicId||product.id||slugify(product.nome);
  const image=safeAsset(product.imagem,FALLBACK_IMAGE);
  return `<article class="product-card reveal"><a class="product-image" href="produto.html?id=${encodeURIComponent(id)}" aria-label="Ver ${esc(product.nome||'produto')}"><img src="${esc(image)}" alt="${esc(product.nome||'Produto DropTech')}" loading="lazy" decoding="async"></a><div class="product-body"><h3>${esc(product.nome||'Produto DropTech')}</h3><p>${esc(product.resumo||'')}</p><a class="text-link" href="produto.html?id=${encodeURIComponent(id)}">Saiba mais <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a></div></article>`;
}

function categoryCard(category){
  const image=safeAsset(category.imagem,FALLBACK_IMAGE);
  return `<article class="category-card reveal"><img src="${esc(image)}" alt="${esc(category.nome||'Categoria DropTech')}" loading="lazy" decoding="async"><div class="category-copy"><h3>${esc(category.nome||'Categoria')}</h3><p>${esc(category.descricao||'')}</p><a class="text-link" href="produtos.html?categoria=${encodeURIComponent(category.slug||'')}">Ver produtos <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a></div></article>`;
}

const statHTML=stat=>`<article class="feature-stat reveal"><strong>${esc(stat.valor||'')}</strong><span>${esc(stat.texto||'')}</span></article>`;

function clientsHTML(items){
  return (Array.isArray(items)?items:[])
    .filter(item=>item.ativo!==false&&item.logo)
    .sort(order)
    .map(item=>{
      const image=safeAsset(item.logo,FALLBACK_IMAGE);
      const href=safeHttps(item.link);
      const content=`<img src="${esc(image)}" alt="${esc(item.nome||'Cliente')}" loading="lazy" decoding="async">`;
      return href
        ?`<a class="client-logo" href="${esc(href)}" target="_blank" rel="noopener noreferrer" title="${esc(item.nome||'Cliente')}">${content}</a>`
        :`<span class="client-logo" title="${esc(item.nome||'Cliente')}">${content}</span>`;
    }).join('');
}

function animate(){
  const elements=$$('.reveal');
  if(reducedMotion||!('IntersectionObserver'in window)){
    elements.forEach(element=>element.classList.add('visible'));
    return;
  }
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },{threshold:.06});
  elements.forEach(element=>{
    if(!element.classList.contains('visible'))observer.observe(element);
  });
}

function carousel(slides,track,dots,prev,next,render,delay=6500){
  if(!Array.isArray(slides)||!slides.length||!track)return;
  let index=0;
  let timer=null;
  let paused=false;
  const host=track.closest('.home-slider,.about-gallery-slider')||track.parentElement;
  const stop=()=>{
    if(timer){clearTimeout(timer);timer=null;}
  };
  const schedule=()=>{
    stop();
    if(reducedMotion||paused||document.hidden||slides.length<2)return;
    timer=setTimeout(()=>go(index+1),delay);
  };
  const go=nextIndex=>{
    index=(nextIndex+slides.length)%slides.length;
    render(slides,index,track,dots);
    schedule();
  };
  prev?.addEventListener('click',()=>go(index-1));
  next?.addEventListener('click',()=>go(index+1));
  dots?.addEventListener('click',event=>{
    const button=event.target.closest('[data-slide]');
    if(button)go(Number(button.dataset.slide));
  });
  host?.addEventListener('mouseenter',()=>{paused=true;stop()});
  host?.addEventListener('mouseleave',()=>{paused=false;schedule()});
  host?.addEventListener('focusin',()=>{paused=true;stop()});
  host?.addEventListener('focusout',()=>{paused=false;schedule()});
  document.addEventListener('visibilitychange',()=>document.hidden?stop():schedule());
  go(0);
}

function featuredCarousel(items){
  const track=$('#featuredProducts');
  if(!track)return;
  const list=Array.isArray(items)?items:[];
  track.className='featured-carousel-track';
  track.setAttribute('role','region');
  track.setAttribute('aria-roledescription','carrossel');
  track.setAttribute('aria-label','Produtos em destaque');
  track.innerHTML=list.length?list.map(productCard).join(''):'<div class="empty-state"><h3>Nenhum produto em destaque</h3></div>';
  if(!list.length)return;
  const container=track.parentElement;
  let viewport=container.querySelector('.featured-carousel-viewport');
  if(!viewport){
    viewport=document.createElement('div');
    viewport.className='featured-carousel-viewport';
    track.before(viewport);
    viewport.appendChild(track);
  }
  const heading=container.querySelector('.section-heading');
  let row=container.querySelector('.featured-heading-row');
  if(!row&&heading){
    row=document.createElement('div');
    row.className='featured-heading-row';
    heading.before(row);
    row.appendChild(heading);
    row.insertAdjacentHTML('beforeend','<div class="featured-carousel-controls"><button type="button" class="featured-arrow" data-featured-prev aria-label="Produto anterior"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i></button><button type="button" class="featured-arrow" data-featured-next aria-label="Próximo produto"><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button></div>');
  }
  const controls=container.querySelector('.featured-carousel-controls');
  const prev=container.querySelector('[data-featured-prev]');
  const next=container.querySelector('[data-featured-next]');
  let timer=null;
  let paused=false;
  const behavior=()=>reducedMotion?'auto':'smooth';
  const step=()=>{
    const card=track.querySelector('.product-card');
    if(!card)return track.clientWidth;
    const gap=parseFloat(getComputedStyle(track).gap)||24;
    return card.getBoundingClientRect().width+gap;
  };
  const hasOverflow=()=>track.scrollWidth>track.clientWidth+8;
  const stop=()=>{
    if(timer){clearTimeout(timer);timer=null;}
  };
  const schedule=()=>{
    stop();
    controls?.toggleAttribute('hidden',!hasOverflow());
    if(reducedMotion||paused||document.hidden||!hasOverflow())return;
    timer=setTimeout(()=>move(1),5200);
  };
  const move=direction=>{
    const end=track.scrollLeft+track.clientWidth>=track.scrollWidth-8;
    const start=track.scrollLeft<=8;
    if(direction>0&&end)track.scrollTo({left:0,behavior:behavior()});
    else if(direction<0&&start)track.scrollTo({left:track.scrollWidth,behavior:behavior()});
    else track.scrollBy({left:direction*step(),behavior:behavior()});
    schedule();
  };
  prev?.addEventListener('click',()=>move(-1));
  next?.addEventListener('click',()=>move(1));
  track.addEventListener('mouseenter',()=>{paused=true;stop()});
  track.addEventListener('mouseleave',()=>{paused=false;schedule()});
  track.addEventListener('focusin',()=>{paused=true;stop()});
  track.addEventListener('focusout',()=>{paused=false;schedule()});
  track.addEventListener('touchstart',()=>{paused=true;stop()},{passive:true});
  track.addEventListener('touchend',()=>{paused=false;schedule()},{passive:true});
  document.addEventListener('visibilitychange',()=>document.hidden?stop():schedule());
  window.addEventListener('resize',schedule,{passive:true});
  requestAnimationFrame(schedule);
}

function lightbox(){
  if($('#lightbox'))return;
  const lightbox=document.createElement('div');
  lightbox.id='lightbox';
  lightbox.className='lightbox';
  lightbox.setAttribute('role','dialog');
  lightbox.setAttribute('aria-modal','true');
  lightbox.setAttribute('aria-label','Imagem ampliada');
  lightbox.innerHTML='<button type="button" class="lightbox-close" aria-label="Fechar imagem"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button><img alt="Imagem ampliada">';
  document.body.appendChild(lightbox);
  const close=()=>lightbox.classList.remove('open');
  document.addEventListener('click',event=>{
    const trigger=event.target.closest('[data-lightbox]');
    if(trigger){
      const image=$('img',lightbox);
      image.src=safeAsset(trigger.dataset.lightbox,FALLBACK_IMAGE);
      image.alt=$('img',trigger)?.alt||'Imagem ampliada';
      lightbox.classList.add('open');
      $('.lightbox-close',lightbox)?.focus();
      return;
    }
    if(event.target===lightbox||event.target.closest('.lightbox-close'))close();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape')close();
  });
}

async function home(config){
  const [rawProducts,categories,catalogs,clients]=await Promise.all([
    load('produtos',[]),
    load('categorias',[]),
    load('catalogos',[]),
    load('clientes',[])
  ]);
  const slides=(Array.isArray(config.slides)?config.slides:[])
    .filter(slide=>slide.ativo!==false&&safeAsset(slide.imagem))
    .sort(order);
  const sliderTrack=$('#slidesTrack');
  const slider=$('#homeSlider');
  if(slides.length){
    carousel(slides,sliderTrack,$('#slideDots'),$('#slidePrev'),$('#slideNext'),(items,index,track,dots)=>{
      track.innerHTML=items.map((slide,position)=>{
        const background=safeAsset(slide.imagem,FALLBACK_IMAGE);
        const link=safeHref(slide.link,'produtos.html');
        return `<article class="hero-slide ${position===index?'active':''}" data-bg="${esc(background)}" aria-hidden="${position===index?'false':'true'}"><div class="container slide-inner"><div class="slide-copy"><span class="kicker">${esc(slide.etiqueta||'DropTech Mangueiras')}</span><h1>${esc(slide.titulo||'')}</h1><p>${esc(slide.texto||'')}</p><a class="btn btn-green" href="${esc(link)}">${esc(slide.botao||'Saiba mais')} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a></div></div></article>`;
      }).join('');
      $$('.hero-slide',track).forEach(element=>{
        const background=safeAsset(element.dataset.bg,FALLBACK_IMAGE).replace(/"/g,'%22');
        element.style.backgroundImage=`url("${background}")`;
      });
      dots.innerHTML=items.map((_,position)=>`<button type="button" class="slider-dot ${position===index?'active':''}" data-slide="${position}" aria-label="Ir para o slide ${position+1}" ${position===index?'aria-current="true"':''}></button>`).join('');
    });
  }else if(slider){
    slider.hidden=true;
  }
  if($('#aboutTitle'))$('#aboutTitle').textContent=config.sobre?.titulo||'';
  if($('#aboutSummary'))$('#aboutSummary').textContent=config.sobre?.resumo||'';
  if(config.sobre?.imagem&&$('#homeAboutImage'))$('#homeAboutImage').src=safeAsset(config.sobre.imagem,FALLBACK_IMAGE);
  if($('#homeStats'))$('#homeStats').innerHTML=(config.destaques||[]).slice(0,3).map(statHTML).join('');
  if($('#categoryGrid'))$('#categoryGrid').innerHTML=(Array.isArray(categories)?categories:[]).filter(item=>item.ativo!==false).sort(order).map(categoryCard).join('');
  const available=prepareProducts((Array.isArray(rawProducts)?rawProducts:[]).filter(item=>item.disponivel!==false).sort(order));
  const featured=available.filter(item=>item.destaque);
  featuredCarousel(featured.length?featured:available);
  const availableCatalogs=(Array.isArray(catalogs)?catalogs:[]).filter(item=>item.ativo!==false&&safeAsset(item.arquivo)).sort(order);
  if(availableCatalogs.length&&$('#homeCatalogLink')){
    $('#homeCatalogLink').href=safeAsset(availableCatalogs[0].arquivo);
    $('#homeCatalogLink').target='_blank';
    $('#homeCatalogLink').rel='noopener noreferrer';
  }else{
    $('#homeCatalog')?.remove();
  }
  const clientMarkup=clientsHTML(clients);
  if(clientMarkup&&$('#homeClients'))$('#homeClients').innerHTML=clientMarkup;
  else $('#homeClientsSection')?.remove();
}

async function about(config){
  const gallery=(await load('galeria',[])).filter(item=>item.publicado!==false&&safeAsset(item.imagem)).sort(order);
  if($('#historyTitle'))$('#historyTitle').textContent=config.sobre?.titulo||'Quem somos';
  if($('#historyText'))$('#historyText').textContent=config.sobre?.historia||'';
  if($('#historyText2'))$('#historyText2').textContent=config.sobre?.historia2||'';
  if($('#historyDetail'))$('#historyDetail').textContent=config.sobre?.historia2||config.sobre?.historia||'';
  if($('#mission'))$('#mission').textContent=config.sobre?.missao||'';
  if($('#vision'))$('#vision').textContent=config.sobre?.visao||'';
  if($('#values'))$('#values').innerHTML=(config.sobre?.valores||[]).map(value=>`<span class="tag">${esc(value)}</span>`).join('');
  if($('#aboutStats'))$('#aboutStats').innerHTML=(config.destaques||[]).slice(0,3).map(statHTML).join('');
  const images=[config.sobre?.imagem,...gallery.map(item=>item.imagem)]
    .map(value=>safeAsset(value))
    .filter(Boolean)
    .filter((value,index,array)=>array.indexOf(value)===index);
  if(images.length){
    carousel(images,$('#aboutSlideImage'),$('#aboutDots'),$('#aboutPrev'),$('#aboutNext'),(items,index,image,dots)=>{
      image.src=items[index];
      dots.innerHTML=items.map((_,position)=>`<button type="button" class="mini-dot ${position===index?'active':''}" data-slide="${position}" aria-label="Ir para a imagem ${position+1}" ${position===index?'aria-current="true"':''}></button>`).join('');
    },7000);
  }
  if(gallery.length&&$('#aboutGallery')){
    $('#aboutGallery').innerHTML=gallery.slice(0,5).map(item=>{
      const image=safeAsset(item.imagem,FALLBACK_IMAGE);
      return `<figure class="reveal" tabindex="0" role="button" aria-label="Ampliar ${esc(item.titulo||'imagem DropTech')}" data-lightbox="${esc(image)}"><img src="${esc(image)}" alt="${esc(item.titulo||'DropTech')}" loading="lazy" decoding="async"></figure>`;
    }).join('');
    lightbox();
    $('#aboutGallery').addEventListener('keydown',event=>{
      if((event.key==='Enter'||event.key===' ')&&event.target.matches('[data-lightbox]')){
        event.preventDefault();
        event.target.click();
      }
    });
  }else{
    $('#gallerySection')?.remove();
  }
  const clients=await load('clientes',[]);
  const clientMarkup=clientsHTML(clients);
  if(clientMarkup&&$('#aboutClients'))$('#aboutClients').innerHTML=clientMarkup;
  else $('#aboutClientsSection')?.remove();
}

async function products(config){
  const [rawItems,categories,catalogs,certifications]=await Promise.all([
    load('produtos',[]),
    load('categorias',[]),
    load('catalogos',[]),
    load('certificacoes',[])
  ]);
  if($('#productsIntroTitle'))$('#productsIntroTitle').textContent=config.produtos?.titulo||'Conheça nossa linha de produtos';
  if($('#productsIntroText'))$('#productsIntroText').textContent=config.produtos?.texto||config.descricao||'';
  if(config.produtos?.imagem&&$('#productsIntroImage'))$('#productsIntroImage').src=safeAsset(config.produtos.imagem,FALLBACK_IMAGE);
  const activeCategories=(Array.isArray(categories)?categories:[]).filter(item=>item.ativo!==false).sort(order);
  if($('#categoryGrid'))$('#categoryGrid').innerHTML=activeCategories.map(categoryCard).join('');
  const available=prepareProducts((Array.isArray(rawItems)?rawItems:[]).filter(item=>item.disponivel!==false).sort(order));
  const params=new URLSearchParams(location.search);
  let category=String(params.get('categoria')||'all').slice(0,100);
  let query=String(params.get('q')||'').trim().slice(0,80);
  const validCategoryKeys=new Set(activeCategories.map(item=>String(item.slug)));
  if(category!=='all'&&!validCategoryKeys.has(category))category='all';
  const input=$('#productSearch');
  if(input)input.value=query;
  const filters=[{slug:'all',nome:'Todos'},...activeCategories];
  if($('#categoryFilters'))$('#categoryFilters').innerHTML=filters.map(item=>`<button class="filter-chip ${item.slug===category?'active':''}" data-category="${esc(item.slug)}" type="button">${esc(item.nome)}</button>`).join('');
  const syncUrl=()=>{
    const next=new URLSearchParams();
    if(category!=='all')next.set('categoria',category);
    if(query.trim())next.set('q',query.trim());
    const suffix=next.toString()?`?${next}`:'';
    history.replaceState(null,'',`${location.pathname}${suffix}${location.hash}`);
  };
  const draw=()=>{
    let list=available;
    if(category!=='all')list=list.filter(item=>item.categoria===category);
    const normalizedQuery=searchable(query.trim());
    if(normalizedQuery){
      list=list.filter(item=>searchable(`${item.nome||''} ${item.resumo||''} ${item.descricao||''} ${item.categoriaNome||''}`).includes(normalizedQuery));
    }
    if($('#productsGrid'))$('#productsGrid').innerHTML=list.length?list.map(productCard).join(''):'<div class="empty-state"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><h3>Nenhum produto encontrado</h3><p>Tente outro termo ou categoria.</p></div>';
    syncUrl();
    animate();
  };
  $('#categoryFilters')?.addEventListener('click',event=>{
    const button=event.target.closest('[data-category]');
    if(!button)return;
    category=button.dataset.category;
    $$('.filter-chip').forEach(item=>item.classList.toggle('active',item===button));
    draw();
  });
  $('#productSearchForm')?.addEventListener('submit',event=>{
    event.preventDefault();
    query=(input?.value.trim()||'').slice(0,80);
    draw();
  });
  draw();
  const availableCatalogs=(Array.isArray(catalogs)?catalogs:[]).filter(item=>item.ativo!==false&&safeAsset(item.arquivo)).sort(order);
  if(availableCatalogs.length&&$('#catalogGrid')){
    $('#catalogGrid').innerHTML=availableCatalogs.map(item=>{
      const file=safeAsset(item.arquivo);
      const cover=safeAsset(item.capa);
      return `<article class="download-card reveal"><div class="download-cover">${cover?`<img src="${esc(cover)}" alt="${esc(item.titulo||'Catálogo DropTech')}" loading="lazy" decoding="async">`:'<i class="fa-regular fa-file-pdf" aria-hidden="true"></i>'}</div><div class="download-body"><h3>${esc(item.titulo||'Catálogo')}</h3><p>${esc(item.descricao||'')}</p><a class="text-link" href="${esc(file)}" target="_blank" rel="noopener noreferrer">Baixar catálogo <i class="fa-solid fa-arrow-down" aria-hidden="true"></i></a></div></article>`;
    }).join('');
  }else{
    $('#catalogSection')?.remove();
  }
  const activeCertifications=(Array.isArray(certifications)?certifications:[]).filter(item=>item.ativo!==false).sort(order);
  if(activeCertifications.length&&$('#certGrid')){
    $('#certGrid').innerHTML=activeCertifications.map(item=>{
      const image=safeAsset(item.imagem);
      const href=safeHttps(item.link);
      const inner=`${image?`<img src="${esc(image)}" alt="${esc(item.nome||'Certificação')}" loading="lazy" decoding="async">`:''}<strong>${esc(item.nome||'Certificação')}</strong>`;
      return href?`<a class="cert-card reveal" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${inner}</a>`:`<article class="cert-card reveal">${inner}</article>`;
    }).join('');
  }else{
    $('#certSection')?.remove();
  }
}

async function detail(config){
  const requestedId=String(new URLSearchParams(location.search).get('id')||'').slice(0,180);
  const products=prepareProducts(await load('produtos',[]));
  let product=products.find(item=>item._publicId===requestedId&&item.disponivel!==false);
  if(!product){
    const legacyMatches=products.filter(item=>item._originalId===requestedId&&item.disponivel!==false);
    product=legacyMatches[0];
  }
  if(!product){
    if($('#productDetail'))$('#productDetail').innerHTML='<div class="empty-state"><h3>Produto não encontrado</h3><p>O endereço pode estar incorreto ou o produto não está publicado.</p><a class="btn btn-green" href="produtos.html">Ver todos os produtos</a></div>';
    return;
  }
  document.title=`${product.nome} | DropTech Mangueiras`;
  const metaDescription=$('meta[name="description"]');
  if(metaDescription)metaDescription.content=String(product.resumo||product.descricao||'Produto DropTech').replace(/\s+/g,' ').trim().slice(0,160);
  const images=[product.imagem,...(Array.isArray(product.galeria)?product.galeria:[])]
    .map(value=>safeAsset(value))
    .filter(Boolean)
    .filter((value,index,array)=>array.indexOf(value)===index);
  if(!images.length)images.push(FALLBACK_IMAGE);
  const technical=product.fichaTecnica||{};
  const rows=Array.isArray(technical.linhas)?technical.linhas.filter(row=>row&&(row.valor1||row.valor2||row.valor3)):[];
  const overview=[
    (product.aplicacoes||[]).length&&['Aplicação',(product.aplicacoes||[]).join(' · ')],
    technical.composicao&&['Material / composição',technical.composicao],
    technical.pressaoTrabalho&&['Pressão de trabalho',technical.pressaoTrabalho],
    technical.temperaturaTrabalho&&['Temperatura de trabalho',technical.temperaturaTrabalho]
  ].filter(Boolean);
  const showTechnical=overview.length||rows.length||technical.observacoes;
  const table=rows.length?`<div class="tech-table-wrap"><table class="tech-table"><thead><tr><th>${esc(technical.coluna1Titulo||'Medida / diâmetro')}</th><th>${esc(technical.coluna2Titulo||'Espessura / parede')}</th><th>${esc(technical.coluna3Titulo||'Comprimento / rolo')}</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${esc(row.valor1||'—')}</td><td>${esc(row.valor2||'—')}</td><td>${esc(row.valor3||'—')}</td></tr>`).join('')}</tbody></table></div>`:'';
  if($('#productDetail'))$('#productDetail').innerHTML=`<div><div class="detail-main-image"><img id="mainProductImage" src="${esc(images[0])}" alt="${esc(product.nome)}" decoding="async"></div>${images.length>1?`<div class="detail-thumbs">${images.map((image,index)=>`<button type="button" class="detail-thumb ${index===0?'active':''}" data-img="${esc(image)}" aria-label="Ver imagem ${index+1} de ${esc(product.nome)}"><img src="${esc(image)}" alt="" loading="lazy" decoding="async"></button>`).join('')}</div>`:''}</div><div class="detail-copy"><span class="category-label">${esc(product.categoriaNome||product.categoria||'')}</span><h1>${esc(product.nome||'Produto DropTech')}</h1><p class="description">${esc(product.descricao||product.resumo||'')}</p>${(product.caracteristicas||[]).length?`<ul class="detail-list">${product.caracteristicas.map(item=>`<li><i class="fa-solid fa-check" aria-hidden="true"></i>${esc(item)}</li>`).join('')}</ul>`:''}<div class="detail-actions"><a class="btn btn-green" href="${esc(wa(config,`Olá! Gostaria de informações sobre ${product.nome}.`))}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Solicitar informações</a><a class="btn btn-outline" href="produtos.html">Voltar aos produtos</a></div></div>${showTechnical?`<section class="technical-sheet"><div class="technical-sheet-head"><div><span class="kicker">Ficha do produto</span><h2>Informações técnicas</h2></div><p>Dados essenciais para identificar a opção mais adequada à aplicação.</p></div>${overview.length?`<div class="technical-overview">${overview.map(([key,value])=>`<article><span>${esc(key)}</span><strong>${esc(value)}</strong></article>`).join('')}</div>`:''}${table}${technical.observacoes?`<div class="technical-note"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><div><strong>Observações</strong><p>${esc(technical.observacoes)}</p></div></div>`:''}</section>`:''}`;
  $$('.detail-thumb').forEach(button=>button.addEventListener('click',()=>{
    $('#mainProductImage').src=safeAsset(button.dataset.img,FALLBACK_IMAGE);
    $$('.detail-thumb').forEach(item=>item.classList.remove('active'));
    button.classList.add('active');
  }));
}

function contact(config){
  const content=config.contatoPagina||{};
  if($('#contactKicker'))$('#contactKicker').textContent=content.etiqueta||'Contato';
  if($('#contactPageTitle'))$('#contactPageTitle').textContent=content.titulo||'Fale conosco';
  if($('#contactPageText'))$('#contactPageText').textContent=content.texto||'';
  if(content.imagem&&$('#contactPhoto'))$('#contactPhoto').src=safeAsset(content.imagem,FALLBACK_IMAGE);
  if($('#contactPhone'))$('#contactPhone').textContent=config.contato?.telefone||'';
  if($('#contactPhoneLink'))$('#contactPhoneLink').href=wa(config);
  if($('#contactEmail'))$('#contactEmail').textContent=config.contato?.email||'';
  if($('#contactEmailLink'))$('#contactEmailLink').href=mail(config);
  const address=[config.endereco?.linha1,config.endereco?.cidade,config.endereco?.estado,config.endereco?.cep].filter(Boolean).join(', ');
  if($('#contactAddress'))$('#contactAddress').textContent=[config.endereco?.linha1,config.endereco?.cidade,config.endereco?.estado].filter(Boolean).join(' · ');
  if($('#contactHours'))$('#contactHours').textContent=config.contato?.horario||'';
  const map=$('#contactMap');
  const mapLink=$('#contactMapLink');
  const mapSection=$('#contactMapSection');
  const customMap=safeMapLink(config.endereco?.mapa);
  const customEmbed=safeMapEmbed(config.endereco?.mapaEmbed)||safeMapEmbed(config.endereco?.mapa);
  const fallbackEmbed=address?`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`:'';
  const embed=customEmbed||fallbackEmbed;
  if(map&&embed){
    map.src=embed;
    if(mapLink){
      mapLink.href=customMap||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      mapLink.rel='noopener noreferrer';
    }
  }else if(mapSection){
    mapSection.hidden=true;
  }
  $('#contactForm')?.addEventListener('submit',event=>{
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const field=(name,max)=>String(form.get(name)||'').replace(/[\u0000-\u001f\u007f]+/g,' ').trim().slice(0,max);
    const nome=field('nome',120),email=field('email',254),telefone=field('telefone',30),cidade=field('cidade',120),estado=field('estado',2),texto=field('mensagem',1500);
    const message=`Olá! Meu nome é ${nome}.\n\nE-mail: ${email}\nTelefone: ${telefone}\nCidade/UF: ${cidade}${estado?' / '+estado:''}\n\nMensagem: ${texto}`;
    const popup=window.open(wa(config,message),'_blank','noopener,noreferrer');
    if(popup)popup.opener=null;
  });
}

async function init(){
  try{
    const config=await load('empresa',{});
    header();
    footer(config);
    if(page==='home')await home(config);
    if(page==='sobre')await about(config);
    if(page==='produtos')await products(config);
    if(page==='produto')await detail(config);
    if(page==='contato')contact(config);
    animate();
    document.documentElement.dataset.siteReady='true';
  }catch(error){
    console.error('[DropTech] Falha inesperada ao inicializar o site.',error);
    document.documentElement.dataset.siteReady='error';
  }
}

document.addEventListener('DOMContentLoaded',init);
})();
