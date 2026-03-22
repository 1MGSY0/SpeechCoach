import { StackHandler, StackProvider } from "@stackframe/stack";
import { stackServerApp } from "@/stack/server";

export default async function Handler() {
  return (
    <StackProvider app={stackServerApp}>
      <StackHandler fullPage />
    </StackProvider>
  );
}
