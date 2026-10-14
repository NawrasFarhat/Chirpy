import express, { Request, Response, NextFunction } from "express";
import { config } from "./config.js";
import { BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError } from "./errors.js";
import "./db/migrate.js";
import { createUser,deleteAllUsers,getUserByEmail,updateUser,upgradeUserToChirpyRed } from "./db/queries/users.js";
import { createChirp,getChirps,getChirp,deleteChirp, } from "./db/queries/chirps.js";
import { hashPassword, checkPasswordHash,makeJWT,getBearerToken,validateJWT,makeRefreshToken,getAPIKey, } from "./auth.js";
import { users } from "./db/schema.js";
import {createRefreshToken,getUserFromRefreshToken,revokeRefreshToken,} from "./db/queries/refreshTokens.js";


const app = express();
app.use(express.json());
const PORT = config.api.port;


function middlewareLogResponses(req: Request,res: Response,next: NextFunction) {
    res.on("finish", () => {
        if (res.statusCode !== 200) {

            console.log(
  `[NON-OK] ${req.method} ${req.url} - Status: ${res.statusCode}`
);
}
    });
    next();
}
app.use(middlewareLogResponses);
function handlerReadiness(req: Request, res: Response) {
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send("OK");
}

app.get("/api/healthz", handlerReadiness);

app.get("/test", (req, res) => {
  res.send("GET works");
});

app.use("/app", middlewareMetricsInc, express.static("./src/app"));


function middlewareMetricsInc(req: Request,res: Response,next: NextFunction) {

 config.api.fileserverHits++;
  next();
}

function handlerMetrics(req: Request, res: Response) {
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`
<html>
  <body>
    <h1>Welcome, Chirpy Admin</h1>
    <p>Chirpy has been visited ${config.api.fileserverHits} times!</p>
  </body>
</html>
`);
}

app.get("/admin/metrics", handlerMetrics);

async function handlerReset(req: Request, res: Response) {
  if (config.api.platform !== "dev") {
    throw new ForbiddenError("Reset is only allowed in dev environment");
  }

  await deleteAllUsers();

  config.api.fileserverHits = 0;
  res.send("Hits reset to 0");
}

app.post("/admin/reset", handlerReset);


function errorHandler(err: Error,req: Request,res: Response,next: NextFunction,)
{
  if (err instanceof BadRequestError) {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err instanceof UnauthorizedError) {
    res.status(401).json({ error: err.message });
    return;
  }

  if (err instanceof ForbiddenError) {
    res.status(403).json({ error: err.message });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }

  console.log(err);

  res.status(500).json({
    error: "Something went wrong on our end",
  });
}



async function handlerCreateUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      throw new BadRequestError("Email and password are required");
    }

    const hashedPassword = await hashPassword(password);
    const user = await createUser({ email, hashedPassword });

    if (!user) {
      throw new BadRequestError("Email already exists");
    }

    const { hashedPassword: _, ...userResponse } = user;

    res.status(201).json(userResponse);
  } catch (err) {
    next(err);
  }
}

app.post("/api/users", handlerCreateUser);




async function handlerCreateChirp(
  req: Request,
  res: Response,
  next: NextFunction,
) {
      let userId: string;

    try {
      const token = getBearerToken(req);
      userId = validateJWT(token, config.auth.jwtSecret);
    } catch {
      throw new UnauthorizedError("Invalid or missing token");
    }

    const { body } = req.body;
  try {
    const token = getBearerToken(req);
    const userId = validateJWT(token, config.auth.jwtSecret);
    const { body } = req.body;

    if (typeof body !== "string") {
      throw new BadRequestError("Invalid request body");
    }

    if (body.length > 140) {
      throw new BadRequestError("Chirp is too long. Max length is 140");
    }

    const profaneWords = ["kerfuffle", "sharbert", "fornax"];

    const cleanedBody = body
      .split(" ")
      .map((word) =>
        profaneWords.includes(word.toLowerCase()) ? "****" : word,
      )
      .join(" ");

    const chirp = await createChirp({
      body: cleanedBody,
      userId,
    });

    res.status(201).json(chirp);
  } catch (err) {
    next(err);
  }
}

