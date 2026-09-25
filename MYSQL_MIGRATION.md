# Guía de Migración a MySQL y Visual Studio

Si deseas llevar este proyecto a un entorno local con **MySQL**, aquí tienes la estructura necesaria.

## 1. Esquema de Base de Datos (SQL)

Ejecuta este script en tu servidor MySQL:

```sql
CREATE DATABASE consejo_comunal;
USE consejo_comunal;

-- Usuarios y Perfiles
CREATE TABLE users (
    uid VARCHAR(128) PRIMARY KEY,
    firstName VARCHAR(100),
    firstSurname VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    role ENUM('vecino', 'jefe_calle', 'admin') DEFAULT 'vecino',
    street VARCHAR(100),
    phone VARCHAR(20),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Censo (Viviendas)
CREATE TABLE households (
    id VARCHAR(100) PRIMARY KEY,
    houseNumber VARCHAR(20),
    street VARCHAR(100),
    sector VARCHAR(100),
    gasStatus VARCHAR(50),
    clapStatus VARCHAR(50),
    waterStatus VARCHAR(50),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Integrantes de Familia
CREATE TABLE household_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    householdId VARCHAR(100),
    name VARCHAR(200),
    cedula VARCHAR(20),
    age INT,
    gender VARCHAR(20),
    isHead BOOLEAN,
    tags JSON, -- Almacena vulnerabilidades como ['embarazada', 'encamado']
    FOREIGN KEY (householdId) REFERENCES households(id) ON DELETE CASCADE
);

-- Eventos y Jornadas
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200),
    description TEXT,
    eventDate DATE,
    eventTime TIME,
    location VARCHAR(200),
    type VARCHAR(50),
    capacity INT,
    isUnlimited BOOLEAN,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reportes
CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId VARCHAR(128),
    category VARCHAR(50),
    content TEXT,
    adminNotes TEXT,
    status VARCHAR(20) DEFAULT 'open',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(uid)
);
```

## 2. Recomendaciones para el Backend en Visual Studio

### Stack Sugerido:
1.  **Node.js + Express**: Para crear la API REST.
2.  **Sequelize o Prisma**: Como ORM para interactuar con MySQL fácilmente.
3.  **JWT (JSON Web Tokens)**: Para reemplazar Firebase Auth.

### Pasos sugeridos:
1.  **Configurar .env**: Crea un archivo con `DB_HOST`, `DB_USER`, `DB_PASS`.
2.  **API Endpoints**: Deberás crear rutas como `POST /api/census` para guardar los datos que antes iban a Firestore.
3.  **Frontend**: En el archivo `src/lib/firebase.ts`, deberás crear un cliente de API (usando `axios` o `fetch`) que apunte a tu nuevo servidor local.

> Nota: MySQL no es tiempo real de forma nativa como Firebase. Para el Chat, se recomienda integrar **Socket.io** en tu servidor Express para mantener la funcionalidad de mensajes instantáneos.
