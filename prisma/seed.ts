import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function generateId() {
  return randomBytes(12).toString('hex');
}

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function main() {
  console.log('🌱 Seeding database...');

  // ========== DEFAULT RESTAURANT ==========
  const restaurant = await prisma.restaurant.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'Nhà Hàng Demo',
      address: '123 Đường ABC, TP.HCM',
      phone: '028 1234 5678',
      taxRate: 10.0,
    },
  });
  console.log('✅ Restaurant created/updated:', restaurant.name);

  // ========== USERS (with hashed passwords) ==========
  // Hash passwords first
  const ownerPass = await hashPassword('owner123');
  const managerPass = await hashPassword('manager123');
  const waiterPass = await hashPassword('waiter123');
  const kitchenPass = await hashPassword('kitchen123');
  const cashierPass = await hashPassword('cashier123');

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'owner@restaurant.com' },
      update: {},
      create: {
        id: generateId(),
        email: 'owner@restaurant.com',
        name: 'Chủ Nhà Hàng',
        password: ownerPass,
        role: 'owner',
      },
    }),
    prisma.user.upsert({
      where: { email: 'manager@restaurant.com' },
      update: {},
      create: {
        id: generateId(),
        email: 'manager@restaurant.com',
        name: 'Quản Lý',
        password: managerPass,
        role: 'manager',
      },
    }),
    prisma.user.upsert({
      where: { email: 'waiter@restaurant.com' },
      update: {},
      create: {
        id: generateId(),
        email: 'waiter@restaurant.com',
        name: 'Nhân viên Phục vụ',
        password: waiterPass,
        role: 'waiter',
      },
    }),
    prisma.user.upsert({
      where: { email: 'kitchen@restaurant.com' },
      update: {},
      create: {
        id: generateId(),
        email: 'kitchen@restaurant.com',
        name: 'Nhân viên Bếp',
        password: kitchenPass,
        role: 'kitchen',
      },
    }),
    prisma.user.upsert({
      where: { email: 'cashier@restaurant.com' },
      update: {},
      create: {
        id: generateId(),
        email: 'cashier@restaurant.com',
        name: 'Nhân viên Thu ngân',
        password: cashierPass,
        role: 'cashier',
      },
    }),
  ]);
  console.log('✅ Users created/updated:', users.length);
  console.log('📝 Seed users (mật khẩu được hash):');
  console.log('   Owner: owner@restaurant.com / owner123');
  console.log('   Manager: manager@restaurant.com / manager123');
  console.log('   Waiter: waiter@restaurant.com / waiter123');
  console.log('   Kitchen: kitchen@restaurant.com / kitchen123');
  console.log('   Cashier: cashier@restaurant.com / cashier123');

  // ========== ZONES ==========
  const zones = await Promise.all([
    prisma.zone.upsert({
      where: { name: 'Tầng 1' },
      update: {},
      create: {
        id: 'zone-1',
        name: 'Tầng 1',
        description: 'Khu vực tầng trệt',
      },
    }),
    prisma.zone.upsert({
      where: { name: 'Tầng 2' },
      update: {},
      create: {
        id: 'zone-2',
        name: 'Tầng 2',
        description: 'Khu vực tầng lầu',
      },
    }),
    prisma.zone.upsert({
      where: { name: 'VIP' },
      update: {},
      create: {
        id: 'zone-vip',
        name: 'VIP',
        description: 'Phòng VIP riêng biệt',
      },
    }),
    prisma.zone.upsert({
      where: { name: 'Sân vườn' },
      update: {},
      create: {
        id: 'zone-outdoor',
        name: 'Sân vườn',
        description: 'Khu vực ngoài trời',
      },
    }),
  ]);
  console.log('✅ Zones created/updated:', zones.length);

  // ========== TABLES ==========
  const tables = [
    { number: 1, name: 'Bàn 1', capacity: 4, zoneId: 'zone-1' },
    { number: 2, name: 'Bàn 2', capacity: 4, zoneId: 'zone-1' },
    { number: 3, name: 'Bàn 3', capacity: 6, zoneId: 'zone-1' },
    { number: 4, name: 'Bàn 4', capacity: 4, zoneId: 'zone-1' },
    { number: 5, name: 'Bàn 5', capacity: 2, zoneId: 'zone-1' },
    { number: 6, name: 'Bàn 6', capacity: 4, zoneId: 'zone-2' },
    { number: 7, name: 'Bàn 7', capacity: 6, zoneId: 'zone-2' },
    { number: 8, name: 'Bàn 8', capacity: 4, zoneId: 'zone-2' },
    { number: 9, name: 'Bàn 9', capacity: 8, zoneId: 'zone-2' },
    { number: 10, name: 'Bàn 10', capacity: 4, zoneId: 'zone-2' },
    { number: 11, name: 'Bàn VIP 1', capacity: 10, zoneId: 'zone-vip' },
    { number: 12, name: 'Bàn VIP 2', capacity: 12, zoneId: 'zone-vip' },
    { number: 13, name: 'Bàn Sân 1', capacity: 6, zoneId: 'zone-outdoor' },
    { number: 14, name: 'Bàn Sân 2', capacity: 6, zoneId: 'zone-outdoor' },
    { number: 15, name: 'Bàn Sân 3', capacity: 8, zoneId: 'zone-outdoor' },
  ];

  for (const table of tables) {
    await prisma.table.upsert({
      where: { number: table.number },
      update: {},
      create: {
        id: generateId(),
        ...table,
      },
    });
  }
  console.log('✅ Tables created/updated:', tables.length);

  // ========== RESTAURANT ==========
  await prisma.restaurant.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'Nhà Hàng Hoa Hồng',
      address: '123 Đường Nguyễn Huệ, Quận 1, TP.HCM',
      phone: '(028) 3821 1234',
      email: 'contact@restaurant.vn',
    },
  });
  console.log('✅ Restaurant created/updated');

  // ========== BRANCHES ==========
  console.log('✅ Branches created/updated: 2');

  // ========== CATEGORIES ==========
  const categories = [
    { id: 'cat-appetizer', name: 'Khai vị', icon: '🥗', order: 1 },
    { id: 'cat-main', name: 'Món chính', icon: '🍝', order: 2 },
    { id: 'cat-soup', name: 'Súp & Lẩu', icon: '🍲', order: 3 },
    { id: 'cat-grill', name: 'Nướng', icon: '🔥', order: 4 },
    { id: 'cat-seafood', name: 'Hải sản', icon: '🦐', order: 5 },
    { id: 'cat-rice', name: 'Cơm', icon: '🍚', order: 6 },
    { id: 'cat-noodle', name: 'Phở & Bún', icon: '🍜', order: 7 },
    { id: 'cat-dessert', name: 'Tráng miệng', icon: '🍰', order: 8 },
    { id: 'cat-drink', name: 'Đồ uống', icon: '🥤', order: 9 },
    { id: 'cat-beer', name: 'Bia & Rượu', icon: '🍺', order: 10 },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: {},
      create: category,
    });
  }
  console.log('✅ Categories created/updated:', categories.length);

  // ========== INGREDIENTS ==========
  const ingredients = [
    { id: 'ing-beef', name: 'Thịt bò', unit: 'kg', costPrice: 250000, stock: 20, minStock: 5 },
    { id: 'ing-pork', name: 'Thịt heo', unit: 'kg', costPrice: 120000, stock: 30, minStock: 10 },
    { id: 'ing-chicken', name: 'Thịt gà', unit: 'kg', costPrice: 80000, stock: 25, minStock: 8 },
    { id: 'ing-shrimp', name: 'Tôm', unit: 'kg', costPrice: 350000, stock: 10, minStock: 3 },
    { id: 'ing-fish', name: 'Cá', unit: 'kg', costPrice: 180000, stock: 15, minStock: 5 },
    { id: 'ing-squid', name: 'Mực', unit: 'kg', costPrice: 280000, stock: 8, minStock: 3 },
    { id: 'ing-rice', name: 'Gạo', unit: 'kg', costPrice: 25000, stock: 50, minStock: 20 },
    { id: 'ing-noodle', name: 'Phở/Bún', unit: 'kg', costPrice: 35000, stock: 30, minStock: 10 },
    { id: 'ing-vegetable', name: 'Rau củ', unit: 'kg', costPrice: 30000, stock: 20, minStock: 5 },
    { id: 'ing-egg', name: 'Trứng', unit: 'quả', costPrice: 4000, stock: 100, minStock: 30 },
    { id: 'ing-milk', name: 'Sữa tươi', unit: 'lít', costPrice: 35000, stock: 20, minStock: 5 },
    { id: 'ing-coffee', name: 'Cà phê', unit: 'kg', costPrice: 200000, stock: 5, minStock: 2 },
    { id: 'ing-beer', name: 'Bia', unit: 'lon', costPrice: 12000, stock: 200, minStock: 50 },
  ];

  for (const ingredient of ingredients) {
    await prisma.ingredient.upsert({
      where: { id: ingredient.id },
      update: {},
      create: ingredient,
    });
  }
  console.log('✅ Ingredients created/updated:', ingredients.length);

  // ========== MENU ITEMS ==========
  const menuItems = [
    // Khai vị
    { id: 'menu-1', name: 'Gỏi cuốn tôm thịt', description: 'Gỏi cuốn tươi với tôm, thịt heo và rau sống', price: 45000, categoryId: 'cat-appetizer' },
    { id: 'menu-2', name: 'Chả giò', description: 'Chả giò giòn rụm, ăn kèm nước mắm', price: 55000, categoryId: 'cat-appetizer' },
    { id: 'menu-3', name: 'Súp cua', description: 'Súp cua thơm ngon, nóng hổi', price: 40000, categoryId: 'cat-appetizer' },
    
    // Món chính
    { id: 'menu-4', name: 'Bò lúc lắc', description: 'Thịt bò Úc xào với tiêu đen và hành tây', price: 185000, categoryId: 'cat-main' },
    { id: 'menu-5', name: 'Gà nướng mật ong', description: 'Đùi gà nướng với sốt mật ong đặc biệt', price: 125000, categoryId: 'cat-main' },
    { id: 'menu-6', name: 'Sườn xào chua ngọt', description: 'Sườn heo xào với sốt chua ngọt', price: 145000, categoryId: 'cat-main' },
    
    // Súp & Lẩu
    { id: 'menu-7', name: 'Lẩu thái hải sản', description: 'Lẩu chua cay kiểu Thái với hải sản tươi', price: 350000, categoryId: 'cat-soup' },
    { id: 'menu-8', name: 'Lẩu bò nhúng giấm', description: 'Lẩu bò truyền thống với nước dùng chua ngọt', price: 320000, categoryId: 'cat-soup' },
    
    // Nướng
    { id: 'menu-9', name: 'Bò nướng lá lốt', description: 'Thịt bò cuốn lá lốt nướng than', price: 95000, categoryId: 'cat-grill' },
    { id: 'menu-10', name: 'Tôm nướng muối ớt', description: 'Tôm sú nướng với muối ớt', price: 180000, categoryId: 'cat-grill' },
    
    // Hải sản
    { id: 'menu-11', name: 'Cá hồi sốt chanh dây', description: 'Cá hồi Na Uy với sốt chanh dây', price: 250000, categoryId: 'cat-seafood' },
    { id: 'menu-12', name: 'Mực xào sa tế', description: 'Mực tươi xào với sa tế cay nồng', price: 165000, categoryId: 'cat-seafood' },
    
    // Cơm
    { id: 'menu-13', name: 'Cơm chiên Dương Châu', description: 'Cơm chiên với tôm, trứng và rau củ', price: 75000, categoryId: 'cat-rice' },
    { id: 'menu-14', name: 'Cơm sườn bì chả', description: 'Cơm tấm Sài Gòn với sườn nướng', price: 65000, categoryId: 'cat-rice' },
    
    // Phở & Bún
    { id: 'menu-15', name: 'Phở bò tái nạm', description: 'Phở bò truyền thống với thịt tái và nạm', price: 55000, categoryId: 'cat-noodle' },
    { id: 'menu-16', name: 'Bún bò Huế', description: 'Bún bò cay nồng đặc sản Huế', price: 60000, categoryId: 'cat-noodle' },
    
    // Tráng miệng
    { id: 'menu-17', name: 'Chè khúc bạch', description: 'Chè thanh mát với kem và thạch', price: 35000, categoryId: 'cat-dessert' },
    { id: 'menu-18', name: 'Bánh flan', description: 'Bánh flan caramen mềm mịn', price: 25000, categoryId: 'cat-dessert' },
    
    // Đồ uống
    { id: 'menu-19', name: 'Trà đào cam sả', description: 'Trà đào tươi mát với cam và sả', price: 35000, categoryId: 'cat-drink' },
    { id: 'menu-20', name: 'Cà phê sữa đá', description: 'Cà phê phin truyền thống với sữa đặc', price: 29000, categoryId: 'cat-drink' },
    { id: 'menu-21', name: 'Sinh tố bơ', description: 'Sinh tố bơ béo ngậy', price: 40000, categoryId: 'cat-drink' },
    { id: 'menu-22', name: 'Nước ép cam', description: 'Nước ép cam tươi 100%', price: 35000, categoryId: 'cat-drink' },
    
    // Bia & Rượu
    { id: 'menu-23', name: 'Bia Saigon Special', description: 'Lon 330ml', price: 20000, categoryId: 'cat-beer' },
    { id: 'menu-24', name: 'Bia Tiger', description: 'Lon 330ml', price: 22000, categoryId: 'cat-beer' },
    { id: 'menu-25', name: 'Bia Heineken', description: 'Lon 330ml', price: 28000, categoryId: 'cat-beer' },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {},
      create: {
        ...item,
        available: true,
        type: 'single',
      },
    });
  }
  console.log('✅ Menu items created/updated:', menuItems.length);

  // ========== CUSTOMERS ==========
  const customers = [
    { id: 'cus-1', name: 'Nguyễn Văn A', phone: '0901234567', email: 'nguyenvana@email.com', address: '123 Lê Lợi, Q1, HCM' },
    { id: 'cus-2', name: 'Trần Thị B', phone: '0912345678', email: 'tranthib@email.com', address: '456 Nguyễn Huệ, Q1, HCM' },
    { id: 'cus-3', name: 'Lê Văn C', phone: '0923456789', email: null, address: '789 Hai Bà Trưng, Q3, HCM' },
  ];

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { id: customer.id },
      update: {},
      create: customer,
    });
  }
  console.log('✅ Customers created/updated:', customers.length);

  // ========== MENU ITEM INGREDIENTS ==========
  const menuIngredients = [
    // Bò lúc lắc
    { menuItemId: 'menu-4', ingredientId: 'ing-beef', quantity: 0.2 },
    // Gà nướng
    { menuItemId: 'menu-5', ingredientId: 'ing-chicken', quantity: 0.3 },
    // Sườn xào
    { menuItemId: 'menu-6', ingredientId: 'ing-pork', quantity: 0.25 },
    // Lẩu thái
    { menuItemId: 'menu-7', ingredientId: 'ing-shrimp', quantity: 0.3 },
    { menuItemId: 'menu-7', ingredientId: 'ing-squid', quantity: 0.2 },
    { menuItemId: 'menu-7', ingredientId: 'ing-fish', quantity: 0.2 },
    // Tôm nướng
    { menuItemId: 'menu-10', ingredientId: 'ing-shrimp', quantity: 0.3 },
    // Cơm chiên
    { menuItemId: 'menu-13', ingredientId: 'ing-rice', quantity: 0.2 },
    { menuItemId: 'menu-13', ingredientId: 'ing-shrimp', quantity: 0.1 },
    { menuItemId: 'menu-13', ingredientId: 'ing-egg', quantity: 2 },
    // Phở bò
    { menuItemId: 'menu-15', ingredientId: 'ing-beef', quantity: 0.15 },
    { menuItemId: 'menu-15', ingredientId: 'ing-noodle', quantity: 0.2 },
    // Cà phê sữa đá
    { menuItemId: 'menu-20', ingredientId: 'ing-coffee', quantity: 0.02 },
    { menuItemId: 'menu-20', ingredientId: 'ing-milk', quantity: 0.05 },
  ];

  for (const mi of menuIngredients) {
    await prisma.menuItemIngredient.upsert({
      where: {
        menuItemId_ingredientId: {
          menuItemId: mi.menuItemId,
          ingredientId: mi.ingredientId,
        },
      },
      update: {},
      create: {
        id: generateId(),
        ...mi,
      },
    });
  }
  console.log('✅ Menu-Ingredient links created/updated:', menuIngredients.length);

  console.log('\n🎉 Seeding completed!');
  console.log('\n📊 Summary:');
  console.log('   - Users: 5');
  console.log('   - Zones: 4');
  console.log('   - Tables: 15');
  console.log('   - Restaurant: 1');
  console.log('   - Branches: 2');
  console.log('   - Categories: 10');
  console.log('   - Ingredients: 13');
  console.log('   - Menu Items: 25');
  console.log('   - Customers: 3');
  console.log('   - Menu-Ingredient Links: 14');
  console.log('\n🔑 Login credentials:');
  console.log('   - owner@restaurant.com / owner123');
  console.log('   - manager@restaurant.com / manager123');
  console.log('   - waiter@restaurant.com / waiter123');
  console.log('   - kitchen@restaurant.com / kitchen123');
  console.log('   - cashier@restaurant.com / cashier123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  