app.post("/api/chirps", handlerCreateChirp);

app.get("/api/chirps", async (req, res, next) => {
  try {
    const sort = req.query.sort === "desc" ? "desc" : "asc";

    const chirps = await getChirps();

    chirps.sort((a, b) => {
      const difference =
        a.createdAt.getTime() - b.createdAt.getTime();

      return sort === "desc" ? -difference : difference;
    });

    res.status(200).json(chirps);
  } catch (err) {
    next(err);
  }
});

app.get("/api/chirps/:chirpId", async (req, res, next) => {
  try {
    const chirp = await getChirp(req.params.chirpId);

    if (!chirp) {
      throw new NotFoundError("Chirp not found");
    }

    res.status(200).json(chirp);
  } catch (err) {
    next(err);
  }
});

async function handlerLogin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      throw new UnauthorizedError("incorrect email or password");
    }

    const user = await getUserByEmail(email);

    if (
      !user ||
      !(await checkPasswordHash(password, user.hashedPassword))
    ) {
      throw new UnauthorizedError("incorrect email or password");
    }

    const token = makeJWT(
      user.id,
      3600,
      config.auth.jwtSecret,

    );

    const refreshToken = makeRefreshToken();

    const expiresAt = new Date(
      Date.now() + 60 * 24 * 60 * 60 * 1000,
    );

    await createRefreshToken(refreshToken, user.id, expiresAt);

    const { hashedPassword: _, ...userResponse } = user;

    res.status(200).json({
      ...userResponse,
      token,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
}

app.post("/api/login", handlerLogin);

async function handlerRefresh(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = getBearerToken(req);
    const result = await getUserFromRefreshToken(token);

    if (
      !result ||
      result.refreshToken.revokedAt !== null ||
      result.refreshToken.expiresAt <= new Date()
    ) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const accessToken = makeJWT(
      result.user.id,
      3600,
      config.auth.jwtSecret,
      
    );

    res.status(200).json({ token: accessToken });
  } catch (err) {
    next(err);
  }
}
app.post("/api/refresh", handlerRefresh);

app.post("/api/revoke", async (req, res, next) => {
  try {
    const token = getBearerToken(req);

    if (token) {
      await revokeRefreshToken(token);
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});


async function handlerUpdateUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    let userId: string;

    try {
      const token = getBearerToken(req);
      userId = validateJWT(token, config.auth.jwtSecret);
    } catch {
      throw new UnauthorizedError("Invalid or missing token");
    }

    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      throw new BadRequestError("Email and password are required");
    }

    const hashedPassword = await hashPassword(password);
    const user = await updateUser(userId, email, hashedPassword);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const { hashedPassword: _, ...userResponse } = user;

    res.status(200).json(userResponse);
  } catch (err) {
    next(err);
  }
}

app.put("/api/users", handlerUpdateUser);


async function handlerDeleteChirp(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    let userId: string;

    try {
      const token = getBearerToken(req);
      userId = validateJWT(token, config.auth.jwtSecret);
    } catch {
      throw new UnauthorizedError("Invalid or missing token");
    }

  const chirpId = req.params.chirpId;

if (typeof chirpId !== "string") {
  throw new BadRequestError("Invalid chirp ID");
}

const chirp = await getChirp(chirpId);

    if (!chirp) {
      throw new NotFoundError("Chirp not found");
    }

    if (chirp.userId !== userId) {
      throw new ForbiddenError("You are not the author of this chirp");
    }

    await deleteChirp(chirp.id);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

app.delete("/api/chirps/:chirpId", handlerDeleteChirp);

app.post("/api/polka/webhooks", async (req, res, next) => {
  const apiKey = getAPIKey(req);
if (apiKey !== config.api.polkaKey) {
  res.status(401).send();
  return;
}
  try {
    const apiKey = getAPIKey(req);

    if (apiKey !== config.api.polkaKey) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { event, data } = req.body;

    if (event !== "user.upgraded") {
      res.status(204).end();
      return;
    }

    const userId = data?.userId;

    if (typeof userId !== "string") {
      res.status(404).end();
      return;
    }

    const user = await upgradeUserToChirpyRed(userId);

    if (!user) {
      res.status(404).end();
      return;
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});