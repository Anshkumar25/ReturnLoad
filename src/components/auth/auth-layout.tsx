import { Logo } from "@/components/nav/logo";
import { Card, CardBody } from "@/components/ui/card";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page flex min-h-[calc(100dvh-4rem)] items-center justify-center py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <Card className="shadow-sm">
          <CardBody className="space-y-5 p-6 sm:p-8">{children}</CardBody>
        </Card>
      </div>
    </div>
  );
}