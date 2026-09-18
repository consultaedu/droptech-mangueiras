import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT=process.cwd();
let errors=0;
let warnings=0;

const error=(message)=>{errors+=1; console.error(`::error::${message}`)};
const warn=(message)=>{warnings+=1; console.warn(`::warning::${message}`)};
const ok=(message)=>console.log(`✓ ${message}`);

function readJson(relative){
  const file=path.join(ROOT,relative);
  try{return JSON.parse(fs.readFileSync(file,'utf8'))}
  catch(e){error(`${relative}: JSON inválido (${e.message})`); return null}
}

function localPath(value){
  const raw=String(value||'').trim().replace(/\\/g,'/').replace(/^\/+/, '');
  if(!raw)return '';
  if(raw.split('/').includes('..'))return '';
  if(!/^(assets|favicon)\//i.test(raw))return '';
  return raw;
}

function checkAsset(value,label,{required=false,extensions=[]}={}){
  const raw=String(value||'').trim();
  if(!raw){if(required)error(`${label}: arquivo obrigatório não informado`); return}
  const rel=localPath(raw);
  if(!rel){error(`${label}: caminho local inválido (${raw})`); return}
  if(extensions.length&&!extensions.some(ext=>rel.toLowerCase().endsWith(`.${ext}`))){
    error(`${label}: extensão não permitida (${rel})`);
  }
  const absolute=path.join(ROOT,rel);
  if(!fs.existsSync(absolute))error(`${label}: arquivo não existe no repositório (${rel})`);
}

function safeHttps(value){
  const raw=String(value||'').trim();
  if(!raw)return true;
  try{return new URL(raw).protocol==='https:'}catch{return false}
}

function isGoogleHost(host){
  return /^(?:www|maps)\.google\.(?:com|com\.br)$/i.test(String(host||''));
}

function validateGoogleMapLink(value,label){
  const raw=String(value||'').trim();
  if(!raw)return;
  try{
    const url=new URL(raw);
    const allowed=url.hostname.toLowerCase()==='maps.app.goo.gl'||isGoogleHost(url.hostname);
    if(url.protocol!=='https:'||!allowed)error(`${label}: use somente URL HTTPS do Google Maps`);
  }catch{error(`${label}: URL inválida`)}
}

function validateGoogleMapEmbed(value,label){
  const raw=String(value||'').trim();
  if(!raw)return;
  if(/<script\b/i.test(raw)){error(`${label}: <script> não é permitido`); return}
  const match=raw.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  const candidate=(match?match[1]:raw).replace(/&amp;/g,'&').trim();
  try{
    const url=new URL(candidate);
    const embed=/\/maps\/embed(?:\/|$)/i.test(url.pathname)||url.searchParams.get('output')==='embed';
    if(url.protocol!=='https:'||!isGoogleHost(url.hostname)||!embed){
      error(`${label}: o iframe precisa apontar para um mapa incorporado oficial do Google`);
    }
  }catch{error(`${label}: iframe/URL de mapa inválido`)}
}

function scanDangerous(value,label='conteúdo'){
  if(typeof value==='string'){
    if(/^\s*(?:javascript|data|vbscript|file|blob):/i.test(value))error(`${label}: esquema de URL perigoso detectado`);
    if(/<script\b/i.test(value))error(`${label}: tag <script> não permitida`);
    return;
  }
  if(Array.isArray(value))return value.forEach((item,index)=>scanDangerous(item,`${label}[${index}]`));
  if(value&&typeof value==='object')for(const [key,item] of Object.entries(value))scanDangerous(item,`${label}.${key}`);
}

const empresa=readJson('conteudo/empresa.json')||{};
const produtos=readJson('conteudo/produtos.json')||[];
const categorias=readJson('conteudo/categorias.json')||[];
const galeria=readJson('conteudo/galeria.json')||[];
const clientes=readJson('conteudo/clientes.json')||[];
const catalogos=readJson('conteudo/catalogos.json')||[];
const certificacoes=readJson('conteudo/certificacoes.json')||[];

for(const [name,data] of Object.entries({empresa,produtos,categorias,galeria,clientes,catalogos,certificacoes}))scanDangerous(data,`conteudo/${name}.json`);

if(!Array.isArray(produtos))error('conteudo/produtos.json precisa ser uma lista');
if(!Array.isArray(categorias))error('conteudo/categorias.json precisa ser uma lista');

const slugRe=/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;
const categorySlugs=new Set();
for(const [index,category] of categorias.entries()){
  const label=`Categoria #${index+1} (${category?.nome||category?.slug||'sem nome'})`;
  if(!category?.slug||!slugRe.test(category.slug))error(`${label}: identificador inválido`);
  if(categorySlugs.has(category?.slug))error(`${label}: identificador duplicado "${category.slug}"`);
  categorySlugs.add(category?.slug);
  if(!category?.nome)error(`${label}: nome obrigatório`);
  checkAsset(category?.imagem,`${label} / imagem`,{required:category?.ativo!==false,extensions:['jpg','jpeg','png','webp']});
}

const ids=new Map();
for(const [index,product] of produtos.entries()){
  const label=`Produto #${index+1} (${product?.nome||product?.id||'sem nome'})`;
  if(!product?.id||!slugRe.test(product.id))error(`${label}: identificador inválido`);
  if(product?.id){
    if(!ids.has(product.id))ids.set(product.id,[]);
    ids.get(product.id).push(product?.nome||`#${index+1}`);
  }
  if(!product?.nome)error(`${label}: nome obrigatório`);
  if(!product?.categoria||!categorySlugs.has(product.categoria))error(`${label}: categoria "${product?.categoria||''}" não existe`);
  checkAsset(product?.imagem,`${label} / foto principal`,{required:product?.disponivel!==false,extensions:['jpg','jpeg','png','webp']});
  for(const [gIndex,image] of (Array.isArray(product?.galeria)?product.galeria:[]).entries()){
    checkAsset(image,`${label} / galeria #${gIndex+1}`,{extensions:['jpg','jpeg','png','webp']});
  }
}
for(const [id,names] of ids.entries()){
  if(names.length>1)warn(`Identificador de produto duplicado "${id}": ${names.join(' / ')}. Corrija no CMS para links individuais permanentes.`);
}

for(const [index,item] of galeria.entries())checkAsset(item?.imagem,`Galeria #${index+1} / imagem`,{required:item?.publicado!==false,extensions:['jpg','jpeg','png','webp']});
for(const [index,item] of clientes.entries()){
  checkAsset(item?.logo,`Cliente #${index+1} / logo`,{required:item?.ativo!==false,extensions:['jpg','jpeg','png','webp']});
  if(item?.link&&!safeHttps(item.link))error(`Cliente #${index+1}: link precisa usar HTTPS`);
}
for(const [index,item] of catalogos.entries()){
  checkAsset(item?.capa,`Catálogo #${index+1} / capa`,{extensions:['jpg','jpeg','png','webp']});
  checkAsset(item?.arquivo,`Catálogo #${index+1} / PDF`,{required:item?.ativo!==false,extensions:['pdf']});
}
for(const [index,item] of certificacoes.entries()){
  checkAsset(item?.imagem,`Certificação #${index+1} / imagem`,{extensions:['jpg','jpeg','png','webp']});
  if(item?.link&&!safeHttps(item.link))error(`Certificação #${index+1}: link precisa usar HTTPS`);
}

for(const [key,value] of Object.entries(empresa?.redes||{})){
  if(value&&!safeHttps(value))error(`Rede social ${key}: link precisa usar HTTPS`);
}
for(const [index,slide] of (Array.isArray(empresa?.slides)?empresa.slides:[]).entries()){
  checkAsset(slide?.imagem,`Slide #${index+1} / imagem`,{required:slide?.ativo!==false,extensions:['jpg','jpeg','png','webp']});
  const link=String(slide?.link||'').trim();
  if(link&&/^https?:/i.test(link)&&!safeHttps(link))error(`Slide #${index+1}: link externo precisa usar HTTPS`);
  if(/^\s*(?:javascript|data|vbscript|file|blob):/i.test(link))error(`Slide #${index+1}: link perigoso`);
}
checkAsset(empresa?.sobre?.imagem,'Quem somos / imagem',{extensions:['jpg','jpeg','png','webp']});
checkAsset(empresa?.produtos?.imagem,'Página Produtos / imagem',{extensions:['jpg','jpeg','png','webp']});
checkAsset(empresa?.contatoPagina?.imagem,'Página Contato / imagem',{extensions:['jpg','jpeg','png','webp']});
validateGoogleMapLink(empresa?.endereco?.mapa,'Endereço / link do Google Maps');
validateGoogleMapEmbed(empresa?.endereco?.mapaEmbed,'Endereço / mapa incorporado');

const phone=String(empresa?.contato?.whatsapp||'').trim();
if(phone&&!/^\d{10,15}$/.test(phone))error('WhatsApp: use apenas 10 a 15 números, incluindo DDI e DDD');
const email=String(empresa?.contato?.email||'').trim();
if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))error('E-mail de contato inválido');

