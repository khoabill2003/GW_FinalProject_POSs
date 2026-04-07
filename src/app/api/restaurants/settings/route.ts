import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { authenticateRequest, authorizeRoles } from "@/lib/middleware/auth";

export const dynamic = "force-dynamic";

// GET settings (public - cần cho tax rate v.v.)
export async function GET() {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: "default" },
    });

    const branchesData = await prisma.branch.findMany();

    return NextResponse.json({
      restaurantName: restaurant?.name || "Nhà Hàng",
      taxRate: restaurant?.taxRate ?? 8.0,
      favicon: restaurant?.favicon || "",
      mainBranch: {
        address: restaurant?.address || "",
        phone: restaurant?.phone || "",
        image: restaurant?.logo || "",
      },
      branches: branchesData.map((b) => ({
        id: String(b.id),
        name: String(b.name),
        address: String(b.address || ""),
        image: String(b.image || ""),
        phone: String(b.phone || ""),
      })),
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Lấy cài đặt thất bại" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = authenticateRequest(request);
    if (authUser instanceof NextResponse) return authUser;

    const roleCheck = authorizeRoles(authUser, ['owner']);
    if (roleCheck) return roleCheck;

    const data = await request.json();

    // Build update/create payload, only include favicon if provided
    const payload: Record<string, unknown> = {
      name: data.restaurantName,
      address: data.mainBranch?.address,
      phone: data.mainBranch?.phone,
      logo: data.mainBranch?.image,
      taxRate: data.taxRate ?? 8.0,
    };
    if (data.favicon !== undefined) {
      payload.favicon = data.favicon;
    }

    const restaurant = await prisma.restaurant.upsert({
      where: { id: "default" },
      update: payload,
      create: {
        id: "default",
        ...payload,
      } as never,
    });

    const branches = await prisma.branch.findMany();

    return NextResponse.json(
      {
        restaurantName: restaurant.name,
        taxRate: restaurant.taxRate,
        favicon: restaurant.favicon || "",
        mainBranch: {
          address: restaurant.address || "",
          phone: restaurant.phone || "",
          image: restaurant.logo || "",
        },
        branches: branches.map((b) => ({
          id: b.id,
          name: b.name,
          address: b.address,
          image: b.image,
          phone: b.phone,
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json(
      { error: "Lưu cài đặt thất bại" },
      { status: 500 },
    );
  }
}
