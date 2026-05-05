# 📚 Hướng Dẫn Phỏng Vấn – GW Restaurant POS

> Tài liệu này liệt kê các **chức năng quan trọng** trong dự án, kèm **code thực tế**, **giải thích chi tiết** và **vị trí file** để bạn học và trả lời phỏng vấn tốt hơn.

---

## Mục Lục

1. [Context API + Custom Hook (`useAuth`)](#1-context-api--custom-hook-useauth)
2. [useReducer cho Cart Management](#2-usereducer-cho-cart-management)
3. [useCallback + Promise.all – Fetch dữ liệu song song](#3-usecallback--promiseall--fetch-dữ-liệu-song-song)
4. [Form Validation với Regex](#4-form-validation-với-regex)
5. [Multi-step Form (Booking Flow)](#5-multi-step-form-booking-flow)
6. [Role-Based UI Rendering](#6-role-based-ui-rendering)
7. [Auto-Refresh với setInterval + useEffect Cleanup](#7-auto-refresh-với-setinterval--useeffect-cleanup)
8. [Custom JWT (Không dùng thư viện ngoài)](#8-custom-jwt-không-dùng-thư-viện-ngoài)
9. [Middleware Authentication & Authorization](#9-middleware-authentication--authorization)
10. [Service Layer Pattern (Backend)](#10-service-layer-pattern-backend)
11. [VNPay Integration – Thanh Toán Online](#11-vnpay-integration--thanh-toán-online)
12. [Prisma ORM – Tạo Order với Transaction ngầm](#12-prisma-orm--tạo-order-với-transaction-ngầm)
13. [Utility Functions – formatCurrency, formatDate](#13-utility-functions--formatcurrency-formatdate)

---

## 1. Context API + Custom Hook (`useAuth`)

**📁 Vị trí:** `src/context/AuthContext.tsx`

### Giải thích
- **Context API** là cách React chia sẻ state toàn app **không cần prop drilling** (truyền props qua nhiều tầng component).
- **Pattern:** Tạo Context → Provider wrap toàn app → Component con dùng custom hook `useAuth()`.
- **Tại sao không dùng Redux?** App vừa phải, state đơn giản, Context đủ mạnh và ít boilerplate hơn.

### Code quan trọng

```tsx
// --- Định nghĩa kiểu dữ liệu ---
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

// --- Tạo Context với giá trị null ---
const AuthContext = createContext<AuthContextType | null>(null);

// --- Provider chứa toàn bộ logic ---
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,      // true để check session khi load lần đầu
    isAuthenticated: false,
  });

  // Khôi phục session khi reload trang
  useEffect(() => {
    const storedUser = sessionStorage.getItem('pos_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setState({ user, isLoading: false, isAuthenticated: true });
      } catch {
        sessionStorage.removeItem('pos_user');
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    } else {
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []); // [] = chỉ chạy 1 lần khi component mount

  // Hàm login gọi API
  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok && data.user) {
        sessionStorage.setItem('pos_user', JSON.stringify(data.user));
        setState({ user: data.user, isLoading: false, isAuthenticated: true });
        return { success: true };
      }
      return { success: false, error: data.error || 'Đăng nhập thất bại' };
    } catch {
      return { success: false, error: 'Lỗi mạng. Vui lòng thử lại.' };
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Custom Hook: ném lỗi nếu dùng ngoài Provider ---
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
```

### Điểm phỏng vấn cần nhớ
| Câu hỏi | Trả lời |
|---------|---------|
| Context API là gì? | Cơ chế chia sẻ state không cần prop drilling |
| Khi nào dùng Context vs Redux? | App nhỏ/vừa → Context; App lớn, state phức tạp → Redux/Zustand |
| sessionStorage vs localStorage? | session: mất khi đóng tab (bảo mật hơn); local: lưu lâu dài |
| Custom hook là gì? | Hàm bắt đầu bằng `use`, tái sử dụng logic có hook bên trong |

---

## 2. useReducer cho Cart Management

**📁 Vị trí:** `src/context/CartContext.tsx`

### Giải thích
- **useReducer** phù hợp khi state có nhiều thuộc tính liên quan và nhiều loại action.
- **Pattern:** `dispatch(action)` → `reducer(state, action)` → `newState`.
- Bất biến (immutability): không sửa trực tiếp state cũ, luôn return object mới.

### Code quan trọng

```tsx
// --- Định nghĩa tất cả action types (Union Type) ---
type CartAction =
  | { type: 'ADD_ITEM'; payload: MenuItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { itemId: string; quantity: number } }
  | { type: 'SET_TAX_RATE'; payload: number }
  | { type: 'CLEAR_CART' };

// --- Helper tính tổng tiền ---
const calculateTotals = (items: CartItem[], taxRate: number) => {
  const subtotal = items.reduce(
    (sum, item) => sum + item.menuItem.price * item.quantity,
    0
  );
  const tax = subtotal * taxRate;
  return { subtotal, tax, total: subtotal + tax };
};

// --- Pure Reducer Function ---
const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingIndex = state.items.findIndex(
        item => item.menuItem.id === action.payload.id
      );
      let newItems: CartItem[];
      if (existingIndex > -1) {
        // Đã có → tăng quantity (immutable update với map)
        newItems = state.items.map((item, i) =>
          i === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        // Chưa có → thêm mới (spread + item mới)
        newItems = [...state.items, { menuItem: action.payload, quantity: 1 }];
      }
      return { ...state, items: newItems, ...calculateTotals(newItems, state.taxRate) };
    }

    case 'SET_TAX_RATE': {
      const newTaxRate = action.payload / 100; // 8 → 0.08
      return { ...state, taxRate: newTaxRate, ...calculateTotals(state.items, newTaxRate) };
    }

    case 'CLEAR_CART':
      return { items: [], subtotal: 0, tax: 0, total: 0, taxRate: state.taxRate };
      // GIỮ LẠI taxRate vì đó là setting của nhà hàng

    default:
      return state;
  }
};

// --- Sử dụng trong Provider ---
const [state, dispatch] = useReducer(cartReducer, initialState);
const addItem = (item: MenuItem) => dispatch({ type: 'ADD_ITEM', payload: item });
```

### Điểm phỏng vấn cần nhớ
| Câu hỏi | Trả lời |
|---------|---------|
| useState vs useReducer? | useState cho state đơn giản; useReducer cho state phức tạp nhiều action |
| Pure function là gì? | Không có side effect, cùng input → cùng output, không đổi state cũ |
| Immutability là gì? | Không sửa trực tiếp state cũ; dùng spread `{...obj}` hoặc `[...arr]` |
| `reduce()` dùng để làm gì? | Biến đổi mảng thành một giá trị tích lũy (tổng, object...) |

---

## 3. useCallback + Promise.all – Fetch dữ liệu song song

**📁 Vị trí:** `src/app/(pos)/page.tsx` (dòng 59–138)

### Giải thích
- **`Promise.all`**: Gọi nhiều API **đồng thời**, chờ tất cả xong rồi mới xử lý. Nhanh hơn gọi tuần tự.
- **`useCallback`**: Memoize hàm để tránh tạo lại mỗi lần render (quan trọng khi hàm là dependency của `useEffect`).

### Code quan trọng

```tsx
// useCallback: chỉ tạo lại hàm khi dependency [setTaxRate] thay đổi
const fetchData = useCallback(async () => {
  try {
    // Promise.all: gọi 6 API cùng lúc thay vì tuần tự (nhanh hơn ~5x)
    const [catRes, menuRes, tableRes, custRes, orderRes, restRes] = await Promise.all([
      fetch('/api/categories'),
      fetch('/api/menu'),
      fetch('/api/tables'),
      fetch('/api/customers'),
      fetch('/api/orders'),
      fetch('/api/restaurants/settings'),
    ]);

    // Xử lý từng response sau khi tất cả đã xong
    if (catRes.ok) {
      const catData = await catRes.json();
      // Defensive check: luôn đảm bảo là array
      if (Array.isArray(catData.categories)) setCategories(catData.categories);
      else if (Array.isArray(catData)) setCategories(catData);
      else setCategories([]);
    }
    // ... xử lý tương tự cho các response khác
  } catch (error) {
    console.error('Failed to fetch data:', error);
  }
}, [setTaxRate]); // dependency array

// Chạy fetchData khi đã xác thực
useEffect(() => {
  if (!isLoading && !isAuthenticated) {
    router.push('/login');
  } else if (isAuthenticated) {
    fetchData();
  }
}, [isAuthenticated, isLoading, router, fetchData]);
```

### Điểm phỏng vấn cần nhớ
| Câu hỏi | Trả lời |
|---------|---------|
| Promise.all vs tuần tự? | `Promise.all` chạy song song, nhanh hơn; tuần tự chờ từng cái xong |
| Promise.all fail? | Nếu 1 promise reject → toàn bộ reject. Dùng `Promise.allSettled` nếu muốn xử lý riêng |
| useCallback dùng khi nào? | Khi hàm là dependency của useEffect hoặc được pass vào child component |
| useMemo vs useCallback? | `useMemo` cache giá trị; `useCallback` cache hàm |

---

## 4. Form Validation với Regex

**📁 Vị trí:** `src/app/booking/page.tsx` (dòng 6–119)

### Giải thích
- **Regex** (Regular Expression) kiểm tra format chuỗi theo pattern định sẵn.
- Validate client-side để UX tốt hơn (phản hồi ngay), NHƯNG vẫn cần validate server-side.
- **`useCallback`** memoize hàm validate vì nó phụ thuộc nhiều state.

### Code quan trọng

```tsx
// --- Regex patterns ---
const PHONE_REGEX = /^(?:\+?84|0)\d{9,10}$/;
// Giải thích:
// ^          = bắt đầu chuỗi
// (?:\+?84|0) = bắt đầu bằng +84, 84, hoặc 0
// \d{9,10}   = 9-10 chữ số tiếp theo
// $          = kết thúc chuỗi

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Giải thích: có text@domain.ext, không có khoảng trắng hay @

// --- Hàm validate tập trung ---
const validateBookingInfo = useCallback(() => {
  const normalizedName = customerName.trim();
  const normalizedPhone = customerPhone.trim().replace(/[\s.-]/g, ''); // Xóa space, dấu ./-
  const normalizedEmail = customerEmail.trim();

  // Check bắt buộc
  if (!normalizedName || !normalizedPhone || !reservationDate || !reservationTime) {
    return 'Vui lòng điền đầy đủ thông tin bắt buộc (*)';
  }

  // Check độ dài tên
  if (normalizedName.length < 2 || normalizedName.length > 80) {
    return 'Tên khách hàng phải từ 2 đến 80 ký tự';
  }

  // Check format số điện thoại
  if (!PHONE_REGEX.test(normalizedPhone)) {
    return 'Số điện thoại không hợp lệ';
  }

  // Check email chỉ khi có nhập (optional field)
  if (normalizedEmail && !EMAIL_REGEX.test(normalizedEmail)) {
    return 'Email không hợp lệ';
  }

  // Check thời gian đặt bàn ít nhất 10 phút từ giờ hiện tại
  const reservationDateTime = getReservationDateTime();
  const minTime = new Date(Date.now() + 10 * 60 * 1000);
  if (!reservationDateTime || reservationDateTime < minTime) {
    return 'Thời gian đặt bàn phải sau hiện tại ít nhất 10 phút';
  }

  return null; // null = không có lỗi
}, [customerName, customerPhone, customerEmail, reservationDate, reservationTime, guests, getReservationDateTime]);

// --- Sử dụng khi submit ---
const handleSubmit = async () => {
  const validationError = validateBookingInfo();
  if (validationError) {
    setError(validationError);
    return; // Dừng lại, không gọi API
  }
  // ... gọi API
};
```

### Điểm phỏng vấn cần nhớ
| Câu hỏi | Trả lời |
|---------|---------|
| Tại sao validate cả client lẫn server? | Client: UX nhanh; Server: bảo mật, không bỏ qua được |
| Regex `test()` vs `match()`? | `test()` trả về boolean; `match()` trả về array kết quả |
| `String.trim()` dùng để làm gì? | Xóa khoảng trắng đầu/cuối chuỗi |

---

## 5. Multi-step Form (Booking Flow)

**📁 Vị trí:** `src/app/booking/page.tsx`

### Giải thích
- **Multi-step form**: Chia form phức tạp thành nhiều bước để UX tốt hơn.
- Dùng **`useState`** với union type để quản lý bước hiện tại.
- Progress indicator hiển thị trực quan người dùng đang ở đâu.

### Code quan trọng

```tsx
// --- State quản lý bước ---
const [step, setStep] = useState<'info' | 'table' | 'menu' | 'confirm' | 'success'>('info');

// --- Progress Indicator ---
{step !== 'success' && (
  <div className="flex items-center justify-center gap-2">
    {['info', 'table', 'menu', 'confirm'].map((s, i) => (
      <div key={s} className="flex items-center gap-2">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
          step === s ? 'bg-orange-500 text-white scale-110' :        // Bước hiện tại
          ['info','table','menu','confirm'].indexOf(step) > i
            ? 'bg-green-500 text-white'                              // Bước đã qua
            : 'bg-gray-200 text-gray-500'                            // Bước chưa đến
        }`}>
          {['info','table','menu','confirm'].indexOf(step) > i ? '✓' : i + 1}
        </div>
        {i < 3 && <div className={`w-8 h-0.5 ${
          ['info','table','menu','confirm'].indexOf(step) > i ? 'bg-green-500' : 'bg-gray-200'
        }`} />}
      </div>
    ))}
  </div>
)}

// --- Conditional rendering từng bước ---
{step === 'info' && <CustomerInfoForm onNext={() => setStep('table')} />}
{step === 'table' && <TableSelection onNext={() => setStep('menu')} onBack={() => setStep('info')} />}
{step === 'menu' && <MenuSelection onNext={() => setStep('confirm')} />}
{step === 'confirm' && <ConfirmStep onSubmit={handleSubmit} />}
{step === 'success' && <SuccessScreen result={reservationResult} />}

// --- Đồng bộ state: bỏ chọn bàn nếu không đủ capacity ---
useEffect(() => {
  if (selectedTable && selectedTable.capacity < guests) {
    setSelectedTable(null); // Reset bàn đã chọn
  }
}, [guests, selectedTable]); // Chạy lại khi guests hoặc selectedTable thay đổi
```

### Điểm phỏng vấn cần nhớ
| Câu hỏi | Trả lời |
|---------|---------|
| Tại sao dùng multi-step form? | Giảm cognitive load, người dùng không bị overwhelmed |
| Conditional rendering là gì? | Hiển thị UI khác nhau dựa trên điều kiện (if/ternary/&&) |
| useEffect dependency là gì? | Mảng giá trị; khi một giá trị thay đổi, effect chạy lại |

---

## 6. Role-Based UI Rendering

**📁 Vị trí:** `src/app/(pos)/page.tsx` (dòng 357–407)

### Giải thích
- Dựa vào **role của user** (cashier, waiter, kitchen, owner, manager) để hiển thị UI khác nhau.
- Đây là **RBAC** (Role-Based Access Control) phía frontend.
- Kết hợp với backend middleware để bảo mật hoàn chỉnh.

### Code quan trọng

```tsx
// --- Xác định role từ user context ---
const isCashier = user?.role === 'cashier';
const isWaiter = user?.role === 'waiter';
const isKitchen = user?.role === 'kitchen';
const isOwnerOrManager = ['owner', 'manager'].includes(user?.role || '');

// --- Filter orders theo role ---
const cashierOrders = orders.filter(order =>
  order.status === 'served' && order.paymentStatus !== 'paid'
);
const waiterOrders = orders.filter(order =>
  ['pending', 'confirmed', 'preparing', 'ready', 'served'].includes(order.status)
);
const kitchenOrders = orders.filter(order =>
  ['pending', 'confirmed', 'preparing'].includes(order.status)
);

// --- Header thay đổi theo role ---
{isCashier && (
  <span className="text-sm bg-primary-700 px-3 py-1 rounded-full">
    💰 {cashierOrders.length} đơn chưa thanh toán
  </span>
)}
{isWaiter && (
  <span className="text-sm bg-primary-700 px-3 py-1 rounded-full">
    🍽️ {waiterOrders.length} đơn cần xử lý
  </span>
)}

// --- Nút Admin Panel chỉ hiện cho owner/manager ---
{isOwnerOrManager && (
  <a href="/admin" className="px-4 py-2 rounded-lg bg-primary-700">
    Admin Panel
  </a>
)}

// --- Cashier không có cart ---
{!isCashier && (
  <div className="w-96 bg-white shadow-lg flex flex-col">
    {/* Cart section */}
  </div>
)}
```

### Điểm phỏng vấn cần nhớ
| Câu hỏi | Trả lời |
|---------|---------|
| RBAC là gì? | Role-Based Access Control: phân quyền dựa trên vai trò |
| Tại sao cần cả FE lẫn BE kiểm tra quyền? | FE: UX (ẩn nút không phù hợp); BE: bảo mật thực sự |
| Optional chaining `?.` dùng để làm gì? | Truy cập property an toàn, không throw lỗi nếu null/undefined |

---

## 7. Auto-Refresh với setInterval + useEffect Cleanup

**📁 Vị trí:** `src/app/(pos)/page.tsx` (dòng 149–179)

### Giải thích
- Tự động cập nhật dữ liệu mỗi 30 giây để theo dõi đơn hàng real-time (không dùng WebSocket).
- **Cleanup function** trong useEffect ngăn memory leak khi component unmount.

### Code quan trọng

```tsx
useEffect(() => {
  if (!isAuthenticated) return; // Không chạy nếu chưa đăng nhập

  const interval = setInterval(async () => {
    try {
      // Fetch tax rate mới nhất
      const restRes = await fetch('/api/restaurants/settings');
      if (restRes.ok) {
        const restData = await restRes.json();
        if (restData.taxRate) setTaxRate(restData.taxRate);
      }

      // Fetch danh sách khách hàng mới nhất
      const custRes = await fetch('/api/customers');
      if (custRes.ok) {
        const custData = await custRes.json();
        if (Array.isArray(custData.customers)) setCustomers(custData.customers);
        else if (Array.isArray(custData)) setCustomers(custData);
      }
    } catch (error) {
      console.error('Failed to auto-refresh data:', error);
    }
  }, 30000); // Mỗi 30 giây

  // CLEANUP FUNCTION: chạy khi component unmount hoặc dependency thay đổi
  // Nếu không có cleanup → interval chạy mãi → memory leak!
  return () => clearInterval(interval);

}, [isAuthenticated, setTaxRate]); // Chạy lại khi isAuthenticated thay đổi
```

### Điểm phỏng vấn cần nhớ
| Câu hỏi | Trả lời |
|---------|---------|
| Memory leak trong React là gì? | Component unmount nhưng vẫn còn timer/subscription đang chạy |
| Cleanup function trong useEffect? | Hàm return từ useEffect, chạy khi component unmount hoặc effect re-run |
| setInterval vs setTimeout? | `setInterval`: lặp lại; `setTimeout`: chạy 1 lần sau delay |
| Tại sao không dùng WebSocket? | Đơn giản hơn, đủ dùng cho app; WebSocket phức tạp hơn nhưng real-time hơn |

---

## 8. Custom JWT (Không dùng thư viện ngoài)

**📁 Vị trí:** `src/lib/middleware/auth.ts`

### Giải thích
- **JWT** (JSON Web Token) = Header.Payload.Signature (3 phần, ngăn cách bởi `.`).
- Dự án tự implement JWT bằng Node.js `crypto` module thay vì dùng `jsonwebtoken` package.
- **HMAC SHA256** ký header+payload, đảm bảo không bị giả mạo.

### Code quan trọng

```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key';

// --- Tạo JWT Token ---
export function signJWT(payload: { id: string; email: string; role: string }): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + 86400 }; // hết hạn 24h

  // Base64URL encode (không dùng padding =)
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

  // HMAC SHA256: ký chuỗi "header.payload" bằng secret key
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  return `${headerB64}.${payloadB64}.${signature}`;
  // Kết quả: "eyJ...".  "eyJ...". "abc123..."
}

// --- Xác thực JWT Token ---
export function verifyJWT(token: string): JWTPayload | null {
  try {
    const [headerB64, payloadB64, signature] = token.split('.');
    if (!headerB64 || !payloadB64 || !signature) return null;

    // Tạo lại chữ ký từ header+payload
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    // So sánh timing-safe (chống timing attack)
    if (signature.length !== expectedSig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

    // Kiểm tra hết hạn
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}
```

### Điểm phỏng vấn cần nhớ
| Câu hỏi | Trả lời |
|---------|---------|
| JWT gồm mấy phần? | 3 phần: Header (thuật toán), Payload (data), Signature (chữ ký) |
| JWT có mã hóa không? | Không! Base64URL chỉ encode, không encrypt. Ai cũng đọc được payload |
| Timing attack là gì? | So sánh chuỗi ký tự bình thường có thể bị đo thời gian → dùng `timingSafeEqual` |
| JWT vs Session? | JWT: stateless, không cần DB; Session: stateful, lưu server |

---

## 9. Middleware Authentication & Authorization

**📁 Vị trí:** `src/lib/middleware/auth.ts` + `src/app/api/orders/route.ts`

### Giải thích
- **Authentication**: Xác thực danh tính (ai là bạn?).
- **Authorization**: Phân quyền (bạn được làm gì?).
- Pattern: Mỗi API route gọi `authenticateRequest()` → `authorizeRoles()` trước khi xử lý.

### Code quan trọng

```typescript
// --- Hàm authenticate: trả về user hoặc Response 401 ---
export function authenticateRequest(req: NextRequest): JWTPayload | NextResponse {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Chưa đăng nhập. Vui lòng đăng nhập lại.' },
      { status: 401 }
    );
  }
  return user;
}

// --- Hàm authorize: kiểm tra role ---
export function authorizeRoles(user: JWTPayload, allowedRoles: string[]): NextResponse | null {
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: 'Không có quyền thực hiện thao tác này' },
      { status: 403 }
    );
  }
  return null; // null = được phép
}

// --- Dùng trong API route ---
export async function POST(request: NextRequest) {
  // Step 1: Xác thực - phải đăng nhập
  const authUser = authenticateRequest(request);
  if (authUser instanceof NextResponse) return authUser; // 401

  // Step 2: Phân quyền - chỉ waiter/manager/owner mới tạo được order
  const roleCheck = authorizeRoles(authUser, ['owner', 'manager', 'waiter']);
  if (roleCheck) return roleCheck; // 403

  // Step 3: Xử lý business logic
  const body = await request.json();
  const order = await OrderService.createOrder(body);
  return NextResponse.json({ order }, { status: 201 });
}

// --- Role hierarchy ---
export const ROLE_LEVELS: Record<string, number> = {
  owner: 100,
  manager: 50,
  waiter: 35,
  kitchen: 30,
  cashier: 25,
};
```

### Điểm phỏng vấn cần nhớ
| Câu hỏi | Trả lời |
|---------|---------|
| 401 vs 403? | 401: Chưa đăng nhập (Unauthorized); 403: Không có quyền (Forbidden) |
| Middleware là gì? | Hàm chạy giữa request và response, dùng để xác thực, log, transform |
| httpOnly cookie là gì? | Cookie không đọc được bằng JavaScript (chống XSS) |

---

## 10. Service Layer Pattern (Backend)

**📁 Vị trí:** `src/lib/services/order.service.ts`

### Giải thích
- **Service Layer** tách biệt business logic ra khỏi API route handlers.
- Route handler chỉ lo parse request, gọi service, format response.
- Service lo toàn bộ logic: validate, tính toán, giao tiếp DB.
- **Lợi ích:** Dễ test, dễ reuse, dễ maintain.

### Code quan trọng

```typescript
// --- API Route (mỏng) ---
export async function POST(request: NextRequest) {
  const authUser = authenticateRequest(request);
  if (authUser instanceof NextResponse) return authUser;
  const body = await request.json();
  const order = await OrderService.createOrder(body); // Gọi service
  return NextResponse.json({ order }, { status: 201 });
}

// --- Service (dày, chứa logic) ---
export async function createOrder(input: CreateOrderInput) {
  const { items, tableId, customerId } = input;

  // Validate
  if (!items || items.length === 0) throw new Error('Order phải có ít nhất 1 món');

  // Tạo order number tự tăng
  const lastOrder = await prisma.order.findFirst({ orderBy: { orderNumber: 'desc' } });
  const orderNumber = (lastOrder?.orderNumber || 0) + 1;

  // Tính toán giá cho từng item
  let subtotal = 0;
  const orderItems = [];
  for (const item of items) {
    const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
    if (!menuItem) throw new Error(`Món ${item.menuItemId} không tồn tại`);
    const itemTotal = menuItem.price * item.quantity;
    subtotal += itemTotal;
    orderItems.push({ menuItemId: menuItem.id, quantity: item.quantity, unitPrice: menuItem.price, totalPrice: itemTotal });
  }

  // Lấy tax rate từ DB (source of truth)
  const restaurant = await prisma.restaurant.findUnique({ where: { id: 'default' } });
  const taxRate = (restaurant?.taxRate ?? 0) / 100;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  // Tạo order trong DB (Prisma nested create)
  const order = await prisma.order.create({
    data: {
      orderNumber,
      subtotal,
      tax,
      total,
      status: 'pending',
      tableId: tableId || null,
      customerId: customerId || null,
      items: { create: orderItems }, // Nested create: tạo order + items cùng lúc
    },
    include: { items: true, table: true, customer: true },
  });

  // Side effect: cập nhật trạng thái bàn
  if (tableId) {
    await prisma.table.update({ where: { id: tableId }, data: { status: 'occupied' } });
  }

  return order;
}
```

### Điểm phỏng vấn cần nhớ
| Câu hỏi | Trả lời |
|---------|---------|
| Service layer tại sao tốt? | Separation of Concerns; dễ test và reuse; route gọn hơn |
| Prisma là gì? | ORM cho TypeScript/Node.js, giúp tương tác DB với type-safe |
| Nested create trong Prisma? | Tạo record cha và con cùng 1 query (`items: { create: [...] }`) |

---

## 11. VNPay Integration – Thanh Toán Online

**📁 Vị trí:** `src/lib/vnpay.ts`

### Giải thích
- **VNPay** là cổng thanh toán điện tử phổ biến tại Việt Nam.
- Bảo mật bằng **HMAC SHA512**: ký toàn bộ params để đảm bảo không bị giả mạo giữa đường.
- Params phải **sắp xếp theo alphabet** trước khi ký.

### Code quan trọng

```typescript
// --- Sắp xếp và encode params theo chuẩn VNPay ---
export function sortObject(obj: Record<string, string | number>): Record<string, string> {
  const sorted: Record<string, string> = {};
  const keys = Object.keys(obj).map(k => encodeURIComponent(k)).sort(); // Sort keys

  for (const key of keys) {
    const originalKey = decodeURIComponent(key);
    // Encode value và thay %20 thành + (chuẩn VNPay)
    sorted[key] = encodeURIComponent(String(obj[originalKey])).replace(/%20/g, '+');
  }
  return sorted;
}

// --- Xác thực chữ ký từ VNPay callback ---
export function verifyVNPaySignature(params: Record<string, string>, secureHash: string): boolean {
  // Bước 1: Tách chữ ký ra khỏi params
  const vnpParams = { ...params };
  delete vnpParams['vnp_SecureHash'];
  delete vnpParams['vnp_SecureHashType'];

  // Bước 2: Sắp xếp và tạo query string
  const sortedParams = sortObject(vnpParams);
  const signData = querystring.stringify(sortedParams, { encode: false });

  // Bước 3: Tạo chữ ký HMAC SHA512
  const hmac = crypto.createHmac('sha512', VNP_HASH_SECRET);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  // Bước 4: So sánh chữ ký
  return secureHash === signed;
}

// Mã lỗi VNPay
export function getVNPayErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    '00': 'Giao dịch thành công',
    '24': 'Khách hàng hủy giao dịch',
    '51': 'Tài khoản không đủ số dư',
    // ...
  };
  return messages[code] || `Lỗi không xác định (Mã: ${code})`;
}
```

### Điểm phỏng vấn cần nhớ
| Câu hỏi | Trả lời |
|---------|---------|
| HMAC là gì? | Hash-based Message Authentication Code: tạo chữ ký bằng secret key |
| Tại sao phải sort params? | Chữ ký phụ thuộc vào thứ tự; nếu sai thứ tự → sai chữ ký |
| IPN là gì? | Instant Payment Notification: VNPay gọi về server để xác nhận giao dịch |

---

## 12. Prisma ORM – Tạo Order với Transaction ngầm

**📁 Vị trí:** `src/lib/services/order.service.ts`

### Giải thích
- **Prisma** là ORM type-safe cho TypeScript, giúp tương tác database dễ hơn SQL thuần.
- **Nested create** tạo nhiều bản ghi liên quan trong 1 query.
- **`include`** để JOIN bảng liên quan (eager loading).

### Code quan trọng

```typescript
// --- Tạo Order kèm OrderItems trong 1 lần ---
const order = await prisma.order.create({
  data: {
    id: 'order-' + Date.now().toString(36),
    orderNumber: nextNumber,
    subtotal: 150000,
    tax: 12000,
    total: 162000,
    status: 'pending',
    paymentStatus: 'unpaid',
    tableId: 'table-01',
    // Nested create: tạo OrderItem records liên kết với Order này
    items: {
      create: [
        { id: 'item-1', menuItemId: 'menu-001', quantity: 2, unitPrice: 50000, totalPrice: 100000 },
        { id: 'item-2', menuItemId: 'menu-002', quantity: 1, unitPrice: 50000, totalPrice: 50000 },
      ],
    },
  },
  // include: JOIN để lấy thêm thông tin liên quan
  include: {
    items: {
      select: { id: true, menuItemName: true, quantity: true, unitPrice: true }
    },
    table: {
      select: { id: true, number: true }
    },
    customer: {
      select: { id: true, name: true, phone: true }
    },
  },
});

