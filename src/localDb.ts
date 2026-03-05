import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { SequinItem, Category, Recipe } from './db';

interface SequinDB extends DBSchema {
  items: {
    key: string;
    value: SequinItem;
    indexes: { 'by-category': string };
  };
  categories: {
    key: string;
    value: Category;
  };
  recipes: {
    key: string;
    value: Recipe;
  };
}

const DB_NAME = 'sequin-inventory-db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<SequinDB>>;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<SequinDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (oldVersion < 1) {
          const itemStore = db.createObjectStore('items', { keyPath: 'id' });
          itemStore.createIndex('by-category', 'category');
          db.createObjectStore('categories', { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          db.createObjectStore('recipes', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export const localDb = {
  async getAllItems() {
    const db = await getDb();
    return db.getAll('items');
  },

  async getItem(id: string) {
    const db = await getDb();
    return db.get('items', id);
  },

  async saveItem(item: SequinItem) {
    const db = await getDb();
    return db.put('items', item);
  },

  async saveItems(items: SequinItem[]) {
    const db = await getDb();
    const tx = db.transaction('items', 'readwrite');
    await Promise.all(items.map(item => tx.store.put(item)));
    return tx.done;
  },

  async deleteItem(id: string) {
    const db = await getDb();
    return db.delete('items', id);
  },

  async getAllCategories() {
    const db = await getDb();
    return db.getAll('categories');
  },

  async saveCategory(category: Category) {
    const db = await getDb();
    return db.put('categories', category);
  },

  async saveCategories(categories: Category[]) {
    const db = await getDb();
    const tx = db.transaction('categories', 'readwrite');
    await Promise.all(categories.map(cat => tx.store.put(cat)));
    return tx.done;
  },

  async deleteCategory(id: string) {
    const db = await getDb();
    return db.delete('categories', id);
  },

  async getAllRecipes() {
    const db = await getDb();
    return db.getAll('recipes');
  },

  async getRecipe(id: string) {
    const db = await getDb();
    return db.get('recipes', id);
  },

  async saveRecipe(recipe: Recipe) {
    const db = await getDb();
    return db.put('recipes', recipe);
  },

  async saveRecipes(recipes: Recipe[]) {
    const db = await getDb();
    const tx = db.transaction('recipes', 'readwrite');
    await Promise.all(recipes.map(recipe => tx.store.put(recipe)));
    return tx.done;
  },

  async deleteRecipe(id: string) {
    const db = await getDb();
    return db.delete('recipes', id);
  },
  
  async clearAll() {
    const db = await getDb();
    await db.clear('items');
    await db.clear('categories');
    await db.clear('recipes');
  }
};
