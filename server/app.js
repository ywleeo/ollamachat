import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const app = express();

app.use(express.json());
app.use(express.static(path.join(rootDir, 'public')));
app.use('/src', express.static(path.join(rootDir, 'src')));
app.use('/api', routes);

export default app;