// --- Query với filter ---
const orders = await prisma.order.findMany({
  where: {
    status: 'preparing',
    createdAt: { gte: startOfToday },  // Greater than or equal
  },
  orderBy: { createdAt: 'desc' },
  include: { table: true },
});

// --- Update ---
await prisma.table.update({
  where: { id: tableId },
  data: { status: 'occupied' },
});
```

### Điểm phỏng vấn cần nhớ
| Câu hỏi | Trả lời |
|---------|---------|
| ORM là gì? | Object-Relational Mapping: ánh xạ bảng DB thành object code |
| Prisma `include` vs `select`? | `include`: lấy cả object liên quan; `select`: chọn field cụ thể |
| N+1 query problem? | Lấy N records + N queries con → dùng `include` để JOIN 1 lần |

---

## 13. Utility Functions – formatCurrency, formatDate

**📁 Vị trí:** `src/lib/utils.ts`

### Giải thích
- **`Intl.NumberFormat`** và **`Intl.DateTimeFormat`** là Web API chuẩn để định dạng theo locale.
- Dùng locale `vi-VN` để định dạng theo chuẩn Việt Nam.
- Utility functions không có side effect → dễ test, dễ reuse.

### Code quan trọng

```typescript
// --- Định dạng tiền VND ---
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',   // Định dạng tiền tệ
    currency: 'VND',     // Việt Nam Đồng
  }).format(amount);
  // Input: 150000  →  Output: "150.000 ₫"
}

