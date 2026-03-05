export type StockStatus = '充足' | '需補貨' | '用完了';

import { db, storage } from './firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { localDb } from './localDb';

export type StockStatus = '充足' | '需補貨' | '用完了';

export interface SequinItem {
  id: string;
  name: string;
  category: string;
  imageUrl?: string;
  quantity: number;
  unit?: string;
  price?: number;
  status?: StockStatus;
  color?: string;
  notes?: string;
  createdAt: number;
  hasImage?: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface RecipeItem {
  itemId: string;
  quantity: number;
}

export interface Recipe {
  id: string;
  name: string;
  items: RecipeItem[];
  imageUrl?: string;
  notes?: string;
  createdAt: number;
  hasImage?: boolean;
}

// Helper to upload image to Firebase Storage
const uploadImage = async (dataUrl: string, path: string): Promise<string> => {
  if (!dataUrl.startsWith('data:')) return dataUrl; // Already a URL
  const storageRef = ref(storage, path);
  await uploadString(storageRef, dataUrl, 'data_url');
  return getDownloadURL(storageRef);
};

export const dbApi = {
  async getAllItems() {
    try {
      const querySnapshot = await getDocs(collection(db, 'items'));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SequinItem[];
    } catch (error) {
      console.error('Error getting items from Firebase:', error);
      return [];
    }
  },

  async getItem(id: string) {
    try {
      const docRef = doc(db, 'items', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as SequinItem;
      } else {
        throw new Error('Item not found');
      }
    } catch (error) {
      console.error('Error getting item from Firebase:', error);
      throw error;
    }
  },
  
  async addItem(item: SequinItem) {
    try {
      let imageUrl = item.imageUrl;
      if (imageUrl && imageUrl.startsWith('data:')) {
        imageUrl = await uploadImage(imageUrl, `items/${Date.now()}_${item.name}`);
      }
      
      const docRef = item.id ? doc(db, 'items', item.id) : doc(collection(db, 'items'));
      await setDoc(docRef, { ...item, imageUrl });
      return { ...item, id: docRef.id, imageUrl };
    } catch (error) {
      console.error('Error adding item to Firebase:', error);
      throw error;
    }
  },

  async addItems(items: SequinItem[]) {
    const batch = writeBatch(db);
    const results: SequinItem[] = [];
    
    for (const item of items) {
      let imageUrl = item.imageUrl;
      if (imageUrl && imageUrl.startsWith('data:')) {
        try {
          imageUrl = await uploadImage(imageUrl, `items/${Date.now()}_${item.name}`);
        } catch (e) {
          console.warn('Failed to upload image for item:', item.name, e);
          imageUrl = undefined;
        }
      }
      
      const docRef = item.id ? doc(db, 'items', item.id) : doc(collection(db, 'items'));
      batch.set(docRef, { ...item, imageUrl });
      results.push({ ...item, id: docRef.id, imageUrl });
    }
    
    await batch.commit();
    return results;
  },
  
  async deleteItem(id: string) {
    try {
      // Optional: Delete image from storage if exists
      const item = await this.getItem(id);
      if (item.imageUrl && item.imageUrl.includes('firebasestorage')) {
        try {
          const imageRef = ref(storage, item.imageUrl);
          await deleteObject(imageRef);
        } catch (e) {
          console.warn('Failed to delete image from storage:', e);
        }
      }
      
      await deleteDoc(doc(db, 'items', id));
      return { id };
    } catch (error) {
      console.error('Error deleting item from Firebase:', error);
      throw error;
    }
  },
  
  async getAllCategories() {
    try {
      const querySnapshot = await getDocs(collection(db, 'categories'));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[];
    } catch (error) {
      console.error('Error getting categories from Firebase:', error);
      return [];
    }
  },
  
  async addCategory(category: Category) {
    try {
      const docRef = category.id ? doc(db, 'categories', category.id) : doc(collection(db, 'categories'));
      await setDoc(docRef, category);
      return { ...category, id: docRef.id };
    } catch (error) {
      console.error('Error adding category to Firebase:', error);
      throw error;
    }
  },

  async addCategories(categories: Category[]) {
    const batch = writeBatch(db);
    const results: Category[] = [];
    
    for (const category of categories) {
      const docRef = category.id ? doc(db, 'categories', category.id) : doc(collection(db, 'categories'));
      batch.set(docRef, category);
      results.push({ ...category, id: docRef.id });
    }
    
    await batch.commit();
    return results;
  },
  
  async deleteCategory(id: string) {
    try {
      await deleteDoc(doc(db, 'categories', id));
      return { id };
    } catch (error) {
      console.error('Error deleting category from Firebase:', error);
      throw error;
    }
  },

  async getAllRecipes() {
    try {
      const querySnapshot = await getDocs(collection(db, 'recipes'));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Recipe[];
    } catch (error) {
      console.error('Error getting recipes from Firebase:', error);
      return [];
    }
  },

  async getRecipe(id: string) {
    try {
      const docRef = doc(db, 'recipes', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Recipe;
      } else {
        throw new Error('Recipe not found');
      }
    } catch (error) {
      console.error('Error getting recipe from Firebase:', error);
      throw error;
    }
  },

  async addRecipe(recipe: Recipe) {
    try {
      let imageUrl = recipe.imageUrl;
      if (imageUrl && imageUrl.startsWith('data:')) {
        imageUrl = await uploadImage(imageUrl, `recipes/${Date.now()}_${recipe.name}`);
      }
      
      const docRef = recipe.id ? doc(db, 'recipes', recipe.id) : doc(collection(db, 'recipes'));
      await setDoc(docRef, { ...recipe, imageUrl });
      return { ...recipe, id: docRef.id, imageUrl };
    } catch (error) {
      console.error('Error adding recipe to Firebase:', error);
      throw error;
    }
  },

  async addRecipes(recipes: Recipe[]) {
    const batch = writeBatch(db);
    const results: Recipe[] = [];
    
    for (const recipe of recipes) {
      let imageUrl = recipe.imageUrl;
      if (imageUrl && imageUrl.startsWith('data:')) {
        try {
          imageUrl = await uploadImage(imageUrl, `recipes/${Date.now()}_${recipe.name}`);
        } catch (e) {
          console.warn('Failed to upload image for recipe:', recipe.name, e);
          imageUrl = undefined;
        }
      }
      
      const docRef = recipe.id ? doc(db, 'recipes', recipe.id) : doc(collection(db, 'recipes'));
      batch.set(docRef, { ...recipe, imageUrl });
      results.push({ ...recipe, id: docRef.id, imageUrl });
    }
    
    await batch.commit();
    return results;
  },
  
  async deleteRecipe(id: string) {
    try {
      // Optional: Delete image from storage if exists
      const recipe = await this.getRecipe(id);
      if (recipe.imageUrl && recipe.imageUrl.includes('firebasestorage')) {
        try {
          const imageRef = ref(storage, recipe.imageUrl);
          await deleteObject(imageRef);
        } catch (e) {
          console.warn('Failed to delete image from storage:', e);
        }
      }

      await deleteDoc(doc(db, 'recipes', id));
      return { id };
    } catch (error) {
      console.error('Error deleting recipe from Firebase:', error);
      throw error;
    }
  }
};
