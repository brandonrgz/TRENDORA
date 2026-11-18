(() => {
  const cfg=window.TRENDORA_CONFIG||{};
  const ready=cfg.SUPABASE_URL?.startsWith("https://")&&!cfg.SUPABASE_URL.includes("TU-PROYECTO")&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_ANON_KEY.includes("TU_SUPABASE");
  const sb=ready?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
  let products=[],cart=[],category="Todos";
  const $=id=>document.getElementById(id), money=n=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(n);
  function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2800)}
  async function loadProducts(){
    if(!sb){$("products").innerHTML='<div class="empty-state">Configura Supabase en <b>config.js</b> y ejecuta <b>schema.sql</b> para cargar el catálogo.</div>';return}
    const {data,error}=await sb.from("store_products").select("id,name,description,category,price,image_url,stock").eq("active",true).gt("stock",0).order("created_at",{ascending:false});
    if(error){$("products").innerHTML='<p class="muted">No fue posible cargar el catálogo. Revisa la configuración de Supabase.</p>';return}
    products=data||[];renderProducts();
  }
  function renderProducts(){
    const q=$("search").value.toLowerCase();
    const list=products.filter(p=>(category==="Todos"||p.category===category)&&(`${p.name} ${p.description||""} ${p.category}`.toLowerCase().includes(q)));
    $("products").innerHTML=list.length?list.map(p=>`<article class="product"><img loading="lazy" src="${escapeHtml(p.image_url||"https://placehold.co/600x450/f3f4f6/667085?text=TRENDORA")}" alt="${escapeHtml(p.name)}"><div class="product-body"><span class="product-cat">${escapeHtml(p.category)}</span><h3>${escapeHtml(p.name)}</h3><span class="product-price">${money(p.price)}</span><span class="product-stock">${p.stock} disponibles</span><button class="btn" data-add="${p.id}">Agregar a mi bolsa +</button></div></article>`).join(""):'<p class="muted">No hay productos disponibles en esta categoría.</p>';
    document.querySelectorAll("[data-add]").forEach(b=>b.addEventListener("click",()=>add(b.dataset.add)));
  }
  function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function add(id){const p=products.find(x=>x.id===id);if(!p)return;const found=cart.find(x=>x.id===id);if(found){if(found.qty>=p.stock)return toast("No hay más unidades disponibles.");found.qty++}else cart.push({...p,qty:1});renderCart();toast("Producto agregado a tu bolsa.")}
  function renderCart(){
    $("cartCount").textContent=cart.reduce((a,p)=>a+p.qty,0);
    $("cartItems").innerHTML=cart.length?cart.map(p=>`<div class="cart-line"><img src="${escapeHtml(p.image_url||"")}" alt=""><div><b>${escapeHtml(p.name)}</b><small>${money(p.price)} c/u</small><div class="qty"><button data-dec="${p.id}">−</button><span>${p.qty}</span><button data-inc="${p.id}">+</button></div></div></div>`).join(""):'<p class="muted">Tu bolsa está vacía.</p>';
    $("subtotal").textContent=money(cart.reduce((a,p)=>a+p.price*p.qty,0));
    document.querySelectorAll("[data-dec]").forEach(b=>b.onclick=()=>changeQty(b.dataset.dec,-1));document.querySelectorAll("[data-inc]").forEach(b=>b.onclick=()=>changeQty(b.dataset.inc,1));
  }
  function changeQty(id,delta){const p=cart.find(x=>x.id===id);if(!p)return;const stock=products.find(x=>x.id===id)?.stock||0;p.qty+=delta;if(p.qty<1)cart=cart.filter(x=>x.id!==id);else if(p.qty>stock)p.qty=stock;renderCart()}
  function drawer(show){$("cartDrawer").classList.toggle("show",show);$("scrim").classList.toggle("show",show)}
  function checkout(show){$("checkoutModal").classList.toggle("show",show)}
  async function startPayment(form){
    if(!sb)return toast("La tienda aún no está configurada.");
    if(!cart.length)return toast("Agrega al menos un producto.");
    const button=$("payButton");button.disabled=true;button.textContent="Preparando pago…";
    const fd=new FormData(form);const customer=Object.fromEntries(fd.entries());delete customer.terms;
    const payload={customer,items:cart.map(p=>({product_id:p.id,quantity:p.qty}))};
    const {data,error}=await sb.functions.invoke("create-checkout",{body:payload});
    button.disabled=false;button.textContent="Continuar a Mercado Pago →";
    if(error||!data?.checkout_url){console.error(error,data);toast(data?.error||"No se pudo iniciar el pago. Intenta de nuevo.");return}
    localStorage.setItem("trendora_last_order",data.order_id);
    window.location.assign(data.checkout_url);
  }
  document.querySelectorAll(".filter").forEach(b=>b.onclick=()=>{document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");category=b.dataset.cat;renderProducts()});
  $("search").addEventListener("input",renderProducts);
  $("openCart").onclick=()=>drawer(true);$("closeCart").onclick=()=>drawer(false);$("scrim").onclick=()=>drawer(false);
  $("goCheckout").onclick=()=>{if(!cart.length)return toast("Tu bolsa está vacía.");drawer(false);checkout(true)};
  $("closeCheckout").onclick=()=>checkout(false);$("checkoutModal").addEventListener("click",e=>{if(e.target===$("checkoutModal"))checkout(false)});
  $("checkoutForm").addEventListener("submit",e=>{e.preventDefault();startPayment(e.currentTarget)});
  $("year").textContent=new Date().getFullYear();renderCart();loadProducts();
})();