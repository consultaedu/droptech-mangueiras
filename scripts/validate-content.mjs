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
  if(!fs.existsSync(absolute)||!fs.statSync(absolute).isFile())error(`${label}: arquivo não existe no repositório ou não é um arquivo (${rel})`);
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

function objectValue(value,label){
  if(!value||typeof value!=='object'||Array.isArray(value)){
    error(`${label}: precisa ser um objeto`); return {};
  }
  return value;
}
function listValue(value,label,{optional=false,objects=false}={}){
  if(optional&&value===undefined)return [];
  if(!Array.isArray(value)){error(`${label}: precisa ser uma lista`); return []}
  if(objects)return value.map((item,index)=>objectValue(item,`${label}[${index}]`));
  return value;
}
function content(name,{object=false}={}){
  const value=readJson(`conteudo/${name}.json`);
  scanDangerous(value,`conteudo/${name}.json`);
  return object?objectValue(value,`conteudo/${name}.json`):listValue(value,`conteudo/${name}.json`,{objects:true});
}
const empresa=content('empresa',{object:true});
const produtos=content('produtos');
const categorias=content('categorias');
const galeria=content('galeria');
const clientes=content('clientes');
const catalogos=content('catalogos');
const certificacoes=content('certificacoes');
for(const key of ['sobre','produtos','contatoPagina','catalogoHome','endereco','contato','redes']){
  if(empresa[key]!==undefined)empresa[key]=objectValue(empresa[key],`empresa.${key}`);
}
for(const [index,product] of produtos.entries()){
  for(const key of ['galeria','aplicacoes','caracteristicas']){
    if(product[key]!==undefined)product[key]=listValue(product[key],`Produto #${index+1} / ${key}`);
  }
  if(product.fichaTecnica!==undefined){
    product.fichaTecnica=objectValue(product.fichaTecnica,`Produto #${index+1} / fichaTecnica`);
    for(const key of ['linhas','coresDisponiveis']){
      if(product.fichaTecnica[key]!==undefined)listValue(product.fichaTecnica[key],`Produto #${index+1} / fichaTecnica.${key}`,{objects:key==='linhas'});
    }
  }
}
empresa.slides=listValue(empresa.slides,'empresa.slides',{optional:true,objects:true});
for(const key of ['destaques']){
  if(empresa[key]!==undefined)listValue(empresa[key],`empresa.${key}`,{objects:true});
}
if(empresa.sobre?.valores!==undefined)listValue(empresa.sobre.valores,'empresa.sobre.valores');

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
checkAsset(empresa?.catalogoHome?.imagem,'Catálogo na Home / imagem',{extensions:['jpg','jpeg','png','webp']});
validateGoogleMapLink(empresa?.endereco?.mapa,'Endereço / link do Google Maps');
validateGoogleMapEmbed(empresa?.endereco?.mapaEmbed,'Endereço / mapa incorporado');

const phone=String(empresa?.contato?.whatsapp||'').trim();
if(phone&&!/^\d{10,15}$/.test(phone))error('WhatsApp: use apenas 10 a 15 números, incluindo DDI e DDD');
const contacts=empresa?.contato?.contatos;
if(contacts!==undefined&&!Array.isArray(contacts))error('contato.contatos precisa ser uma lista');
let principals=0;
for(const [index,contact] of (Array.isArray(contacts)?contacts:[]).entries()){
  const label=`Contato #${index+1}`;
  if(!contact||typeof contact!=='object'||Array.isArray(contact)){
    error(`${label}: precisa ser um objeto`);
    continue;
  }
  for(const key of ['ativo','principal']){
    if(contact[key]!==undefined&&typeof contact[key]!=='boolean')error(`${label}: ${key} precisa ser booleano`);
  }
  const number=String(contact.whatsapp||'').trim();
  if(number&&!/^\d{10,15}$/.test(number))error(`${label}: WhatsApp deve ter apenas 10 a 15 números, incluindo DDI e DDD`);
  if(contact.ordem!==undefined&&(typeof contact.ordem!=='number'||!Number.isFinite(contact.ordem)))error(`${label}: ordem precisa ser um número finito`);
  if(contact.ativo!==false&&contact.principal===true){
    principals+=1;
    if(!number)error(`${label}: o contato principal ativo precisa ter WhatsApp`);
  }
}
if(principals>1)warn('Mais de um contato ativo marcado como principal; o site usará o primeiro por ordem');
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