// Segurança estrutural básica dos HTMLs estáticos.
const htmlFiles=fs.readdirSync(ROOT).filter(file=>file.endsWith('.html'));
for(const file of htmlFiles){
  const html=fs.readFileSync(path.join(ROOT,file),'utf8');
  const ids=[...html.matchAll(/\sid=["']([^"']+)["']/gi)].map(match=>match[1]);
  const dupIds=[...new Set(ids.filter((id,index)=>ids.indexOf(id)!==index))];
  if(dupIds.length)error(`${file}: IDs HTML duplicados: ${dupIds.join(', ')}`);
  for(const match of html.matchAll(/<a\b([^>]*\btarget=["']_blank["'][^>]*)>/gi)){
    const attrs=match[1];
    if(!/\brel=["'][^"']*noopener/i.test(attrs))error(`${file}: link target=_blank sem rel=noopener`);
  }
  if(/<script(?![^>]+\bsrc=)[^>]*>/i.test(html))error(`${file}: script inline detectado; prefira arquivo local permitido pela CSP`);
  if(!/http-equiv=[\"']Content-Security-Policy[\"']/i.test(html))error(`${file}: Content-Security-Policy ausente`);
  if(!/name=[\"']referrer[\"']/i.test(html))error(`${file}: política de referrer ausente`);
  for(const match of html.matchAll(/\b(?:src|href|action)=[\"']([^\"']+)[\"']/gi)){
    let ref=match[1].trim();
    if(!ref||ref.startsWith('#')||/^(?:https:|mailto:|tel:|data:)/i.test(ref))continue;
    if(/^http:/i.test(ref)){error(`${file}: recurso HTTP inseguro (${ref})`);continue}
    ref=ref.split('#')[0].split('?')[0].replace(/^\/+/, '');
    if(!ref)continue;
    const absolute=path.join(ROOT,ref);
    if(!fs.existsSync(absolute))error(`${file}: referência local ausente (${ref})`);
  }
}

const cssPath=path.join(ROOT,'assets/css/style.css');
if(fs.existsSync(cssPath)){
  const css=fs.readFileSync(cssPath,'utf8');
  for(const match of css.matchAll(/url\(\s*[\"']?([^\)\"']+)[\"']?\s*\)/gi)){
    let ref=match[1].trim();
    if(!ref||/^(?:data:|https?:|#)/i.test(ref))continue;
    ref=ref.split('#')[0].split('?')[0];
    const absolute=path.resolve(path.dirname(cssPath),ref);
    if(!fs.existsSync(absolute))error(`assets/css/style.css: referência local ausente (${ref})`);
  }
}


const uploadsDir=path.join(ROOT,'assets/uploads');
if(fs.existsSync(uploadsDir)){
  const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(dir,entry.name);
    return entry.isDirectory()?walk(full):[full];
  });
  const hashGroups=new Map();
  for(const file of walk(uploadsDir)){
    const size=fs.statSync(file).size;
    const rel=path.relative(ROOT,file).replace(/\\/g,'/');
    const ext=path.extname(file).toLowerCase();
    if(['.jpg','.jpeg','.png','.webp'].includes(ext)&&size>3*1024*1024)warn(`${rel}: imagem maior que 3 MB; considere comprimir para melhorar o carregamento`);
    if(ext==='.pdf'&&size>20*1024*1024)warn(`${rel}: PDF maior que 20 MB; pode ficar lento em redes móveis`);
    if(size<=10*1024*1024){
      const hash=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
      if(!hashGroups.has(hash))hashGroups.set(hash,[]);
      hashGroups.get(hash).push(rel);
    }
  }
  for(const group of hashGroups.values()){
    if(group.length>1)warn(`Arquivos duplicados em uploads: ${group.join(' | ')}`);
  }
}

if(!fs.existsSync(path.join(ROOT,'.pages.yml')))error('.pages.yml ausente');

console.log(`\nValidação concluída: ${errors} erro(s), ${warnings} aviso(s).`);
if(errors>0)process.exit(1);
ok('Estrutura básica, conteúdo e referências locais validados');
