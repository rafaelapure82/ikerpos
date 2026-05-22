<div align="center">
<img width="1902" height="913" alt="image" src="https://github.com/user-attachments/assets/ee98b591-a04a-4129-923a-c9f62ea82a1b" />

</div>

# 🚀 ERP IKER POSPyME - Guía de Instalación Local

Este repositorio contiene el sistema completo **IKER POSPyME**, un sistema de punto de venta (POS) y ERP potenciado por IA para pequeñas y medianas empresas. A continuación, se detalla el paso a paso para clonar, configurar y ejecutar el proyecto en tu entorno local.

---

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado en tu computadora:

*   **Node.js** (Versión 18 o superior recomendada). Puedes descargarlo desde [nodejs.org](https://nodejs.org/).
*   **Git** para control de versiones. Puedes descargarlo desde [git-scm.com](https://git-scm.com/).
*   **Docker & Docker Compose** *(Opcional, solo si deseas ejecutar la aplicación en contenedores)*.

---

## 🛠️ Paso 1: Clonar el Repositorio

Abre tu terminal (PowerShell, Bash o CMD) y ejecuta el siguiente comando para clonar el proyecto:

```bash
git clone https://github.com/rafaelapure82/ikerpos.git
cd ikerpos
```

---

## 📦 Paso 2: Instalar Dependencias

Instala todos los paquetes y dependencias de Node.js requeridas por el backend y el frontend:

```bash
npm install
```

---

## ⚙️ Paso 3: Configurar las Variables de Entorno

El sistema utiliza variables de entorno para conectarse con la base de datos y la API de Gemini (Inteligencia Artificial). 

1. En la raíz del proyecto, asegúrate de tener un archivo llamado `.env`. Si no existe, puedes crearlo duplicando el archivo `.env.example`:
   ```bash
   cp .env.example .env
   ```
2. Abre el archivo `.env` y configura tus variables:
   ```env
   # API Key de Gemini para funcionalidades de Inteligencia Artificial
   GEMINI_API_KEY="TU_GEMINI_API_KEY_AQUÍ"

   # URL Base de la aplicación
   APP_URL="http://localhost:3000"

   # URL de conexión para la base de datos SQLite
   DATABASE_URL="file:./dev.db"
   ```

---

## 🗄️ Paso 4: Inicializar la Base de Datos (Prisma)

El sistema utiliza **Prisma ORM** con una base de datos ligera **SQLite** (no requiere instalar un motor de base de datos externo).

Ejecuta el siguiente comando para crear las tablas necesarias en la base de datos y generar el cliente de Prisma:

```bash
npx prisma db push
```

> **Nota:** El sistema cuenta con un sistema de auto-seeding automático. Al iniciar la aplicación por primera vez, creará y cargará de forma automática las categorías iniciales necesarias en la base de datos.

---

## 🚀 Paso 5: Ejecutar la Aplicación

Tienes dos formas de ejecutar el sistema localmente:

### Opción A: Modo de Desarrollo (Recomendado para cambios locales)

Arranca el servidor en modo de desarrollo. Esto ejecutará tanto el backend (Express/TypeScript) como el frontend (React/Vite) de forma simultánea:

```bash
npm run dev
```

Una vez que veas en consola el mensaje:
`🚀 ERP IKER POSPyME backend listening on http://localhost:3000`

Abre tu navegador web e ingresa a: **`http://localhost:3000`**

---

### Opción B: Ejecución con Docker Compose (Contenedores)

Si prefieres ejecutar el sistema aislado en contenedores de Docker sin tener que instalar dependencias de Node localmente, utiliza Docker Compose:

1. Levanta los servicios (se compilará la imagen y se iniciará el contenedor):
   ```bash
   docker compose up -d --build
   ```
2. Para detener los servicios cuando termines:
   ```bash
   docker compose down
   ```

La aplicación estará disponible de igual forma en: **`http://localhost:3000`**

---

## 📂 Estructura Principal del Proyecto

*   `server.ts` - Servidor principal de Express (Backend API y servidor de WebSockets).
*   `server/db.ts` - Configuración de la conexión e inicialización del cliente Prisma.
*   `prisma/schema.prisma` - Definición de los modelos y esquemas de la base de datos.
*   `src/` - Código fuente de React para la interfaz de usuario (Frontend).
*   `src/components/` - Vistas y componentes interactivos del sistema (POS, Compras, Ventas, Reportes, Permisos, etc.).