// Inspeção limitada ao cabeçalho: sem decodificar imagens nem instalar dependências.
function mediaInfo(buffer){
  if(buffer.length>=24&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){
    return {format:'png',width:buffer.readUInt32BE(16),height:buffer.readUInt32BE(20)};
  }
  if(buffer.length>=12&&buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP'){
    for(let offset=12;offset+8<=buffer.length;){
      const kind=buffer.toString('ascii',offset,offset+4),length=buffer.readUInt32LE(offset+4),data=offset+8;
      if(kind==='VP8X'&&length>=10&&data+10<=buffer.length)return {format:'webp',width:1+buffer.readUIntLE(data+4,3),height:1+buffer.readUIntLE(data+7,3)};
      if(kind==='VP8 '&&length>=10&&data+10<=buffer.length&&buffer.subarray(data+3,data+6).equals(Buffer.from([157,1,42])))return {format:'webp',width:buffer.readUInt16LE(data+6)&16383,height:buffer.readUInt16LE(data+8)&16383};
      if(kind==='VP8L'&&length>=5&&data+5<=buffer.length&&buffer[data]===47){
        const bits=buffer.readUInt32LE(data+1);
        return {format:'webp',width:1+(bits&16383),height:1+((bits>>>14)&16383)};
      }
      offset=data+length+(length%2);
    }
    return {format:'webp'};
  }
  if(buffer.length>=3&&buffer[0]===255&&buffer[1]===216&&buffer[2]===255){
    let offset=2;
    while(offset+4<=buffer.length){
      if(buffer[offset++]!==255)break;
      while(offset<buffer.length&&buffer[offset]===255)offset++;
      const marker=buffer[offset++];
      if(marker===218||marker===217)break;
      if(marker===1||(marker>=208&&marker<=215))continue;
      if(offset+2>buffer.length)break;
      const length=buffer.readUInt16BE(offset);
      if(length<2||offset+length>buffer.length)break;
      if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&length>=7){
        return {format:'jpeg',height:buffer.readUInt16BE(offset+3),width:buffer.readUInt16BE(offset+5)};
      }
      offset+=length;
    }
    return {format:'jpeg'};
  }
  if(buffer.length>=10&&/^GIF8[79]a$/.test(buffer.toString('ascii',0,6)))return {format:'gif',width:buffer.readUInt16LE(6),height:buffer.readUInt16LE(8)};
  if(buffer.subarray(0,1024).includes(Buffer.from('%PDF-')))return {format:'pdf'};
  return {format:null};
}
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const full=path.join(dir,entry.name);
  return entry.isDirectory()?walk(full):entry.isFile()?[full]:[];
});
const hashGroups=new Map();
for(const directory of ['assets','favicon']){
  const absolute=path.join(ROOT,directory);
  if(!fs.existsSync(absolute))continue;
  for(const file of walk(absolute)){
    const size=fs.statSync(file).size;
    const rel=path.relative(ROOT,file).replace(/\\/g,'/');
    const ext=path.extname(file).toLowerCase();
    const image=['.jpg','.jpeg','.png','.webp','.gif'].includes(ext);
    if(image&&size>3*1024*1024)warn(`${rel}: imagem maior que 3 MB; considere comprimir para melhorar o carregamento`);
    if(ext==='.pdf'&&size>20*1024*1024)warn(`${rel}: PDF maior que 20 MB; pode ficar lento em redes móveis`);
    if(!image&&ext!=='.pdf'&&size>20*1024*1024)warn(`${rel}: arquivo maior que 20 MB`);
    if(image||ext==='.pdf'){
      const header=Buffer.alloc(Math.min(size,256*1024));
      const fd=fs.openSync(file,'r');
      try{fs.readSync(fd,header,0,header.length,0)}finally{fs.closeSync(fd)}
      const info=mediaInfo(header);
      const expected=ext==='.jpg'?'jpeg':ext.slice(1);
      if(!info.format)error(`${rel}: assinatura de mídia não reconhecida; arquivo inválido ou formato não suportado`);
      else if(info.format!==expected){
        // Formatos suportados que o navegador reconhece continuam sendo recomendações.
        if(image&&['jpeg','png','webp','gif'].includes(info.format))warn(`${rel}: extensão ${ext} não corresponde ao formato real ${info.format.toUpperCase()}`);
        else error(`${rel}: extensão ${ext} incompatível com o formato real ${info.format.toUpperCase()}`);
      }
      if(info.width>3000||info.height>3000||info.width*info.height>12000000)warn(`${rel}: imagem muito grande (${info.width} x ${info.height}); revise as dimensões de exibição`);
    }
    // Mantém o limite de 10 MB por upload e usa streaming para limitar a memória.
    if(rel.startsWith('assets/uploads/')&&size<=10*1024*1024){
      const hash=crypto.createHash('sha256');
      for await(const chunk of fs.createReadStream(file))hash.update(chunk);
      const digest=hash.digest('hex');
      if(!hashGroups.has(digest))hashGroups.set(digest,[]);
      hashGroups.get(digest).push(rel);
    }
  }
}
for(const group of hashGroups.values()){
  if(group.length>1)warn(`Arquivos duplicados em uploads: ${group.join(' | ')}`);
}

