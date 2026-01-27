import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";

const User = z.object({
  email: z.email(),
  pass: z.string().min(8),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const res = User.safeParse(body);
  if (!res.success) {
    return NextResponse.json(res.error, { status: 400 });
  }
  //validation hogya, We can save this user in db as unverified, ab token creation, send mail to user, verify it
}
