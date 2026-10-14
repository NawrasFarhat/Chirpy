# Chirpy

Chirpy is a REST API built with TypeScript, Node.js, Express, and PostgreSQL. It allows users to create accounts, publish chirps, retrieve chirps, and log in securely using password hashing.

## Features

- Create users with email and password.
- Hash passwords securely using Argon2.
- Log in and verify passwords.
- Create chirps with a maximum length of 140 characters.
- Filter inappropriate words in chirps.
- Retrieve all chirps in chronological order.
- Retrieve a single chirp by its ID.
- Store and manage data in PostgreSQL using Drizzle ORM.
- Run database migrations.
- Provide health checks and admin endpoints.

## Technologies

- TypeScript
- Node.js
- Express
- PostgreSQL
- Drizzle ORM
- Argon2

## Prerequisites

- Node.js
- npm
- PostgreSQL

## Installation

Clone the repository and navigate to the project directory:

```bash
git clone https://github.com/NawrasFarhat/Chirpy.git
cd chirpy
```

Install dependencies:

```bash
npm install
```

Create a `.env` file with the required configuration:

```dotenv
PORT=8080
DB_URL="postgres://postgres:postgres@localhost:5432/chirpy?sslmode=disable"
PLATFORM=dev
```

Make sure PostgreSQL is running and the database exists. Update the database connection string if your local configuration is different.

## Running the Project

Build the TypeScript code:

```bash
npm run build
```

Start the server:

```bash
npm start
```

The API will run at:

`http://localhost:8080`

## Example Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/healthz` | Check server health |
| POST | `/api/users` | Create a user |
| POST | `/api/login` | Log in |
| POST | `/api/chirps` | Create a chirp |
| GET | `/api/chirps` | Retrieve all chirps |
| GET | `/api/chirps/:chirpId` | Retrieve a chirp by ID |

## Security

Passwords are hashed using Argon2 instead of being stored in plain text. In production, the API should be served over HTTPS.

## License

No license has been specified yet.