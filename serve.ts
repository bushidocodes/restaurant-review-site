import express, { type Request, type Response } from "express";
import morgan from "morgan";
import path from "path";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Rate limit all requests to mitigate DoS against file-system operations
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Setup Gzip compression of response bodies
app.use(compression());

// Setup logger
app.use(
  morgan(
    ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] :response-time ms'
  )
);

// Use the `root` option rather than passing an absolute path: Express 5's
// `send` rejects Windows backslash absolute paths (from `path.resolve`) with a
// spurious 404. The `root` form is normalized cross-platform.
app.get("/restaurant.html", (_req: Request, res: Response) =>
  res.sendFile("restaurant.html", { root: path.resolve(__dirname, "dist") })
);
// Serve static assets, and do not automatically direct to the index
app.use(express.static(path.resolve(__dirname, "dist")));

app.get("/healthcheck", (_req: Request, res: Response) => res.sendStatus(200));

const PORT = process.env.PORT || 7000;

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}!`);
});
