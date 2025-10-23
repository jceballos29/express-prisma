import express, { Application } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import apiRouter from './routes/api';
import { config } from './config';

const app: Application = express();

app.use(cors());
app.use(helmet());

app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use('/api', apiRouter);

app.get('/', (req, res) => res.json({ ok: true, message: 'Researcher Staff Platform API' }));

export default app;
