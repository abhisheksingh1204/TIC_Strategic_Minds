import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User.model";

export async function GET() {
  try {
    await connectDB(); 

    const count = await User.countDocuments();

    return NextResponse.json({
      status: "ok",
      mongo: "connected",
      users: count,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}