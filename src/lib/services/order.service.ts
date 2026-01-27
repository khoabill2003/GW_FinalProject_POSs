// Order Service - Business logic cho đơn hàng
import prisma from '@/lib/db';

// Helper function to generate UUID
function generateId() {
  return 'order-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

interface OrderItem {
  costPrice?: number;
}

interface Order {
  createdAt: Date;
  total: number;
  items: OrderItem[];
}

export interface CreateOrderInput {
  items: {
    menuItemId: string;
    quantity: number;
    notes?: string;
  }[];
  tableId?: string;
  customerId?: string;
  notes?: string;
  paymentMethod?: string;
  paymentStatus?: string;
}

export interface UpdateOrderInput {
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  notes?: string;
}

// Lấy tất cả orders với filter
export async function getOrders(filters?: {
  status?: string;
  paymentStatus?: string;
  today?: boolean;
}) {
  const whereClause: Record<string, unknown> = {};

  if (filters?.status && filters.status !== 'all') {
    whereClause.status = filters.status;
  }

  if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
    whereClause.paymentStatus = filters.paymentStatus;
  }

  if (filters?.today) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    whereClause.createdAt = { gte: startOfDay };
  }

  return prisma.order.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          notes: true,
          status: true,
          menuItemId: true,
          menuItemName: true,
          menuItem: {
            select: {
              id: true,
              name: true,
              image: true,
            }
          }
        }
      },
      table: {
        select: {
          id: true,
          number: true,
          zone: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      },
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
        }
      },
    },
  });
}

// Lấy order theo ID
export async function getOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          notes: true,
          status: true,
          menuItemId: true,
          menuItemName: true,
          menuItem: {
            select: {
              id: true,
              name: true,
              image: true,
            }
          }
        }
      },
      table: {
        select: {
          id: true,
          number: true,
          zone: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      },
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
        }
      },
    },
  });
}

// Tạo order mới
export async function createOrder(input: CreateOrderInput) {
  const { items, tableId, customerId, notes, paymentMethod, paymentStatus } = input;

  if (!items || items.length === 0) {
    throw new Error('Order phải có ít nhất 1 món');
  }

  // Validate tableId nếu có
  if (tableId) {
    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table) {
      throw new Error('Bàn không tồn tại');
    }
  }

  // Generate order number
  const lastOrder = await prisma.order.findFirst({
    orderBy: { orderNumber: 'desc' },
  });
  const orderNumber = (lastOrder?.orderNumber || 0) + 1;

  // Calculate totals và build order items
  let subtotal = 0;
  const orderItems = [];

  for (const item of items) {
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: item.menuItemId },
      include: {
        ingredients: {
          include: { ingredient: true },
        },
      },
    });

    if (!menuItem) {
      throw new Error(`Món ${item.menuItemId} không tồn tại`);
    }

    const itemTotal = menuItem.price * item.quantity;
    subtotal += itemTotal;

    // Tính giá vốn từ nguyên liệu
    let costPerItem = 0;
    for (const menuIngredient of menuItem.ingredients) {
      costPerItem += menuIngredient.quantity * menuIngredient.ingredient.costPrice;
    }
    const totalCost = costPerItem * item.quantity;

    orderItems.push({
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      quantity: item.quantity,
      unitPrice: menuItem.price,
      totalPrice: itemTotal,
      costPrice: totalCost,
      notes: item.notes || null,
    });
  }

  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + tax;

  // Create order
  const order = await prisma.order.create({
    data: {
      id: generateId(),
      orderNumber,
      subtotal,
      tax,
      total,
      status: 'pending',
      paymentMethod: paymentMethod || null,
      paymentStatus: paymentStatus || 'unpaid',
      tableId: tableId || null,
      customerId: customerId || null,
      notes: notes || null,
      items: {
        create: orderItems.map(item => ({
          id: 'item-' + Date.now().toString(36) + Math.random().toString(36).substr(2),
          ...item,
        })),
      },
    },
    include: {
      items: true,
      table: true,
      customer: true,
    },
  });

  // Update table status if assigned
  if (tableId) {
    await prisma.table.update({
      where: { id: tableId },
      data: { status: 'occupied' },
    });
  }

  return order;
}

// Cập nhật order
export async function updateOrder(id: string, input: UpdateOrderInput) {
  const existingOrder = await prisma.order.findUnique({
    where: { id },
  });

  if (!existingOrder) {
    throw new Error('Order không tồn tại');
  }

  const order = await prisma.order.update({
    where: { id },
    data: {
      ...(input.status && { status: input.status }),
      ...(input.paymentStatus && { paymentStatus: input.paymentStatus }),
      ...(input.paymentMethod && { paymentMethod: input.paymentMethod }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      subtotal: true,
      tax: true,
      total: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      items: {
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          notes: true,
          menuItemId: true,
          menuItemName: true,
          menuItem: {
            select: {
              id: true,
              name: true,
              image: true,
            }
          }
        }
      },
      table: {
        select: {
          id: true,
          number: true,
          zone: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      },
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
        }
      },
    },
  });

  // If order is completed or cancelled, free up the table
  if ((input.status === 'completed' || input.status === 'cancelled') && existingOrder.tableId) {
    await prisma.table.update({
      where: { id: existingOrder.tableId },
      data: { status: 'available' },
    });
  }

  return order;
}

