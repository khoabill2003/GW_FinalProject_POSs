// Order Service - Business logic cho đơn hàng
import prisma from '@/lib/db';

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
        include: { menuItem: true },
      },
      table: true,
      customer: true,
    },
  });
}

// Lấy order theo ID
export async function getOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: { menuItem: true },
      },
      table: true,
      customer: true,
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
        create: orderItems,
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
    include: { table: true },
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
    include: {
      items: true,
      table: true,
      customer: true,
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
    include: { table: true },
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
    const filteredOrders = orders.filter(o => new Date(o.createdAt) >= startDate);
    const sales = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    const cost = filteredOrders.reduce((sum, o) => 
      sum + o.items.reduce((itemSum, item) => itemSum + (item.costPrice || 0), 0), 0
    );
    return { sales, cost, profit: sales - cost, count: filteredOrders.length };
  };

  return {
    today: calculateStats(todayStart),
    month: calculateStats(monthStart),
    year: calculateStats(yearStart),
  };
}
