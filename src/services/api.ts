import type { Order, Product } from '../types/types';

// URL của backend
const API_BASE_URL = 'http://localhost:3000/api';

// Lấy danh sách sản phẩm
export const fetchProducts = async (): Promise<Product[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Lỗi khi lấy danh sách sản phẩm');
    }

    return await response.json();
  } catch (error) {
    console.error('Lỗi trong fetchProducts:', error);
    throw error;
  }
};

// Thêm sản phẩm mới
export const addProduct = async (
  newProduct: Omit<Product, 'id' | 'blockchainTxId'>,
  blockchainTxId: string,
  email: string
): Promise<Product> => {
  try {
    const product = { ...newProduct, blockchainTxId, email };
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });

    if (!response.ok) {
      throw new Error('Lỗi khi thêm sản phẩm');
    }

    return await response.json();
  } catch (error) {
    console.error('Lỗi trong addProduct:', error);
    throw error;
  }
};

// Cập nhật sản phẩm
export const updateProduct = async (updatedProduct: Product): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${updatedProduct.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedProduct),
    });

    if (!response.ok) {
      throw new Error('Lỗi khi cập nhật sản phẩm');
    }
  } catch (error) {
    console.error('Lỗi trong updateProduct:', error);
    throw error;
  }
};

// Xóa sản phẩm
export const deleteProduct = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Lỗi khi xóa sản phẩm');
    }
  } catch (error) {
    console.error('Lỗi trong deleteProduct:', error);
    throw error;
  }
};

// Lấy sản phẩm theo ID (cho trang ProductDetail)
export const fetchProductById = async (id: string): Promise<Product | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Lỗi khi lấy sản phẩm');
    }

    return await response.json();
  } catch (error) {
    console.error('Lỗi trong fetchProductById:', error);
    throw error;
  }
};


// Thêm đơn hàng mới
export const addOrder = async (order: Order): Promise<Order> => {
  try {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order),
    });

    if (!response.ok) {
      throw new Error('Lỗi khi tạo đơn hàng');
    }

    return await response.json();
  } catch (error) {
    console.error('Lỗi trong addOrder:', error);
    throw error;
  }
};