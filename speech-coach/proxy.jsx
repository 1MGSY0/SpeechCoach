// Protect user routes with this middleware. You can add your own logic here to check if the user is authenticated or has the right permissions to access the route. If not, you can redirect them to a sign-in page or show an error message.
import { NextResponse } from 'next/server';
import { stackServerApp } from "./stack/server";

export async function proxy(request) {
  const user = await stackServerApp.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/handler/sign-in', request.url));
  }
  return NextResponse.next();
}
export const config = {
  // You can add your own route protection logic here
  // Make sure not to protect the root URL, as it would prevent users from accessing static Next.js files or Stack's /handler path
  matcher: '/dashboard/:path*',
};