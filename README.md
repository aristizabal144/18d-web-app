# 18D JOYEROS

This project is a web application for 18D Joyeros, built with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
pnpm install
```

### Compile and Hot-Reload for Development

```sh
pnpm dev
```

### Type-Check, Compile and Minify for Production

```sh
pnpm build
```

## Instalación para un nuevo negocio

El sistema se instala **una vez por negocio**: cada cliente tiene su propio proyecto de Supabase y su propio despliegue. La identidad del negocio (nombre, logo, colores, textos de documentos, moneda) se configura desde la propia aplicación, sin tocar código.

1. **Crear el proyecto en Supabase** ([supabase.com](https://supabase.com)) y, en *Authentication → Providers → Email*, desactivar el registro público (*Allow new users to sign up*). Las cuentas solo las crea un administrador.
2. **Ejecutar las migraciones en orden** (carpeta `18d-joyeros-supabase/supabase/migrations/`, del archivo `20260517000001_…` al más reciente) desde el *SQL Editor* de Supabase, o con `supabase db push` si se usa la CLI. La migración `…_create_configuracion_negocio.sql` crea la fila de configuración y el bucket público `branding` para los logos.
3. **Crear el usuario administrador.** En *Authentication → Users → Add user* crear el usuario con correo y contraseña (marcar *Auto confirm*). El trigger `handle_new_user` le crea el perfil con rol `cliente`; para convertirlo en administrador ejecutar en el SQL Editor:

   ```sql
   UPDATE public.profiles
   SET rol_id = (SELECT id FROM public.roles WHERE nombre = 'admin')
   WHERE email = 'admin@minegocio.com';
   ```

   Alternativa: crearlo con la Admin API (`supabase.auth.admin.createUser`) enviando `user_metadata: { nombre, apellido, rol: 'admin' }`; el trigger asigna el rol indicado.
4. **Configurar las variables de entorno** (ver `.env.example`):
   - `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`: *Project Settings → API*.
   - `VITE_SUPABASE_SERVICE_ROLE_KEY`: la usa hoy la pantalla de Clientes para crear cuentas. ⚠️ Queda expuesta en el navegador; úsala solo en despliegues de confianza mientras la creación de usuarios no se mueva a una Edge Function.
5. **Compilar y desplegar**: `pnpm install && pnpm build` y publicar la carpeta `dist/` (o usar `prod.Dockerfile` / `docker-compose.prod.yml`).
6. **Iniciar sesión como administrador y abrir Sistema → Configuración** para cargar los datos del negocio, el logo (principal y para fondos oscuros), el color de marca, los textos de facturas y el formato regional (moneda, idioma y decimales). Solo el rol `admin` ve esta página y puede guardar cambios.
