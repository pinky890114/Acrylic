import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { dbApi } from './server/db';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' })); // Increase limit for image uploads and large bulk imports
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  app.get('/api/items', (req, res) => {
    try {
      const items = dbApi.getAllItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch items' });
    }
  });

  app.get('/api/items/:id', (req, res) => {
    try {
      const item = dbApi.getItem(req.params.id);
      if (!item) {
        res.status(404).json({ error: 'Item not found' });
      } else {
        res.json(item);
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch item' });
    }
  });

  app.get('/api/items/:id/image', (req, res) => {
    try {
      const result: any = dbApi.getItemImage(req.params.id);
      if (!result || !result.imageUrl) {
        return res.status(404).send('Image not found');
      }
      
      const matches = result.imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).send('Invalid image data');
      }
      
      const type = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      
      res.writeHead(200, {
        'Content-Type': type,
        'Content-Length': buffer.length
      });
      res.end(buffer);
    } catch (error) {
      console.error('Failed to fetch item image:', error);
      res.status(500).send('Failed to fetch image');
    }
  });

  app.post('/api/items', (req, res) => {
    try {
      dbApi.addItem(req.body);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to add item' });
    }
  });

  app.post('/api/items/bulk', (req, res) => {
    try {
      console.log(`Received ${req.body.length} items for bulk insert`);
      dbApi.addItems(req.body);
      console.log('Bulk insert items success');
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to add items:', error);
      res.status(500).json({ error: 'Failed to add items' });
    }
  });

  app.delete('/api/items/:id', (req, res) => {
    try {
      dbApi.deleteItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete item' });
    }
  });

  app.get('/api/categories', (req, res) => {
    try {
      const categories = dbApi.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  app.post('/api/categories', (req, res) => {
    try {
      dbApi.addCategory(req.body);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to add category' });
    }
  });

  app.post('/api/categories/bulk', (req, res) => {
    try {
      console.log(`Received ${req.body.length} categories for bulk insert`);
      dbApi.addCategories(req.body);
      console.log('Bulk insert categories success');
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to add categories:', error);
      res.status(500).json({ error: 'Failed to add categories' });
    }
  });

  app.delete('/api/categories/:id', (req, res) => {
    try {
      dbApi.deleteCategory(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete category' });
    }
  });

  app.get('/api/recipes', (req, res) => {
    try {
      const recipes = dbApi.getAllRecipes();
      res.json(recipes);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch recipes' });
    }
  });

  app.get('/api/recipes/:id', (req, res) => {
    try {
      const recipe = dbApi.getRecipe(req.params.id);
      if (!recipe) {
        res.status(404).json({ error: 'Recipe not found' });
      } else {
        res.json(recipe);
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch recipe' });
    }
  });

  app.get('/api/recipes/:id/image', (req, res) => {
    try {
      const result: any = dbApi.getRecipeImage(req.params.id);
      if (!result || !result.imageUrl) {
        return res.status(404).send('Image not found');
      }
      
      const matches = result.imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).send('Invalid image data');
      }
      
      const type = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      
      res.writeHead(200, {
        'Content-Type': type,
        'Content-Length': buffer.length
      });
      res.end(buffer);
    } catch (error) {
      console.error('Failed to fetch recipe image:', error);
      res.status(500).send('Failed to fetch image');
    }
  });

  app.post('/api/recipes', (req, res) => {
    try {
      dbApi.addRecipe(req.body);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to add recipe' });
    }
  });

  app.post('/api/recipes/bulk', (req, res) => {
    try {
      console.log(`Received ${req.body.length} recipes for bulk insert`);
      dbApi.addRecipes(req.body);
      console.log('Bulk insert recipes success');
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to add recipes:', error);
      res.status(500).json({ error: 'Failed to add recipes' });
    }
  });

  app.delete('/api/recipes/:id', (req, res) => {
    try {
      dbApi.deleteRecipe(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete recipe' });
    }
  });

  app.get('/api/export', (req, res) => {
    try {
      const items = dbApi.getAllItemsFull();
      const categories = dbApi.getAllCategories();
      const recipes = dbApi.getAllRecipesFull();
      
      const exportData = {
        items,
        categories,
        recipes,
        exportDate: new Date().toISOString(),
        version: 1
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=sequin-backup-${new Date().toISOString().split('T')[0]}.json`);
      res.json(exportData);
    } catch (error) {
      console.error('Export failed:', error);
      res.status(500).json({ error: 'Failed to export data' });
    }
  });

  // Vite middleware for development
  console.log('NODE_ENV:', process.env.NODE_ENV);
  
  // Health check endpoint to verify server status and mode
  app.get('/health-check', (req, res) => {
    res.json({ 
      status: 'ok', 
      mode: process.env.NODE_ENV,
      cwd: process.cwd(),
      distExists: fs.existsSync(path.resolve('dist')),
      indexExists: fs.existsSync(path.resolve('index.html'))
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting in development mode with Vite middleware');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Fallback for SPA in dev mode - explicitly serve index.html for HTML requests
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      // Only handle GET requests that accept HTML
      if (req.method !== 'GET') return next();
      
      try {
        let template = fs.readFileSync(path.resolve('index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    console.log('Starting in production mode');
    // Serve static files in production
    app.use(express.static('dist'));
    
    // Handle SPA routing - return index.html for all non-API routes
    app.get('*', (req, res) => {
      const indexHtml = path.resolve('dist', 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Production build not found. Please run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
