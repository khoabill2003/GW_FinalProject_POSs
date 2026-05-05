# 📚 Hướng dẫn phỏng vấn – Các chức năng quan trọng trong dự án POS

> Tài liệu này liệt kê các function/pattern quan trọng nhất trong dự án, kèm code thực tế, giải thích chi tiết và vị trí file để bạn học và chuẩn bị phỏng vấn.

---

## Mục lục

1. [Context API + Custom Hooks (useAuth)](#1-context-api--custom-hooks-useauth)
2. [useReducer cho State phức tạp (CartContext)](#2-usereducer-cho-state-phức-tạp-cartcontext)
3. [useCallback + Promise.all – Fetch nhiều API song song](#3-usecallback--promiseall--fetch-nhiều-api-song-song)
4. [setInterval + clearInterval – Auto-refresh dữ liệu](#4-setinterval--clearinterval--auto-refresh-dữ-liệu)
5. [Computed / Filtered State – Lọc dữ liệu hiển thị](#5-computed--filtered-state--lọc-dữ-liệu-hiển-thị)
6. [Multi-step Form với State Machine](#6-multi-step-form-với-state-machine)
7. [Form Validation với useCallback](#7-form-validation-với-usecallback)
8. [FileReader API – Upload & Preview ảnh](#8-filereader-api--upload--preview-ảnh)
9. [CRUD Modal Pattern](#9-crud-modal-pattern)
10. [Intl API – Format tiền tệ và ngày giờ](#10-intl-api--format-tiền-tệ-và-ngày-giờ)
11. [JWT tự viết (signJWT / verifyJWT)](#11-jwt-tự-viết-signjwt--verifyjwt)
12. [Role-based Authorization](#12-role-based-authorization)
13. [VNPay Integration – HMAC SHA512](#13-vnpay-integration--hmac-sha512)
14. [API Route với Middleware Pattern (Next.js)](#14-api-route-với-middleware-pattern-nextjs)

---

## 1. Context API + Custom Hooks (useAuth)

**📁 File:** `src/context/AuthContext.tsx`

### Giải thích

React Context API cho phép chia sẻ state giữa các component mà không cần truyền props qua nhiều cấp (prop drilling). Pattern phổ biến là tạo một Provider bọc toàn bộ app, các component con dùng custom hook để truy cập.

### Code chính

```tsx
// 1. Tạo Context với giá trị mặc định null
const AuthContext = createContext<AuthContextType | null>(null);

// 2. Provider – bọc toàn app trong layout.tsx
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,   // true ban đầu để check session
    isAuthenticated: false,
  });

  // Khôi phục session khi reload trang (chạy 1 lần khi mount)
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
  }, []); // deps rỗng = chỉ chạy 1 lần

  // Hàm login gọi API, lưu session nếu thành công
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

  const logout = () => {
    sessionStorage.removeItem('pos_user');
    setState({ user: null, isLoading: false, isAuthenticated: false });
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Custom Hook – component dùng hook này thay vì useContext trực tiếp
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### Câu hỏi phỏng vấn thường gặp

- **Tại sao dùng Context thay vì Redux?** → Dự án nhỏ/vừa, state không quá phức tạp, tránh boilerplate, Context là built-in của React.
- **sessionStorage vs localStorage?** → sessionStorage mất khi đóng tab (bảo mật hơn), localStorage tồn tại lâu dài.
- **Tại sao `isLoading` bắt đầu là `true`?** → Tránh flash màn hình login khi reload trang, chờ check session xong mới render.
- **Tại sao throw error trong custom hook?** → Giúp phát hiện lỗi sớm khi component nằm ngoài Provider.

---

## 2. useReducer cho State phức tạp (CartContext)

**📁 File:** `src/context/CartContext.tsx`

### Giải thích

`useReducer` phù hợp khi state có nhiều properties liên quan và nhiều loại action. Giống Redux nhưng built-in, không cần thư viện ngoài. Pattern: **dispatch action → reducer xử lý → state mới → re-render**.

### Code chính

```tsx
// Định nghĩa các action types bằng TypeScript Union Type
type CartAction =
  | { type: 'ADD_ITEM'; payload: MenuItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { itemId: string; quantity: number } }
  | { type: 'SET_TAX_RATE'; payload: number }
  | { type: 'CLEAR_CART' };

// Helper function tính tổng tiền (pure function)
const calculateTotals = (items: CartItem[], taxRate: number) => {
  const subtotal = items.reduce(
    (sum, item) => sum + item.menuItem.price * item.quantity,
    0
  );
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  return { subtotal, tax, total };
};

// Reducer – pure function: (state, action) => newState
const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingIndex = state.items.findIndex(
        item => item.menuItem.id === action.payload.id
      );
      let newItems: CartItem[];
      if (existingIndex > -1) {
        // Đã có: tăng quantity (immutable update với map)
        newItems = state.items.map((item, i) =>
          i === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        // Chưa có: thêm mới (spread array)
        newItems = [...state.items, { menuItem: action.payload, quantity: 1 }];
      }
      return { ...state, items: newItems, ...calculateTotals(newItems, state.taxRate) };
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.menuItem.id !== action.payload);
      return { ...state, items: newItems, ...calculateTotals(newItems, state.taxRate) };
    }

    case 'UPDATE_QUANTITY': {
      const newItems = state.items
        .map(item =>
          item.menuItem.id === action.payload.itemId
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
        .filter(item => item.quantity > 0); // Tự xóa khi qty = 0
      return { ...state, items: newItems, ...calculateTotals(newItems, state.taxRate) };
    }

    case 'SET_TAX_RATE': {
      const newTaxRate = action.payload / 100; // 8% -> 0.08
      return { ...state, taxRate: newTaxRate, ...calculateTotals(state.items, newTaxRate) };
    }

    case 'CLEAR_CART':
      // GIỮ LẠI taxRate, chỉ xóa items
      return { items: [], subtotal: 0, tax: 0, total: 0, taxRate: state.taxRate };

    default:
      return state;
  }
};

// Provider dùng useReducer
export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [], subtotal: 0, tax: 0, total: 0, taxRate: 0,
  });

  // Persist giỏ hàng vào sessionStorage khi items thay đổi
  useEffect(() => {
    sessionStorage.setItem('pos_cart', JSON.stringify(state.items));
  }, [state.items]);

  // Helper methods để component không cần biết về dispatch
  const addItem = (item: MenuItem) => dispatch({ type: 'ADD_ITEM', payload: item });
  const removeItem = (id: string) => dispatch({ type: 'REMOVE_ITEM', payload: id });
  const clearCart = () => dispatch({ type: 'CLEAR_CART' });

  return (
    <CartContext.Provider value={{ state, dispatch, addItem, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};
```

### Câu hỏi phỏng vấn thường gặp

- **Khi nào dùng `useReducer` thay `useState`?** → Khi state phức tạp có nhiều properties liên quan, nhiều loại actions, logic cần tập trung 1 chỗ.
- **Immutability trong reducer là gì?** → Không thay đổi state trực tiếp (`state.items.push(...)` là sai), phải return object/array mới.
- **Tại sao dùng `...spread` operator?** → Để tạo bản copy mới thay vì mutate trực tiếp, giúp React detect được sự thay đổi.

---

## 3. useCallback + Promise.all – Fetch nhiều API song song

**📁 File:** `src/app/(pos)/page.tsx` (hàm `fetchData`)

### Giải thích

`Promise.all` chạy nhiều Promise song song thay vì tuần tự, giảm thời gian chờ đợi. `useCallback` memoize hàm để tránh tạo function reference mới mỗi lần re-render (quan trọng khi dùng trong `useEffect` dependency array).

### Code chính

```tsx
// useCallback: deps array xác định khi nào tạo lại hàm
const fetchData = useCallback(async () => {
  try {
    // Promise.all: 6 request chạy SONG SONG, không tuần tự
    // Nếu tuần tự: ~600ms, song song: ~100ms (nếu mỗi req 100ms)
    const [catRes, menuRes, tableRes, custRes, orderRes, restRes] = await Promise.all([
      fetch('/api/categories'),
      fetch('/api/menu'),
      fetch('/api/tables'),
      fetch('/api/customers'),
      fetch('/api/orders'),
      fetch('/api/restaurants/settings'),
    ]);

    if (catRes.ok) {
      const data = await catRes.json();
      // Defensive coding: xử lý nhiều format response
      if (Array.isArray(data.categories)) setCategories(data.categories);
      else if (Array.isArray(data)) setCategories(data);
      else setCategories([]);
    }

    if (restRes.ok) {
      const restData = await restRes.json();
      setRestaurant({
        name: restData.restaurantName || 'Nhà hàng',
        taxRate: restData.taxRate ?? 8.0, // nullish coalescing
      });
      if (restData.taxRate != null) setTaxRate(restData.taxRate);
    }
  } catch (error) {
    console.error('Failed to fetch data:', error);
  }
}, [setTaxRate]); // deps: chỉ tạo lại khi setTaxRate thay đổi

// useEffect gọi fetchData sau khi auth được xác nhận
useEffect(() => {
  if (!isLoading && !isAuthenticated) {
    router.push('/login');
  } else if (isAuthenticated) {
    fetchData();
  }
}, [isAuthenticated, isLoading, router, fetchData]);
```

### Câu hỏi phỏng vấn thường gặp

- **Promise.all vs Promise.allSettled?** → `Promise.all` reject ngay khi 1 cái fail. `Promise.allSettled` chờ tất cả hoàn thành, trả về status của từng cái.
- **Tại sao cần useCallback?** → Nếu không dùng, `fetchData` tạo function mới mỗi render → `useEffect` chạy lại vô hạn.
- **`??` (nullish coalescing) khác `||` thế nào?** → `??` chỉ fallback khi `null`/`undefined`, còn `||` fallback khi falsy (kể cả `0`, `''`).

---

## 4. setInterval + clearInterval – Auto-refresh dữ liệu

**📁 File:** `src/app/(pos)/page.tsx`

### Giải thích

Pattern auto-refresh dữ liệu mà không cần user reload trang. Quan trọng: phải cleanup interval trong return của `useEffect` để tránh memory leak khi component unmount.

### Code chính

```tsx
useEffect(() => {
  if (!isAuthenticated) return; // Guard clause: không chạy khi chưa đăng nhập

  const interval = setInterval(async () => {
    try {
      // Fetch dữ liệu mới mỗi 30 giây
      const restRes = await fetch('/api/restaurants/settings');
      if (restRes.ok) {
        const restData = await restRes.json();
        if (restData.taxRate) setTaxRate(restData.taxRate);
      }
    } catch (error) {
      console.error('Failed to auto-refresh data:', error);
    }
  }, 30000); // 30 giây

  // CLEANUP: xóa interval khi component unmount hoặc deps thay đổi
  // Nếu không có return này → memory leak!
  return () => clearInterval(interval);
}, [isAuthenticated, setTaxRate]);
```

### Câu hỏi phỏng vấn thường gặp

- **Tại sao cần cleanup function trong useEffect?** → Tránh memory leak, tránh update state của component đã unmount (gây lỗi React warning).
- **Ngoài clearInterval còn cleanup gì khác?** → `clearTimeout`, hủy WebSocket, hủy fetch với `AbortController`, remove event listener.
- **Polling vs WebSocket?** → Polling đơn giản hơn nhưng tốn bandwidth. WebSocket realtime hơn nhưng cần server hỗ trợ.

---

## 5. Computed / Filtered State – Lọc dữ liệu hiển thị

**📁 File:** `src/app/(pos)/page.tsx`, `src/app/booking/page.tsx`

### Giải thích

Thay vì lưu dữ liệu đã filter vào state riêng (dễ bị out-of-sync), tính toán trực tiếp trong render từ state gốc. React tự tối ưu khi dùng với `useMemo` nếu cần.

### Code chính

```tsx
// Lọc menu items theo category được chọn + trạng thái available
const filteredItems = menuItems.filter(item => {
  if (!item.available) return false;
  if (selectedCategory && item.categoryId !== selectedCategory) return false;
  return true;
});

// Lọc khách hàng theo search text (name hoặc phone)
const filteredCustomers = customers.filter(c =>
  (c.name?.toLowerCase() || '').includes(searchCustomer.toLowerCase()) ||
  c.phone?.includes(searchCustomer)
);

// Lọc bàn available có đủ chỗ cho số khách
const availableTables = tables.filter(t =>
  t.status === 'available' && t.capacity >= guests
);

// Tính tổng tiền giỏ hàng (derived value từ array)
const cartTotal = cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0);
```

### Câu hỏi phỏng vấn thường gặp

- **Khi nào dùng `useMemo` để memoize computed value?** → Khi computation nặng (sort, filter list lớn) và render thường xuyên. Với list nhỏ không cần thiết.
- **`Array.filter` vs `Array.find`?** → `filter` trả về array (nhiều kết quả), `find` trả về phần tử đầu tiên match (1 kết quả).
- **Optional chaining `?.`?** → `c.name?.toLowerCase()` trả về `undefined` thay vì throw error nếu `name` là `null`/`undefined`.

---

## 6. Multi-step Form với State Machine

**📁 File:** `src/app/booking/page.tsx`

### Giải thích

Form nhiều bước dùng state để track bước hiện tại, thay vì nhiều component. Pattern "state machine" đơn giản: định nghĩa các trạng thái hợp lệ và các chuyển đổi giữa chúng.

### Code chính

```tsx
// Định nghĩa các bước hợp lệ (type-safe với TypeScript)
const [step, setStep] = useState<'info' | 'table' | 'menu' | 'confirm' | 'success'>('info');

// Chuyển bước có validation
const handleNextStep = () => {
  const err = validateBookingInfo();
  if (err) { setError(err); return; }
  setError('');
  setStep('table');
};

// Render có điều kiện theo bước hiện tại
return (
  <div>
    {/* Progress bar – highlight bước hiện tại */}
    {step !== 'success' && (
      <div className="flex items-center">
        {['info', 'table', 'menu', 'confirm'].map((s, i) => (
          <div
            key={s}
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              step === s ? 'bg-orange-500 text-white scale-110' :    // Bước hiện tại
              ['info', 'table', 'menu', 'confirm'].indexOf(step) > i
                ? 'bg-green-500 text-white'                          // Bước đã hoàn thành
                : 'bg-gray-200 text-gray-500'                        // Bước chưa tới
            }`}
          >
            {i + 1}
          </div>
        ))}
      </div>
    )}

    {step === 'info' && <StepInfo onNext={handleNextStep} />}
    {step === 'table' && <StepTable onNext={() => setStep('menu')} />}
    {step === 'menu' && <StepMenu onNext={() => setStep('confirm')} />}
    {step === 'confirm' && <StepConfirm onSubmit={handleSubmit} />}
    {step === 'success' && <SuccessScreen result={reservationResult} />}
  </div>
);
```

### Câu hỏi phỏng vấn thường gặp

- **Tại sao không dùng nhiều boolean flag (`showStep1`, `showStep2`...)?** → Dễ xảy ra trạng thái không hợp lệ (ví dụ cả 2 cùng true). Union type đảm bảo chỉ 1 giá trị tại 1 thời điểm.
- **State machine là gì?** → Hệ thống có số trạng thái hữu hạn, tại mỗi thời điểm chỉ ở 1 trạng thái, chuyển đổi theo event/action xác định.
- **Cách tối ưu hóa re-render trong multi-step form?** → Chia thành các component con riêng lẻ, chỉ render component của bước hiện tại.

---

## 7. Form Validation với useCallback

**📁 File:** `src/app/booking/page.tsx` (hàm `validateBookingInfo`)

### Giải thích

Hàm validation trả về string lỗi (hoặc `null` nếu hợp lệ). Dùng `useCallback` vì hàm này được gọi trong `useEffect` và là dependency. Regex để validate phone/email.

### Code chính

```tsx
// Regex validate phone Việt Nam (VD: 0912345678, +84912345678)
const PHONE_REGEX = /^(?:\+?84|0)\d{9,10}$/;
// Regex validate email cơ bản
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateBookingInfo = useCallback(() => {
  // Normalize input (trim whitespace, chuẩn hóa phone)
  const normalizedName = customerName.trim();
  const normalizedPhone = customerPhone.trim().replace(/[\s.-]/g, ''); // Xóa dấu cách, chấm, gạch ngang
  const normalizedEmail = customerEmail.trim();

  // Kiểm tra field bắt buộc
  if (!normalizedName || !normalizedPhone || !reservationDate || !reservationTime) {
    return 'Vui lòng điền đầy đủ thông tin bắt buộc (*)';
  }

  // Kiểm tra độ dài
  if (normalizedName.length < 2 || normalizedName.length > 80) {
    return 'Tên khách hàng phải từ 2 đến 80 ký tự';
  }

  // Kiểm tra format phone
  if (!PHONE_REGEX.test(normalizedPhone)) {
    return 'Số điện thoại không hợp lệ';
  }

  // Kiểm tra email (chỉ khi có nhập)
  if (normalizedEmail && !EMAIL_REGEX.test(normalizedEmail)) {
    return 'Email không hợp lệ';
  }

  // Kiểm tra số nguyên hợp lệ
  if (!Number.isInteger(guests) || guests < 1 || guests > 50) {
    return 'Số khách phải là số nguyên từ 1 đến 50';
  }

  // Kiểm tra thời gian: phải sau hiện tại ít nhất 10 phút
  const reservationDateTime = getReservationDateTime();
  if (!reservationDateTime) return 'Ngày giờ đặt bàn không hợp lệ';
  const minTime = new Date(Date.now() + 10 * 60 * 1000);
  if (reservationDateTime < minTime) {
    return 'Thời gian đặt bàn phải sau hiện tại ít nhất 10 phút';
  }

  return null; // null = hợp lệ
}, [customerName, customerPhone, customerEmail, notes, reservationDate, reservationTime, guests, getReservationDateTime]);
```

### Câu hỏi phỏng vấn thường gặp

- **Validate ở FE hay BE?** → Cả hai. FE để UX tốt (phản hồi nhanh), BE để bảo mật (client có thể bypass FE).
- **Tại sao `Number.isInteger` thay vì `typeof x === 'number'`?** → `typeof 1.5 === 'number'` là `true`, nhưng `Number.isInteger(1.5)` là `false`.
- **Regex `/^(?:\+?84|0)\d{9,10}$/` hoạt động thế nào?** → `^` bắt đầu, `(?:\+?84|0)` bắt đầu bằng `+84`, `84`, hoặc `0`, `\d{9,10}` tiếp theo 9-10 chữ số, `$` kết thúc.

---

## 8. FileReader API – Upload & Preview ảnh

**📁 File:** `src/app/admin/menu/page.tsx` (hàm `handleImageUpload`)

### Giải thích

`FileReader` API cho phép đọc file từ `<input type="file">` mà không cần upload server ngay. Đọc thành Base64 string để preview và lưu trực tiếp vào DB (ảnh nhỏ).

### Code chính

```tsx
const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]; // Lấy file đầu tiên (nếu có)
  if (file) {
    // Giới hạn kích thước 5MB
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Hình ảnh không được lớn hơn 5MB');
      return;
    }

    const reader = new FileReader();

    // Callback khi đọc xong (bất đồng bộ)
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // base64 = "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
      setFormData({ ...formData, image: base64 }); // Lưu vào form
      setImagePreview(base64);                       // Hiển thị preview
    };

    // Đọc file thành Data URL (base64)
    reader.readAsDataURL(file);
  }
};

// JSX sử dụng
<input
  type="file"
  accept="image/*"
  onChange={handleImageUpload}
/>
{imagePreview && (
  <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded" />
)}
```

### Câu hỏi phỏng vấn thường gặp

- **Base64 vs upload file thông thường?** → Base64: đơn giản, phù hợp ảnh nhỏ, tốn ~33% dung lượng hơn. Upload file: dùng FormData, phù hợp ảnh lớn, lưu server/CDN.
- **`readAsDataURL` vs `readAsArrayBuffer`?** → `readAsDataURL` trả về chuỗi base64 dùng được trực tiếp trong `<img src>`. `readAsArrayBuffer` trả về binary data, dùng cho xử lý nâng cao.
- **Tại sao kiểm tra `file.size` trước khi đọc?** → Tránh đọc file quá lớn làm treo browser, và có UX feedback tốt hơn.

---

## 9. CRUD Modal Pattern

**📁 File:** `src/app/admin/menu/page.tsx`, `src/app/admin/zones/page.tsx`

### Giải thích

Pattern phổ biến cho quản lý dữ liệu: một Modal dùng cho cả Create và Edit bằng cách check `modalMode`. Tránh tạo 2 component riêng biệt.

### Code chính

```tsx
type ModalMode = 'create' | 'edit' | null;
const [modalMode, setModalMode] = useState<ModalMode>(null);
const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

// Mở modal tạo mới: reset form
const openCreateModal = () => {
  setFormData({ name: '', price: '', categoryId: '', available: true });
  setSelectedItem(null);
  setModalMode('create');
};

// Mở modal chỉnh sửa: điền dữ liệu hiện tại
const openEditModal = (item: MenuItem) => {
  setSelectedItem(item);
  setFormData({
    name: item.name,
    price: item.price.toString(),
    categoryId: item.categoryId,
    available: item.available,
  });
  setModalMode('edit');
};

const closeModal = () => {
  setModalMode(null);
  setSelectedItem(null);
};

// Hàm submit xử lý cả CREATE và UPDATE
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault(); // Chặn form submit mặc định
  setIsSubmitting(true);
  try {
    if (modalMode === 'create') {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) { fetchMenuItems(); closeModal(); }
    } else if (modalMode === 'edit' && selectedItem) {
      const res = await fetch(`/api/menu/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) { fetchMenuItems(); closeModal(); }
    }
  } catch {
    setFormError('Lỗi mạng. Vui lòng thử lại.');
  } finally {
    setIsSubmitting(false); // Luôn reset loading dù success hay fail
  }
};

// Một modal cho cả Create và Edit
{modalMode && (
  <div className="modal">
    <h2>{modalMode === 'create' ? 'Thêm món mới' : 'Chỉnh sửa món'}</h2>
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Đang lưu...' : modalMode === 'create' ? 'Thêm' : 'Lưu'}
      </button>
    </form>
  </div>
)}
```

### Câu hỏi phỏng vấn thường gặp

- **Tại sao `e.preventDefault()` trong form submit?** → Chặn browser reload trang theo mặc định khi submit form HTML.
- **Tại sao `finally` để reset `isSubmitting`?** → `finally` luôn chạy dù có lỗi hay không, đảm bảo button không bị disabled mãi.
- **Controlled vs uncontrolled component?** → Controlled: value được React quản lý qua state (`value={formData.name}`). Uncontrolled: DOM tự quản lý, dùng `ref` để đọc.

---

## 10. Intl API – Format tiền tệ và ngày giờ

**📁 File:** `src/lib/utils.ts`

### Giải thích

`Intl` là Web API chuẩn để format số, tiền, ngày giờ theo locale (ngôn ngữ/vùng). Dùng `Intl` thay vì tự viết logic format → đúng chuẩn quốc tế, không cần thư viện ngoài.

### Code chính

```tsx
// Format tiền Việt Nam Đồng
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
  // 1500000 → "1.500.000 ₫"
}

// Format ngày giờ tiếng Việt
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  // → "15 thg 1, 2024, 14:30"
}

// Format mã đơn hàng: 1 → "0001", 12345 → "12345"
export function formatOrderNumber(num: number): string {
  if (num < 10000) {
    return num.toString().padStart(4, '0'); // padStart: thêm '0' vào đầu
  }
  return num.toString();
}

// Tạo ID random (dùng crypto module của Node.js)
export function generateId(): string {
  return randomBytes(12).toString('hex'); // 12 bytes → 24 ký tự hex
}
```

### Câu hỏi phỏng vấn thường gặp

- **Tại sao dùng `Intl` thay vì tự viết?** → Xử lý đúng hàng nghìn separator (`.` vs `,` theo quốc gia), timezone, locale một cách tự động.
- **`padStart` là gì?** → `'1'.padStart(4, '0')` → `'0001'`. Điền ký tự vào đầu chuỗi cho đủ độ dài.
- **Sự khác nhau giữa `Intl.NumberFormat` và `toLocaleString`?** → `toLocaleString` là shortcut gọi `Intl.NumberFormat` bên trong, nhưng `Intl.NumberFormat` tái sử dụng được và performant hơn.

---

## 11. JWT tự viết (signJWT / verifyJWT)

**📁 File:** `src/lib/middleware/auth.ts`

### Giải thích

JWT (JSON Web Token) gồm 3 phần: `header.payload.signature`, encode bằng Base64URL, ký bằng HMAC. Dự án tự implement thay vì dùng thư viện `jsonwebtoken` để hiểu rõ cơ chế.

### Code chính

```ts
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
const JWT_EXPIRES_IN = 24 * 60 * 60; // 24 giờ (giây)

function base64url(str: string): string {
  return Buffer.from(str).toString('base64url');
}

/** Tạo JWT token */
export function signJWT(payload: { id: string; email: string; role: string }): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + JWT_EXPIRES_IN };

  // Encode header và payload thành Base64URL
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(fullPayload));

  // Tạo signature: HMAC-SHA256(header.payload, secret)
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  return `${headerB64}.${payloadB64}.${signature}`;
}

/** Verify JWT token, trả về payload hoặc null */
export function verifyJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signature] = parts;

    // Tính lại signature để so sánh
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    // Timing-safe comparison: tránh timing attack
    if (signature.length !== expectedSig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

    // Kiểm tra token hết hạn
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

/** Set cookie httpOnly để lưu token an toàn */
export function createAuthCookie(token: string): string {
  return `pos_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${JWT_EXPIRES_IN}`;
}
```

### Câu hỏi phỏng vấn thường gặp

- **JWT gồm 3 phần là gì?** → `Header` (alg, type) + `Payload` (data, exp) + `Signature` (HMAC của header+payload với secret).
- **Tại sao dùng `timingSafeEqual`?** → Tránh timing attack: so sánh thường (`===`) trả về sớm khi ký tự đầu khác, hacker có thể đo thời gian để đoán secret. `timingSafeEqual` luôn mất cùng thời gian.
- **`httpOnly` cookie là gì?** → Cookie không thể đọc bằng JavaScript (`document.cookie`), chỉ tự động gửi theo request. Bảo vệ khỏi XSS.
- **JWT stateless là gì?** → Server không cần lưu session, mọi thông tin cần thiết đã có trong token. Scale dễ hơn session.

---

## 12. Role-based Authorization

**📁 File:** `src/lib/middleware/auth.ts`

### Giải thích

Phân quyền dựa trên vai trò (RBAC - Role Based Access Control). Định nghĩa hierarchy các role, mỗi endpoint kiểm tra xem user có đủ quyền không.

### Code chính

```ts
// Role hierarchy: số càng lớn = quyền càng cao
export const ROLE_LEVELS: Record<string, number> = {
  owner: 100,
  manager: 50,
  waiter: 35,
  kitchen: 30,
  cashier: 25,
};

// Kiểm tra role dựa trên hierarchy (owner có thể làm tất cả)
export function hasRole(userRole: string, requiredRole: string): boolean {
  return (ROLE_LEVELS[userRole] || 0) >= (ROLE_LEVELS[requiredRole] || 0);
}

// Quyền thay đổi trạng thái đơn hàng
export const ORDER_STATUS_PERMISSIONS: Record<string, string[]> = {
  'pending->confirmed': ['owner', 'manager', 'waiter'],
  'confirmed->preparing': ['owner', 'manager', 'kitchen'],
  'preparing->ready': ['owner', 'manager', 'kitchen'],
  'ready->served': ['owner', 'manager', 'waiter'],
  'served->completed': ['owner', 'manager', 'cashier'],
  'any->cancelled': ['owner', 'manager'],
};

// Hàm authenticate + authorize trong API route
export function authenticateRequest(req: NextRequest): JWTPayload | NextResponse {
  const user = getAuthUser(req); // Đọc token từ cookie hoặc header
  if (!user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
  return user;
}

export function authorizeRoles(user: JWTPayload, allowedRoles: string[]): NextResponse | null {
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  }
  return null;
}

// Dùng trong API route:
export async function DELETE(request: NextRequest) {
  const authUser = authenticateRequest(request);
  if (authUser instanceof NextResponse) return authUser; // 401

  const forbidden = authorizeRoles(authUser, ['owner', 'manager']);
  if (forbidden) return forbidden; // 403

  // ... xử lý logic
}
```

### Câu hỏi phỏng vấn thường gặp

- **401 vs 403?** → `401 Unauthorized`: chưa đăng nhập (không biết bạn là ai). `403 Forbidden`: đã đăng nhập nhưng không đủ quyền.
- **RBAC là gì?** → Role-Based Access Control: gán quyền theo vai trò thay vì từng user riêng lẻ. Dễ quản lý hơn khi nhiều user.
- **Nên kiểm tra quyền ở FE hay BE?** → Bắt buộc ở BE (bảo mật thực sự). FE kiểm tra thêm chỉ để UX tốt (ẩn/hiện button), không thể tin tưởng client.

---

## 13. VNPay Integration – HMAC SHA512

**📁 File:** `src/lib/vnpay.ts`, `src/app/api/payments/vnpay/route.ts`

### Giải thích

Tích hợp cổng thanh toán VNPay. Điểm quan trọng: tạo chữ ký HMAC SHA512 để đảm bảo tính toàn vẹn của dữ liệu. Server tạo URL có chữ ký, redirect user; VNPay verify chữ ký trước khi xử lý.

### Code chính

```ts
// sortObject: VNPay yêu cầu params sắp xếp theo alphabet + URL encode
export function sortObject(obj: Record<string, string | number>): Record<string, string> {
  const sorted: Record<string, string> = {};
  const keys = Object.keys(obj)
    .map(k => encodeURIComponent(k))
    .sort();

  for (const key of keys) {
    const originalKey = decodeURIComponent(key);
    // Encode value, thay %20 thành + (chuẩn VNPay)
    sorted[key] = encodeURIComponent(String(obj[originalKey])).replace(/%20/g, '+');
  }
  return sorted;
}

// Trong API route: tạo URL thanh toán
const vnpParams = {
  vnp_Version: '2.1.0',
  vnp_Command: 'pay',
  vnp_TmnCode: VNP_TMN_CODE,
  vnp_Amount: Math.round(amount * 100), // VNPay nhân 100! (tính theo xu)
  vnp_TxnRef: `${orderNumber}${Date.now().toString().slice(-6)}`, // unique ref
  vnp_ReturnUrl: returnUrl,
  // ... các params khác
};

// Tạo chữ ký HMAC SHA512
const sortedParams = sortObject(vnpParams);
const signData = querystring.stringify(sortedParams, { encode: false });
const hmac = crypto.createHmac('sha512', VNP_HASH_SECRET);
const signature = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
sortedParams['vnp_SecureHash'] = signature;

const paymentUrl = VNP_API_URL + '?' + querystring.stringify(sortedParams, { encode: false });

// Verify chữ ký khi VNPay callback về
export function verifyVNPaySignature(params: Record<string, string>, secureHash: string): boolean {
  const vnpParams = { ...params };
  delete vnpParams['vnp_SecureHash'];      // Xóa chữ ký gốc
  delete vnpParams['vnp_SecureHashType'];  // Xóa loại hash

  const sortedParams = sortObject(vnpParams);
  const signData = querystring.stringify(sortedParams, { encode: false });

  const hmac = crypto.createHmac('sha512', VNP_HASH_SECRET);
  const expectedHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  return secureHash === expectedHash; // So sánh chữ ký
}
```

### Câu hỏi phỏng vấn thường gặp

- **HMAC là gì?** → Hash-based Message Authentication Code: dùng secret key + hash function tạo chữ ký. Chỉ người biết secret mới tạo/verify được.
- **Tại sao VNPay nhân amount * 100?** → VNPay lưu theo đơn vị nhỏ nhất (xu/cent) để tránh floating point. 15000₫ → `1500000`.
- **Tại sao cần sắp xếp params trước khi hash?** → HMAC phụ thuộc vào thứ tự bytes. Nếu thứ tự khác → hash khác → chữ ký không khớp.
- **IPN (Instant Payment Notification) là gì?** → VNPay gọi server-to-server sau khi thanh toán xong (không qua browser), đáng tin hơn Return URL.

---

## 14. API Route với Middleware Pattern (Next.js)

**📁 File:** `src/app/api/orders/route.ts`

### Giải thích

Next.js App Router dùng file `route.ts` để tạo API endpoint. Pattern middleware: mỗi route handler đều authenticate + authorize trước khi xử lý business logic. Service layer tách biệt DB logic.

### Code chính

```ts
// GET /api/orders – Lấy danh sách đơn hàng
export async function GET(request: NextRequest) {
  try {
    // Bước 1: Authenticate (kiểm tra JWT)
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser; // Trả về 401 nếu chưa đăng nhập

    // Bước 2: Parse query params từ URL
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const today = searchParams.get('today') === 'true';

    // Bước 3: Gọi Service layer (tách logic khỏi route handler)
    const orders = await OrderService.getOrders({ status, today });

    // Bước 4: Trả về response JSON
    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Lấy danh sách đơn hàng thất bại' }, { status: 500 });
  }
}

// POST /api/orders – Tạo đơn hàng mới
export async function POST(request: NextRequest) {
  try {
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    // Phân quyền: chỉ waiter, manager, owner được tạo đơn
    const forbidden = authorizeRoles(authUser, ['owner', 'manager', 'waiter', 'cashier']);
    if (forbidden) return forbidden; // Trả về 403

    const body = await request.json();
    const order = await OrderService.createOrder(body, authUser.id);

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tạo đơn hàng thất bại';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

### Câu hỏi phỏng vấn thường gặp

- **Tại sao dùng Service layer thay vì viết DB logic trong route?** → Single Responsibility: route chỉ handle HTTP, service chứa business logic. Dễ test, reuse, maintain.
- **`force-dynamic` trong Next.js là gì?** → Tắt static cache, mỗi request đều render lại (cần thiết cho API lấy dữ liệu realtime).
- **Status code 201 vs 200?** → `200 OK`: thao tác thành công. `201 Created`: tạo resource mới thành công. Dùng đúng status code giúp client xử lý đúng.
- **Tại sao try/catch bọc toàn bộ handler?** → Bắt mọi lỗi không mong đợi, trả về 500 thay vì crash server.

---

## Tổng kết – Bảng quick reference

| Chức năng | File | Pattern/Concept |
|---|---|---|
| Auth state management | `src/context/AuthContext.tsx` | Context + useState + sessionStorage |
| Cart state management | `src/context/CartContext.tsx` | useReducer + Context + Immutability |
| Parallel data fetching | `src/app/(pos)/page.tsx` | useCallback + Promise.all |
| Auto-refresh | `src/app/(pos)/page.tsx` | setInterval + cleanup |
| Filtered/derived state | `src/app/(pos)/page.tsx` | Array.filter + Array.reduce |
| Multi-step form | `src/app/booking/page.tsx` | State machine + Union types |
| Form validation | `src/app/booking/page.tsx` | Regex + useCallback |
| Image upload preview | `src/app/admin/menu/page.tsx` | FileReader API + Base64 |
| CRUD Modal | `src/app/admin/menu/page.tsx` | Modal mode pattern |
| Currency/date format | `src/lib/utils.ts` | Intl.NumberFormat + Intl.DateTimeFormat |
| JWT authentication | `src/lib/middleware/auth.ts` | HMAC SHA256 + httpOnly cookie |
| Role-based auth | `src/lib/middleware/auth.ts` | RBAC + middleware pattern |
| Payment integration | `src/lib/vnpay.ts` | HMAC SHA512 + URL encoding |
| API routes | `src/app/api/orders/route.ts` | Next.js route handlers + Service layer |

---

> 💡 **Tip phỏng vấn**: Với mỗi chức năng, hãy giải thích: (1) Nó làm gì, (2) Tại sao chọn cách này, (3) Trade-offs là gì, (4) Có thể mở rộng/cải thiện thế nào.
