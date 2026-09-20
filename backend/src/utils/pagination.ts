import { Query, Document } from 'mongoose';

export interface PaginationQuery {
  page?: string | number;
  limit?: string | number;
  sort?: string;
  search?: string;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const parsePagination = (query: PaginationQuery) => {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const parseSort = (sortString?: string): Record<string, 1 | -1> => {
  if (!sortString) return { createdAt: -1 };

  const sortObj: Record<string, 1 | -1> = {};
  const parts = sortString.split(',');

  parts.forEach((part) => {
    const field = part.startsWith('-') ? part.slice(1) : part;
    const order = part.startsWith('-') ? -1 : 1;
    sortObj[field] = order;
  });

  return sortObj;
};

export const buildSearchFilter = (search: string, fields: string[]): Record<string, any> => {
  if (!search) return {};

  const searchRegex = new RegExp(search, 'i');
  return {
    $or: fields.map((field) => ({ [field]: searchRegex })),
  };
};

export const paginate = async <T extends Document>(
  model: Query<T[], T>,
  page: number,
  limit: number
): Promise<PaginationResult<T>> => {
  const countQuery = model.model.find().merge(model).countDocuments();
  const [data, total] = await Promise.all([
    model.skip((page - 1) * limit).limit(limit).lean(),
    countQuery,
  ]);

  const pages = Math.ceil(total / limit);

  return {
    data: data as T[],
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    },
  };
};

export const buildPaginationResponse = (
  total: number,
  page: number,
  limit: number
) => {
  const pages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1,
  };
};
