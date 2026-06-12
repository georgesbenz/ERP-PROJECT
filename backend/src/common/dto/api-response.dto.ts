import { PaginationMeta } from './pagination.dto';

export class ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  message?: string;

  static ok<T>(data: T, meta?: PaginationMeta, message?: string): ApiResponse<T> {
    return { success: true, data, meta, message };
  }
}
