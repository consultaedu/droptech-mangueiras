// Exercise the actual public artifact under the GitHub Pages project prefix.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {resolve, relative, extname, sep} from 'node:path';
import {chromium} from 'playwright';

const args=process.argv.slice(2);
const rootIndex=args.indexOf('--root');
const root=resolve(rootIndex>=0?args[rootIndex+1]:'.');
const prefix='/droptech-mangueiras/';
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.pdf':'application/pdf','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
const server=createServer(async(req,res)=>{
  try{
    const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(!path.startsWith(prefix)){res.writeHead(404).end();return}
    const file=resolve(root,path.slice(prefix.length)||'index.html');
    const local=relative(root,file);
    if(local==='..'||local.startsWith('..'+sep)){res.writeHead(403).end();return}
    if(!(await stat(file)).isFile()){res.writeHead(404).end();return}
    res.writeHead(200,{'Content-Type':types[extname(file).toLowerCase()]||'application/octet-stream'});
    res.end(await readFile(file));
  }catch{res.writeHead(404).end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}${prefix}`;
let browser;
let scenarios=0;
const originalUrls=new Set();
try{
  browser=await chromium.launch(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{});
  const context=await browser.newContext({reducedMotion:'reduce'});
  // External fonts, icons and Google Maps are outside this repository's checks.
  await context.route('**/*',route=>{
    if(new URL(route.request().url()).origin===new URL(base).origin)return route.continue();
    return route.fulfill({status:200,contentType:'text/plain',body:''});
  });
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  const products=JSON.parse(await readFile(resolve(root,'conteudo/produtos.json'),'utf8')).filter(item=>item.disponivel!==false);
  await page.goto(base+'produtos.html',{waitUntil:'domcontentloaded'});
  await page.locator('html[data-site-ready="true"]').waitFor();
  // Use actual public links, including the frontend's duplicate-ID disambiguation.
  const productLinks=await page.locator('.product-card a[href^="produto.html?id="]').evaluateAll(items=>[...new Set(items.map(item=>item.getAttribute('href')))]);
  assert.equal(productLinks.length,products.length,'Published product links differ from CMS content');
  const routes=['index.html','produtos.html','quem-somos.html','contato.html','catalogos.html',...productLinks];
  for(const width of [360,390,414,768,1440]){
    await page.setViewportSize({width,height:900});
    for(const path of routes){
      const response=await page.goto(base+path,{waitUntil:'domcontentloaded'});
      assert.equal(response.status(),200,path);
      await page.locator('html[data-site-ready="true"]').waitFor();
      const state=await page.evaluate(()=>({
        viewport:document.documentElement.clientWidth,
        width:document.documentElement.scrollWidth,
        columns:document.querySelector('.product-detail')?getComputedStyle(document.querySelector('.product-detail')).gridTemplateColumns.split(' ').length:0,
        images:[...document.querySelectorAll('img')].map(img=>({src:img.getAttribute('src'),srcset:img.getAttribute('srcset')}))
      }));
      assert(state.width<=state.viewport+1,`${path} overflows at ${width}px: ${state.width}/${state.viewport}`);
      if(path.startsWith('produto.html')&&width<=680)assert.equal(state.columns,1,`${path} should stack on mobile`);
      for(const image of state.images){
        if(image.src)originalUrls.add(new URL(image.src,page.url()).href);
        for(const entry of (image.srcset||'').split(',').filter(Boolean))originalUrls.add(new URL(entry.trim().split(/\s+/)[0],page.url()).href);
      }
      if(path.startsWith('produto.html')){
        await page.locator('#mainProductImage').evaluate(img=>img.decode());
        if(await page.locator('.detail-thumb').count()>1){
          const next=page.locator('.detail-thumb').nth(1);
          const source=await next.getAttribute('data-img');
          await next.click();
          assert.equal(await page.locator('#mainProductImage').getAttribute('src'),source);
          await page.locator('#mainProductImage').evaluate(img=>img.decode());
        }
      }
      scenarios++;
    }
  }
  // Verify every media URL actually rendered, including lazy srcset candidates.
  for(const url of originalUrls){
    const response=await context.request.get(url);
    assert.equal(response.status(),200,`Missing rendered image: ${url}`);
  }
  const catalogs=JSON.parse(await readFile(resolve(root,'conteudo/catalogos.json'),'utf8')).filter(item=>item.ativo!==false);
  await page.goto(base+'produtos.html',{waitUntil:'domcontentloaded'});
  await page.locator('html[data-site-ready="true"]').waitFor();
  for(const catalog of catalogs){
    const path=catalog.arquivo.replace(/^\/+/, '');
    const href=await page.locator(`a[href="${path}"]`).first().getAttribute('href');
    const response=await context.request.get(new URL(href,page.url()).href);
    assert.equal(response.status(),200,`Missing catalog: ${path}`);
    assert((await response.body()).subarray(0,5).equals(Buffer.from('%PDF-')),`Invalid PDF: ${path}`);
  }
  await page.goto(base+'quem-somos.html',{waitUntil:'domcontentloaded'});
  await page.locator('html[data-site-ready="true"]').waitFor();
  if(await page.locator('[data-lightbox]').count()){
    await page.locator('[data-lightbox]').first().click();
    await page.locator('#lightbox.open img').evaluate(img=>img.decode());
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#lightbox.open').count(),0);
  }
  // Missing, malformed and stalled optimization must still render CMS content.
  const fallbackPath=products.length?`produto.html?id=${encodeURIComponent(products[0].id)}`:'index.html';
  const fallbackSelector=products.length?'#mainProductImage':'header img';
  const fallbackOriginal=(products[0]?.imagem||'assets/images/logo/logo-simbolo.png').replace(/^\/+/, '');
  for(const failure of ['missing','invalid','entry','timeout']){
    const fallback=await context.newPage();
    await fallback.route('**/assets/optimized/manifest.json',async route=>{
      if(failure==='timeout')return; // The frontend must abort the stalled request.
      return route.fulfill({status:failure==='missing'?404:200,contentType:'application/json',body:failure==='entry'?JSON.stringify({[fallbackOriginal]:{width:1,height:1,variants:null}}):'null'});
    });
    const started=Date.now();
    await fallback.goto(base+fallbackPath,{waitUntil:'domcontentloaded'});
    await fallback.locator('html[data-site-ready="true"]').waitFor({timeout:12000});
    assert(Date.now()-started<12000,'Manifest timeout prevented rendering');
    assert.equal(await fallback.locator(fallbackSelector).getAttribute('srcset'),null);
    await fallback.locator(fallbackSelector).evaluate(img=>img.decode());
    await fallback.close();
    scenarios++;
  }
  if(products.length){
    const broken=await context.newPage();
    await broken.route('**/assets/optimized/*.webp',route=>route.abort());
    await broken.goto(base+fallbackPath,{waitUntil:'domcontentloaded'});
    await broken.locator('html[data-site-ready="true"]').waitFor();
    await broken.waitForFunction(()=>{
      const img=document.querySelector('#mainProductImage');
      return img&&!img.hasAttribute('srcset')&&img.complete&&img.naturalWidth>0;
    });
    assert.equal(await broken.locator('#mainProductImage').getAttribute('src'),fallbackOriginal);
    await broken.close();
    scenarios++;
  }
  assert.deepEqual(errors,[],'Uncaught browser errors');
  console.log(`Site OK: ${scenarios} scenarios, ${originalUrls.size} rendered media URLs, ${catalogs.length} catalogs; mobile grid, thumbnails, lightbox and original fallback.`);
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