// Xóa order
export async function deleteOrder(id: string) {
  const existingOrder = await prisma.order.findUnique({
    where: { id },
  });

  if (!existingOrder) {
    throw new Error('Order không tồn tại');
  }

  // Free up the table if assigned
  if (existingOrder.tableId) {
    await prisma.table.update({
      where: { id: existingOrder.tableId },
      data: { status: 'available' },
    });
  }

  await prisma.order.delete({ where: { id } });
  return true;
}

// Xác nhận các món mới thêm vào order
export async function confirmOrderItems(orderId: string, itemIds?: string[]) {
  const existingOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!existingOrder) {
    throw new Error('Order không tồn tại');
  }

  // Nếu có danh sách itemIds → chỉ xác nhận những món đó
  // Nếu không → xác nhận tất cả món pending_confirm
  const whereClause = itemIds && itemIds.length > 0
    ? { id: { in: itemIds }, orderId, status: 'pending_confirm' }
    : { orderId, status: 'pending_confirm' };

  await prisma.orderItem.updateMany({
    where: whereClause,
    data: { status: 'confirmed' },
  });

  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          notes: true,
          status: true,
          menuItemId: true,
          menuItemName: true,
          menuItem: {
            select: {
              id: true,
              name: true,
              image: true,
            }
          }
        }
      },
      table: true,
      customer: true,
    },
  });
}

// Lấy order active của bàn (pending, confirmed, preparing, ready)
export async function getActiveOrderByTableId(tableId: string) {
  return prisma.order.findFirst({
    where: {
      tableId,
      status: { in: ['pending', 'confirmed', 'preparing', 'ready'] },
      paymentStatus: 'unpaid',
    },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          notes: true,
          status: true,
          menuItemId: true,
          menuItemName: true,
          menuItem: {
            select: {
              id: true,
              name: true,
              image: true,
            }
          }
        }
      },
      table: {
        select: {
          id: true,
          number: true,
          zone: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      },
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
        }
      },
    },
  });
}

// Thêm món vào order đang có
export async function addItemsToOrder(orderId: string, items: { menuItemId: string; quantity: number; notes?: string }[]) {
  const existingOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!existingOrder) {
    throw new Error('Order không tồn tại');
  }

  if (['completed', 'cancelled'].includes(existingOrder.status)) {
    throw new Error('Không thể thêm món vào đơn đã hoàn thành hoặc đã hủy');
  }

  // Xác định status cho món mới
  // Nếu đơn đang được phục vụ (preparing, ready, served) → món mới cần xác nhận
  const needsConfirmation = ['preparing', 'ready', 'served'].includes(existingOrder.status);
  const itemStatus = needsConfirmation ? 'pending_confirm' : 'confirmed';

  // Calculate new items
  let addedSubtotal = 0;
  const newOrderItems = [];

  for (const item of items) {
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: item.menuItemId },
      include: {
        ingredients: {
          include: { ingredient: true },
        },
      },
    });

    if (!menuItem) {
      throw new Error(`Món ${item.menuItemId} không tồn tại`);
    }

    const itemTotal = menuItem.price * item.quantity;
    addedSubtotal += itemTotal;

    // Tính giá vốn từ nguyên liệu
    let costPerItem = 0;
    for (const menuIngredient of menuItem.ingredients) {
      costPerItem += menuIngredient.quantity * menuIngredient.ingredient.costPrice;
    }
    const totalCost = costPerItem * item.quantity;

    newOrderItems.push({
      id: 'item-' + Date.now().toString(36) + Math.random().toString(36).substr(2),
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      quantity: item.quantity,
      unitPrice: menuItem.price,
      totalPrice: itemTotal,
      costPrice: totalCost,
      notes: item.notes || null,
      status: itemStatus,
      orderId: orderId,
    });
  }

  // Recalculate totals
  const newSubtotal = existingOrder.subtotal + addedSubtotal;
  const newTax = newSubtotal * 0.08;
  const newTotal = newSubtotal + newTax;

  // Add items and update totals
  await prisma.orderItem.createMany({
    data: newOrderItems,
  });

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      subtotal: newSubtotal,
      tax: newTax,
      total: newTotal,
    },
    include: {
      items: {
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          notes: true,
          status: true,
          menuItemId: true,
          menuItemName: true,
          menuItem: {
            select: {
              id: true,
              name: true,
              image: true,
            }
          }
        }
      },
      table: true,
      customer: true,
    },
  });

  return updatedOrder;
}

// Tính thống kê
export async function getOrderStats() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const orders = await prisma.order.findMany({
    where: {
      status: 'completed',
      paymentStatus: 'paid',
    },
    include: {
      items: true,
    },
  });

  const calculateStats = (startDate: Date) => {
    const filteredOrders = orders.filter((o: Order) => new Date(o.createdAt) >= startDate);
    const sales = filteredOrders.reduce((sum: number, o: Order) => sum + o.total, 0);
    const cost = filteredOrders.reduce((sum: number, o: Order) => 
      sum + o.items.reduce((itemSum: number, item: OrderItem) => itemSum + (item.costPrice || 0), 0), 0
    );
    return { sales, cost, profit: sales - cost, count: filteredOrders.length };
  };

  return {
    today: calculateStats(todayStart),
    month: calculateStats(monthStart),
    year: calculateStats(yearStart),
  };
}
