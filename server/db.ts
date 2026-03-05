import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'sequin.db');
const db = new Database(dbPath);

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    imageUrl TEXT,
    quantity REAL NOT NULL,
    unit TEXT,
    price REAL,
    status TEXT,
    color TEXT,
    notes TEXT,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    items TEXT NOT NULL, -- JSON string of RecipeItem[]
    imageUrl TEXT,
    notes TEXT,
    createdAt INTEGER NOT NULL
  );
`);

// Seed default categories if empty
const categoryCount = db.prepare('SELECT count(*) as count FROM categories').get() as { count: number };
if (categoryCount.count === 0) {
  const insertCategory = db.prepare('INSERT INTO categories (id, name, color) VALUES (?, ?, ?)');
  insertCategory.run('default-1', '星星 (Stars)', '#facc15');
  insertCategory.run('default-2', '愛心 (Hearts)', '#f472b6');
  insertCategory.run('default-3', '圓形 (Circles)', '#2dd4bf');
  insertCategory.run('default-4', '特殊形狀 (Special)', '#a78bfa');
}

export const dbApi = {
  getAllItems: () => {
    return db.prepare(`
      SELECT 
        id, name, category, quantity, unit, price, status, color, notes, createdAt,
        CASE WHEN imageUrl IS NOT NULL AND imageUrl != '' THEN 1 ELSE 0 END as hasImage
      FROM items
    `).all();
  },

  getAllItemsFull: () => {
    return db.prepare('SELECT * FROM items').all();
  },
  
  getItem: (id: string) => {
    return db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  },

  getItemImage: (id: string) => {
    return db.prepare('SELECT imageUrl FROM items WHERE id = ?').get(id);
  },
  
  addItem: (item: any) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO items (id, name, category, imageUrl, quantity, unit, price, status, color, notes, createdAt)
      VALUES (@id, @name, @category, @imageUrl, @quantity, @unit, @price, @status, @color, @notes, @createdAt)
    `);
    return stmt.run(item);
  },

  addItems: (items: any[]) => {
    const insert = db.prepare(`
      INSERT OR REPLACE INTO items (id, name, category, imageUrl, quantity, unit, price, status, color, notes, createdAt)
      VALUES (@id, @name, @category, @imageUrl, @quantity, @unit, @price, @status, @color, @notes, @createdAt)
    `);
    const insertMany = db.transaction((items) => {
      for (const item of items) insert.run(item);
    });
    return insertMany(items);
  },
  
  deleteItem: (id: string) => {
    return db.prepare('DELETE FROM items WHERE id = ?').run(id);
  },
  
  getAllCategories: () => {
    return db.prepare('SELECT * FROM categories').all();
  },
  
  addCategory: (category: any) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO categories (id, name, color) VALUES (@id, @name, @color)');
    return stmt.run(category);
  },

  addCategories: (categories: any[]) => {
    const insert = db.prepare('INSERT OR REPLACE INTO categories (id, name, color) VALUES (@id, @name, @color)');
    const insertMany = db.transaction((categories) => {
      for (const category of categories) insert.run(category);
    });
    return insertMany(categories);
  },
  
  deleteCategory: (id: string) => {
    return db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  },

  getAllRecipes: () => {
    const recipes = db.prepare(`
      SELECT 
        id, name, items, notes, createdAt,
        CASE WHEN imageUrl IS NOT NULL AND imageUrl != '' THEN 1 ELSE 0 END as hasImage
      FROM recipes
    `).all();
    return recipes.map((recipe: any) => ({
      ...recipe,
      items: JSON.parse(recipe.items)
    }));
  },

  getAllRecipesFull: () => {
    const recipes = db.prepare('SELECT * FROM recipes').all();
    return recipes.map((recipe: any) => ({
      ...recipe,
      items: JSON.parse(recipe.items)
    }));
  },

  getRecipe: (id: string) => {
    const recipe: any = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id);
    if (recipe) {
      return {
        ...recipe,
        items: JSON.parse(recipe.items)
      };
    }
    return null;
  },

  getRecipeImage: (id: string) => {
    return db.prepare('SELECT imageUrl FROM recipes WHERE id = ?').get(id);
  },

  addRecipe: (recipe: any) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO recipes (id, name, items, imageUrl, notes, createdAt)
      VALUES (@id, @name, @items, @imageUrl, @notes, @createdAt)
    `);
    return stmt.run({
      ...recipe,
      items: JSON.stringify(recipe.items)
    });
  },

  addRecipes: (recipes: any[]) => {
    const insert = db.prepare(`
      INSERT OR REPLACE INTO recipes (id, name, items, imageUrl, notes, createdAt)
      VALUES (@id, @name, @items, @imageUrl, @notes, @createdAt)
    `);
    const insertMany = db.transaction((recipes) => {
      for (const recipe of recipes) {
        insert.run({
          ...recipe,
          items: JSON.stringify(recipe.items)
        });
      }
    });
    return insertMany(recipes);
  },

  deleteRecipe: (id: string) => {
    return db.prepare('DELETE FROM recipes WHERE id = ?').run(id);
  }
};
