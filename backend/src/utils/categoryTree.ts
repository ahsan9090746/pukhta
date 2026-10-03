import { Category } from '../models/category.model';
import { NOT_DELETED } from './softDelete';

export const getDescendantCategoryIds = async (categoryId: string): Promise<string[]> => {
  const descendants = await Category.find(
    { ancestors: categoryId, ...NOT_DELETED },
    { _id: 1 }
  ).lean();

  return descendants.map((d) => d._id.toString());
};

export const getCategoryAndDescendantIds = async (categoryId: string): Promise<string[]> => {
  const descendants = await getDescendantCategoryIds(categoryId);
  return [categoryId, ...descendants];
};

export const getMultipleCategoriesAndDescendants = async (categoryIds: string[]): Promise<string[]> => {
  if (categoryIds.length === 0) return [];
  
  // Single query to get all descendants for all categories at once
  const allDescendants = await Category.find(
    { ancestors: { $in: categoryIds }, ...NOT_DELETED },
    { _id: 1, ancestors: 1 }
  ).lean();

  const allIds = new Set<string>(categoryIds);
  allDescendants.forEach((d) => allIds.add(d._id.toString()));
  
  return Array.from(allIds);
};