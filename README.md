# AuthDemo + frontend Angular

Proyecto full stack: API **ASP.NET Core 8** (`AuthDemo`) con autenticación JWT y front **Angular** (`frontend_users`).

## Requisitos

| Componente | Versión / notas |
|------------|------------------|
| [.NET SDK](https://dotnet.microsoft.com/download) | 8.0 |
| [Node.js](https://nodejs.org/) | LTS recomendada (el proyecto declara npm 11.x) |
| SQL Server | Local; por defecto se usa la instancia `localhost\SQLEXPRESS` |

## 1. Base de datos (SQL Server)

La cadena de conexión está en `AuthDemo/appsettings.json`:

```json
"DefaultConnection": "Server=localhost\\SQLEXPRESS;Database=AuthDemoDB;Trusted_Connection=True;TrustServerCertificate=True;"
```

- Si tu instancia no es `SQLEXPRESS`, edita `Server=` (por ejemplo `Server=localhost` o `Server=.\\MSSQLSERVER`).
- Asegúrate de que SQL Server esté en ejecución y que tu usuario de Windows tenga permiso para crear la base de datos.

### Aplicar migraciones (crear tablas)

Desde la raíz del repositorio:

```powershell
cd AuthDemo
dotnet ef database update
```

Si no tienes la herramienta EF:

```powershell
dotnet tool install --global dotnet-ef
```

(Cierra y vuelve a abrir la terminal si `dotnet ef` no se reconoce.)

## 2. API (backend)

En la raíz del repo o dentro de `AuthDemo`:

```powershell
cd d:\CURSOS\examen\pueba_net\AuthDemo
dotnet run
```

- Por defecto el perfil **http** expone la API en **http://localhost:5235**.
- Swagger en desarrollo: **http://localhost:5235/swagger**.

El front está configurado para llamar a `http://localhost:5235/api/auth` (ver `frontend_users/src/app/services/auth.service.ts`). CORS permite el origen **http://localhost:4200** (Angular en modo desarrollo).

## 3. Front (Angular)

En otra terminal:

```powershell
cd d:\CURSOS\examen\pueba_net\frontend_users
npm install
npm start
```

La app suele abrirse en **http://localhost:4200**. Deja la API corriendo en el puerto **5235** antes de iniciar sesión o registrar usuarios.

## Orden recomendado

1. SQL Server encendido y cadena de conexión correcta.  
2. `dotnet ef database update` en `AuthDemo`.  
3. `dotnet run` en `AuthDemo`.  
4. `npm install` y `npm start` en `frontend_users`.

## Solución de problemas

- **Error de conexión a SQL Server**: revisa el nombre de instancia en `appsettings.json` y que TCP no esté bloqueado si usas otro equipo.
- **CORS en el navegador**: el front debe servirse desde `http://localhost:4200`; si cambias el puerto de Angular, actualiza `WithOrigins` en `AuthDemo/Program.cs`.
- **404 en `/api/auth/...`**: confirma que la API está en marcha y en el mismo host/puerto que usa `auth.service.ts`.

## Estructura del repositorio

- `AuthDemo/` — proyecto Web API .NET 8.  
- `frontend_users/` — aplicación Angular (PrimeNG).  
- `pueba_net.sln` — solución Visual Studio que incluye `AuthDemo`.
