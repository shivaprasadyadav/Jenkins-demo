const express = require('express');
const os = require('os');
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get('/health/live',  (req, res) => res.json({ status: 'alive' }));
app.get('/health/ready', (req, res) => res.json({ status: 'ready' }));

app.get('/api/info', (req, res) => {
  res.json({
    message: 'Hello from the Backend API!',
    pod: os.hostname(),
    environment: process.env.APP_ENV || 'development',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

let tasks = [
  { id: 1, title: 'Set up Kubernetes cluster',   done: true  },
  { id: 2, title: 'Deploy microservices',         done: true  },
  { id: 3, title: 'Configure HPA autoscaling',    done: false },
  { id: 4, title: 'Set up Prometheus monitoring', done: false },
];

app.get('/api/tasks', (req, res) => res.json(tasks));

app.post('/api/tasks', (req, res) => {
  const task = { id: Date.now(), title: req.body.title, done: false };
  tasks.push(task);
  res.status(201).json(task);
});

app.patch('/api/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === Number(req.params.id));
  if (!task) return res.status(404).json({ error: 'Not found' });
  task.done = !task.done;
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  tasks = tasks.filter(t => t.id !== Number(req.params.id));
  res.status(204).end();
});

let requestCount = 0;
app.use(() => requestCount++);

app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send([
    '# HELP http_requests_total Total HTTP requests',
    '# TYPE http_requests_total counter',
    `http_requests_total{job="backend-api",pod="${os.hostname()}"} ${requestCount}`,
    '# HELP node_info Node information',
    '# TYPE node_info gauge',
    `node_info{hostname="${os.hostname()}",env="${process.env.APP_ENV || 'dev'}"} 1`,
  ].join('\n'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Backend API running on port ${PORT}`));
