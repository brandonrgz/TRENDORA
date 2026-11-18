# TRENDORA PRO — tienda propia con gestión manual de proveedores

MVP de tienda online para México. El comprador navega, agrega al carrito, captura sus datos y paga en Mercado Pago Checkout Pro. El equipo TRENDORA recibe el pedido en el panel privado, compra manualmente al proveedor y registra la guía.

## Incluye
- Tienda pública con catálogo, búsqueda, categorías y carrito.
- Checkout de datos de entrega.
- Creación de pedido en Supabase y redirección a Mercado Pago.
- Webhook que verifica la firma y consulta el pago en la API de Mercado Pago antes de marcarlo.
- Panel privado: pedidos, estado de preparación, número de guía y alta/ocultamiento de productos.
- Campo de referencia del proveedor visible solo para administración.
- SQL con Row Level Security (RLS).

## Arquitectura y publicación
GitHub Pages aloja los archivos estáticos. Supabase aloja PostgreSQL, Auth y Edge Functions. Mercado Pago procesa el pago. **No pongas tokens privados en `config.js` ni en GitHub.**

### 1) Crear Supabase
1. Crea un proyecto en https://supabase.com/.
2. Abre SQL Editor y ejecuta `supabase/schema.sql`.
3. En Project Settings / API copia Project URL y publishable (o anon) key a `config.js`.
4. En Authentication / Users crea el usuario que será administrador (correo y contraseña).
5. Ejecuta en SQL Editor, sustituyendo el UUID:
   `insert into public.profiles (id, role) values ('UUID_DEL_USUARIO', 'admin') on conflict (id) do update set role='admin';`
6. Verifica que RLS esté habilitado. La tabla `products` no debe permitir lectura anónima directa; la tienda usa la vista `store_products`.

### 2) Ajuste importante de lectura pública
Para que el catálogo lea la vista `store_products`, la tienda consulta la vista `store_products`, que solo expone los campos comerciales públicos. No concedas SELECT anónimo directo sobre la tabla `products`, porque contiene la referencia privada del proveedor.

### 3) Desplegar Edge Functions
Instala Supabase CLI y vincula el proyecto:
- `supabase login`
- `supabase link --project-ref TU_PROJECT_REF`
- `supabase functions deploy create-checkout`
- `supabase functions deploy mercadopago-webhook --no-verify-jwt`

Configura secrets en el proyecto:
- `supabase secrets set MP_ACCESS_TOKEN=TU_ACCESS_TOKEN`
- `supabase secrets set MP_WEBHOOK_SECRET=TU_WEBHOOK_SECRET`
- `supabase secrets set APP_URL=https://TU_USUARIO.github.io/TU_REPOSITORIO`
- `supabase secrets set APP_ORIGIN=https://TU_USUARIO.github.io`

El webhook usa la firma `x-signature` de Mercado Pago. Configura en Tus integraciones → Webhooks el endpoint:
`https://TU_PROJECT_REF.supabase.co/functions/v1/mercadopago-webhook`
Activa el evento **Pagos** para Checkout Pro clásico y copia el secreto de firma como `MP_WEBHOOK_SECRET`. Revisa la documentación oficial antes de producción.

### 4) Configurar Mercado Pago
1. Crea una aplicación en https://www.mercadopago.com.mx/developers/.
2. Usa credenciales de prueba primero.
3. Configura Checkout Pro y webhook.
4. Agrega Access Token y webhook secret como secrets de Supabase, nunca al repositorio.
5. Realiza pagos de prueba y verifica que el pedido cambie a `approved` solo después del webhook.

### 5) Publicar en GitHub Pages
Sube el contenido del proyecto al repositorio. Settings → Pages → Deploy from a branch → `main` → `/ (root)`.

## Operación manual diaria
1. Solo los pedidos con pago `approved` se deben preparar.
2. En el panel, abre el pedido y usa la información de envío.
3. Compra al proveedor desde tu cuenta comercial, solicitando envío directo al comprador y evitando materiales promocionales del proveedor cuando sea posible.
4. Cuando tengas guía, captura el número y cambia estado a `shipped`.
5. Cambia a `delivered` al confirmar la entrega.

## Límites y tareas necesarias antes de cobrar dinero real
- Este repositorio es una base MVP; no se considera certificación de seguridad ni auditoría legal.
- Agregar correo transaccional real, consulta de pedidos por cliente, política de reembolso/devoluciones y proceso de atención.
- Añadir reserva/liberación de inventario para evitar sobreventa por compras simultáneas.
- Manejar reembolsos, contracargos, pagos duplicados y conciliación contable.
- Definir envío, impuestos, tiempos de entrega, garantías y devoluciones con claridad.
- Revisa los términos de Amazon/AliExpress, restricciones de reventa, dropshipping, uso de imágenes, marcas y empaques. No asumas que una compra minorista permite reventa o envío neutral.
- El checkout de este MVP redirige a Mercado Pago (Checkout Pro) para finalizar el pago; la tienda recibe el resultado por webhook.
- La dirección del comprador se guarda en Supabase. Configura controles de acceso, retención y aviso de privacidad adecuados.