// Responsive-image manifests must resolve to real originals and derivatives.
const optimizedManifest=path.join(ROOT,'assets/optimized/manifest.json');
if(fs.existsSync(optimizedManifest)){
  const manifest=objectValue(readJson('assets/optimized/manifest.json'),'Manifesto de imagens');
  for(const [original,rawInfo] of Object.entries(manifest)){
    checkAsset(original,`Imagem original ${original}`,{required:true});
    const info=objectValue(rawInfo,`Imagem otimizada ${original}`);
    const variants=listValue(info.variants,`Variantes de ${original}`,{objects:true});
    for(const variant of variants){
      if(typeof variant.path!=='string'||!/^assets\/optimized\/[a-z0-9-]+\.webp$/.test(variant.path)){
        error(`${original}: caminho de variante inválido`); continue;
      }
      checkAsset(variant.path,`Variante de ${original}`,{required:true,extensions:['webp']});
      if(!Number.isInteger(variant.width)||!Number.isInteger(variant.height)||variant.width<1||variant.height<1||variant.width>info.width||variant.height>info.height){
        error(`${original}: dimensões de variante inválidas ou maiores que o original`);
      }
    }
    const rel=localPath(original);
    if(rel&&fs.existsSync(path.join(ROOT,rel))&&fs.statSync(path.join(ROOT,rel)).isFile()){
      const hash=crypto.createHash('sha256');
      for await(const chunk of fs.createReadStream(path.join(ROOT,rel)))hash.update(chunk);
      if(hash.digest('hex')!==info.sha256)warn(`${original}: original mudou; regenere as variantes para atualizar as imagens responsivas`);
    }
  }
}

if(!fs.existsSync(path.join(ROOT,'.pages.yml')))error('.pages.yml ausente');

console.log(`\nValidação concluída: ${errors} erro(s), ${warnings} aviso(s).`);
if(errors>0)process.exit(1);
ok('Estrutura básica, conteúdo e referências locais validados');