// --- Định dạng ngày giờ tiếng Việt ---
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  // Output: "5 thg 5, 2026, 10:30"
}

// --- Định dạng mã đơn: 0001, 0042, 9999, 10000 ---
export function formatOrderNumber(num: number): string {
  if (num < 10000) {
    return num.toString().padStart(4, '0'); // 42 → "0042"
  }
  return num.toString(); // 10000 → "10000"
}

// --- Tạo ID ngẫu nhiên (crypto-safe) ---
export function generateId(): string {
  return randomBytes(12).toString('hex'); // 24 ký tự hex
}

// --- Class name helper ---
export function cn(...inputs: string[]) {
  return inputs.filter(Boolean).join(' ');
  // cn('btn', isActive && 'btn-active', '') → "btn btn-active"
}
```

### Điểm phỏng vấn cần nhớ
| Câu hỏi | Trả lời |
|---------|---------|
| `Intl` API là gì? | Web API chuẩn để i18n: format số, ngày, tiền theo locale |
| `padStart()` dùng làm gì? | Đệm ký tự vào đầu chuỗi cho đủ độ dài: `'42'.padStart(4, '0')` → `'0042'` |
| `filter(Boolean)` là gì? | Loại bỏ falsy values (null, undefined, '', 0, false) khỏi mảng |

---

## 🎯 Tóm Tắt Nhanh Cho Phỏng Vấn

| Chức năng | Pattern | File |
|-----------|---------|------|
| Auth State | Context API + useContext | `src/context/AuthContext.tsx` |
| Cart Management | useReducer + Context | `src/context/CartContext.tsx` |
| Fetch dữ liệu | useCallback + Promise.all | `src/app/(pos)/page.tsx` |
| Form Validation | Regex + useCallback | `src/app/booking/page.tsx` |
| Multi-step Form | useState union type | `src/app/booking/page.tsx` |
| Role-based UI | Conditional rendering | `src/app/(pos)/page.tsx` |
| Auto-refresh | setInterval + cleanup | `src/app/(pos)/page.tsx` |
| JWT tự làm | HMAC SHA256 + Base64URL | `src/lib/middleware/auth.ts` |
| API Middleware | authenticate → authorize | `src/lib/middleware/auth.ts` |
| Service Layer | Tách route và logic | `src/lib/services/order.service.ts` |
| VNPay | HMAC SHA512 + sortObject | `src/lib/vnpay.ts` |
| Prisma ORM | Nested create + include | `src/lib/services/order.service.ts` |
| Utility | Intl API + pure functions | `src/lib/utils.ts` |

---

## 💡 Câu Hỏi Phỏng Vấn Hay Gặp

**Q: Dự án này dùng state management gì?**
> Context API (useContext + useState cho Auth; useReducer + Context cho Cart). Không dùng Redux vì app vừa phải.

**Q: Giải thích React hooks lifecycle?**
> - `useState`: lưu state, re-render khi thay đổi
> - `useEffect`: side effects (fetch, timer, DOM manipulation); cleanup khi unmount
> - `useCallback`: memoize hàm; `useMemo`: memoize giá trị
> - `useRef`: giữ giá trị không gây re-render (DOM ref, timer ID)

**Q: Tại sao dùng TypeScript?**
> Type safety: catch lỗi lúc compile thay vì runtime; IDE autocomplete tốt hơn; code tự document.

**Q: Next.js App Router là gì?**
> File-system routing: folder = route (`/app/admin/menu` → `/admin/menu`); `page.tsx` = trang; `route.ts` = API endpoint. Server Components mặc định, thêm `'use client'` để dùng hooks.

**Q: Dự án bảo mật như thế nào?**
> - JWT httpOnly cookie (chống XSS)
> - bcrypt hash password
> - Middleware authenticate + authorize mỗi API
> - sessionStorage (mất khi đóng tab)
> - HMAC SHA512 cho VNPay (chống giả mạo)
> - timingSafeEqual (chống timing attack)
